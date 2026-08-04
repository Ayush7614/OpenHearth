// OpenHearth LLM adapter layer — provider-agnostic completions.
//
// The default provider is "stub" so the CLI works with zero config and no
// network access. Set OPENHEARTH_LLM=ollama|openai|anthropic to route
// summaries through a real model.
//
// Design rules (from ROADMAP §A/G):
//  - Default to local/offline when possible (Ollama).
//  - Never send PATs to model providers — only audit insights are sent.
//  - The stub provider never calls a network endpoint; generateAuditSummary
//    uses the built-in template summarizer for provider "stub".

export type LLMProviderId = "stub" | "ollama" | "openai" | "anthropic";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompleteOptions {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface LLMProvider {
  id: LLMProviderId;
  label: string;
  model: string;
  complete(opts: LLMCompleteOptions): Promise<string>;
}

export interface LLMConfig {
  provider: LLMProviderId;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  maxTokens?: number;
}

export class LLMError extends Error {
  readonly provider: LLMProviderId;
  constructor(provider: LLMProviderId, message: string) {
    super(message);
    this.name = "LLMError";
    this.provider = provider;
  }
}

const DEFAULT_MODELS: Record<LLMProviderId, string> = {
  stub: "openhearth-template",
  ollama: "llama3.1",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
};

const KNOWN_PROVIDERS: LLMProviderId[] = ["stub", "ollama", "openai", "anthropic"];

/** Resolve an LLMConfig from environment variables (or a passed-in map). */
export function resolveLLMConfig(env?: Record<string, string | undefined>): LLMConfig {
  const e = env ?? (process.env as Record<string, string | undefined>);
  const raw = (e.OPENHEARTH_LLM ?? "stub").toLowerCase();
  const provider: LLMProviderId = (KNOWN_PROVIDERS as string[]).includes(raw)
    ? (raw as LLMProviderId)
    : "stub";
  return {
    provider,
    model: e.OPENHEARTH_LLM_MODEL,
    baseUrl: e.OLLAMA_BASE_URL ?? e.OPENHEARTH_LLM_BASE_URL,
    apiKey: e.OPENAI_API_KEY ?? e.ANTHROPIC_API_KEY ?? e.OPENHEARTH_LLM_API_KEY,
    maxTokens: e.OPENHEARTH_LLM_MAX_TOKENS ? Number(e.OPENHEARTH_LLM_MAX_TOKENS) : undefined,
  };
}

/** Create an LLM provider client. Config overrides take precedence over env. */
export function createLLMClient(config?: Partial<LLMConfig>): LLMProvider {
  const base = resolveLLMConfig();
  // Use ?? (not spread) so an explicit `undefined` in `config` doesn't clobber
  // the env-resolved default (e.g. CLI passing { provider: undefined }).
  const cfg: LLMConfig = {
    provider: config?.provider ?? base.provider,
    model: config?.model ?? base.model,
    baseUrl: config?.baseUrl ?? base.baseUrl,
    apiKey: config?.apiKey ?? base.apiKey,
    maxTokens: config?.maxTokens ?? base.maxTokens,
  };
  const model = cfg.model ?? DEFAULT_MODELS[cfg.provider];
  switch (cfg.provider) {
    case "ollama":
      return ollamaProvider(cfg, model);
    case "openai":
      return openaiProvider(cfg, model);
    case "anthropic":
      return anthropicProvider(cfg, model);
    case "stub":
    default:
      return stubProvider(model);
  }
}

function stubProvider(model: string): LLMProvider {
  return {
    id: "stub",
    label: "Built-in template (no external model)",
    model,
    async complete(): Promise<string> {
      throw new LLMError(
        "stub",
        "The stub provider does not call a model. Set OPENHEARTH_LLM=ollama|openai|anthropic to use a real model."
      );
    },
  };
}

async function readError(res: Response, provider: LLMProviderId): Promise<LLMError> {
  let body = "";
  try {
    body = await res.text();
  } catch {
    /* ignore */
  }
  return new LLMError(
    provider,
    `HTTP ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 500)}` : ""}`
  );
}

function ollamaProvider(cfg: LLMConfig, model: string): LLMProvider {
  const baseUrl = (cfg.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");
  return {
    id: "ollama",
    label: "Ollama (local)",
    model,
    async complete({ messages, temperature, signal }: LLMCompleteOptions): Promise<string> {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: false,
          options: temperature != null ? { temperature } : undefined,
        }),
      });
      if (!res.ok) throw await readError(res, "ollama");
      const data = (await res.json()) as { message?: { content?: string }; response?: string };
      const text = data.message?.content ?? data.response ?? "";
      if (!text) throw new LLMError("ollama", "Ollama returned an empty response.");
      return text;
    },
  };
}

function openaiProvider(cfg: LLMConfig, model: string): LLMProvider {
  if (!cfg.apiKey) {
    throw new LLMError("openai", "No API key. Set OPENAI_API_KEY (or OPENHEARTH_LLM_API_KEY).");
  }
  const baseUrl = (cfg.baseUrl ?? "https://api.openai.com").replace(/\/$/, "");
  return {
    id: "openai",
    label: "OpenAI",
    model,
    async complete({ messages, maxTokens, temperature, signal }: LLMCompleteOptions): Promise<string> {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (!res.ok) throw await readError(res, "openai");
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text) throw new LLMError("openai", "OpenAI returned an empty response.");
      return text;
    },
  };
}

function anthropicProvider(cfg: LLMConfig, model: string): LLMProvider {
  if (!cfg.apiKey) {
    throw new LLMError("anthropic", "No API key. Set ANTHROPIC_API_KEY (or OPENHEARTH_LLM_API_KEY).");
  }
  const baseUrl = (cfg.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "");
  return {
    id: "anthropic",
    label: "Anthropic",
    model,
    async complete({ messages, maxTokens, temperature, signal }: LLMCompleteOptions): Promise<string> {
      const system = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n\n");
      const convo = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": cfg.apiKey as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          system: system || undefined,
          messages: convo,
          max_tokens: maxTokens ?? 1024,
          temperature,
        }),
      });
      if (!res.ok) throw await readError(res, "anthropic");
      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text =
        data.content
          ?.filter((b) => b.type === "text")
          .map((b) => b.text ?? "")
          .join("") ?? "";
      if (!text) throw new LLMError("anthropic", "Anthropic returned an empty response.");
      return text;
    },
  };
}

