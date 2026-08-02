import { checkRateLimit, getAuthToken, setAuthToken, GitHubApiError } from "./github.js";

export type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export type AuthWizardResult = {
  ok: boolean;
  authenticated: boolean;
  message: string;
  searchLimit?: number;
  searchRemaining?: number;
};

/** Public OAuth App client id (optional). Set OPENHEARTH_CLIENT_ID to enable device flow. */
export function oauthClientId(): string {
  if (typeof process !== "undefined" && process.env?.OPENHEARTH_CLIENT_ID) {
    return process.env.OPENHEARTH_CLIENT_ID;
  }
  return "";
}

export function authSetupInstructions(): string {
  return [
    "OpenHearth auth (2.5)",
    "",
    "Option A — fine-grained PAT (recommended for CLI + browser)",
    "  1. https://github.com/settings/tokens?type=beta",
    "  2. Public repos → Contents/Metadata read (add gist if you use --gist share)",
    "  3. export GITHUB_TOKEN=github_pat_…",
    "  4. openhearth doctor",
    "",
    "Option B — OAuth device flow (needs a public OAuth App client id)",
    "  1. Create OAuth App: https://github.com/settings/developers",
    "  2. export OPENHEARTH_CLIENT_ID=Iv1…",
    "  3. openhearth auth login",
    "",
    "Option C — GitHub App (org install)",
    "  See docs/github-app.md — generate installation token externally, then:",
    "  export GITHUB_TOKEN=<installation_token>",
    "",
    "Browser workspaces: paste the same token into the session field (sessionStorage only).",
  ].join("\n");
}

export async function validateAuth(token?: string): Promise<AuthWizardResult> {
  if (token) setAuthToken(token);
  if (!getAuthToken()) {
    return {
      ok: false,
      authenticated: false,
      message: "No token set. export GITHUB_TOKEN=… or run openhearth auth login",
    };
  }
  try {
    const status = await checkRateLimit();
    return {
      ok: status.authenticated && status.search.limit >= 30,
      authenticated: status.authenticated,
      message: status.authenticated
        ? `Auth OK · Search ${status.search.remaining}/${status.search.limit}`
        : "Token not accepted",
      searchLimit: status.search.limit,
      searchRemaining: status.search.remaining,
    };
  } catch (err) {
    return {
      ok: false,
      authenticated: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Start GitHub OAuth device flow (requires OPENHEARTH_CLIENT_ID). */
export async function startDeviceFlow(clientId = oauthClientId()): Promise<DeviceCodeResponse> {
  if (!clientId) {
    throw new GitHubApiError(
      "Set OPENHEARTH_CLIENT_ID to your OAuth App client id to use device login.",
      400
    );
  }
  const body = new URLSearchParams({
    client_id: clientId,
    scope: "public_repo gist read:user",
  });
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    throw new GitHubApiError(`Device code request failed (${res.status})`, res.status);
  }
  return (await res.json()) as DeviceCodeResponse;
}

/** Poll until the user completes device login; returns access_token. */
export async function pollDeviceToken(
  deviceCode: string,
  clientId = oauthClientId(),
  intervalSec = 5,
  maxAttempts = 60
): Promise<string> {
  if (!clientId) throw new GitHubApiError("OPENHEARTH_CLIENT_ID required", 400);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
    const body = new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await res.json()) as {
      access_token?: string;
      error?: string;
      interval?: number;
    };
    if (data.access_token) return data.access_token;
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      intervalSec = (data.interval ?? intervalSec) + 5;
      continue;
    }
    if (data.error === "expired_token") {
      throw new GitHubApiError("Device code expired. Run openhearth auth login again.", 400);
    }
    throw new GitHubApiError(data.error ?? "Device login failed", 400);
  }
  throw new GitHubApiError("Timed out waiting for device login.", 408);
}
