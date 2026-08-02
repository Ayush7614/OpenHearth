export type OpenHearthConfig = {
  users: string[];
  month?: string;
  year?: string;
  from?: string;
  to?: string;
  webhook?: string;
  forge?: string;
  /** owner/repo to pull latest OpenHearth audit artifact from Actions */
  actionsRepo?: string;
};

/** Minimal YAML/JSON config parser (no extra deps, browser-safe). */
export function parseConfigText(text: string, filename = "config"): OpenHearthConfig {
  const trimmed = text.trim();
  if (!trimmed) throw new Error(`${filename} is empty`);

  if (trimmed.startsWith("{")) {
    const data = JSON.parse(trimmed) as Partial<OpenHearthConfig> & { user?: string };
    return normalizeConfig(data, filename);
  }

  const cfg: Record<string, unknown> = {};
  const users: string[] = [];
  let inUsers = false;

  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trimEnd();
    if (!line.trim()) continue;

    const listItem = /^\s*-\s+(.+)$/.exec(line);
    if (inUsers && listItem) {
      users.push(listItem[1].replace(/^["']|["']$/g, "").replace(/^@/, "").trim());
      continue;
    }

    const kv = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim().replace(/^["']|["']$/g, "");
    if (key === "users") {
      inUsers = true;
      if (val.startsWith("[") && val.endsWith("]")) {
        const inner = val.slice(1, -1);
        for (const part of inner.split(",")) {
          const u = part.trim().replace(/^["']|["']$/g, "").replace(/^@/, "");
          if (u) users.push(u);
        }
        inUsers = false;
      }
      continue;
    }
    inUsers = false;
    cfg[key] = val;
  }

  if (users.length) cfg.users = users;
  return normalizeConfig(cfg as Partial<OpenHearthConfig>, filename);
}

function normalizeConfig(
  data: Partial<OpenHearthConfig> & { user?: string },
  filename: string
): OpenHearthConfig {
  const users = [
    ...(Array.isArray(data.users) ? data.users : []),
    ...(data.user ? [data.user] : []),
  ]
    .map((u) => String(u).replace(/^@/, "").trim())
    .filter(Boolean);

  if (users.length === 0) {
    throw new Error(`${filename} must list at least one user under users:`);
  }

  return {
    users,
    month: data.month,
    year: data.year,
    from: data.from,
    to: data.to,
    webhook: data.webhook,
    forge: data.forge,
    actionsRepo: data.actionsRepo,
  };
}

export function exampleConfigYaml(): string {
  return `# openhearth.yml — team radar + digest defaults
users:
  - octocat
  - torvalds
month: 2026-07
# webhook: https://hooks.slack.com/services/...
# actionsRepo: Ayush7614/OpenHearth
`;
}
