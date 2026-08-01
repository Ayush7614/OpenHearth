import type { AuditInsights, FullAuditResult } from "@felix-ayush/openhearth-core";

const WORKSPACES_KEY = "openhearth_workspaces_v1";
const RUNS_KEY = "openhearth_runs_v1";
const TOKEN_KEY = "openhearth_token";
const ONBOARD_KEY = "openhearth_onboard_v1";

export type Workspace = {
  id: string;
  name: string;
  username: string;
  createdAt: string;
  updatedAt: string;
};

/** Compact snapshot saved per audit — enough to track months without huge localStorage. */
export type SavedRun = {
  id: string;
  workspaceId: string;
  month: string;
  ranAt: string;
  insights: AuditInsights;
  source?: "audit" | "import";
};

/** CLI / UI full-audit JSON shape (insights required). */
export type ImportedAuditJson = {
  username?: string;
  range?: { from?: string; to?: string };
  insights: AuditInsights;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listWorkspaces(): Workspace[] {
  return readJson<Workspace[]>(WORKSPACES_KEY, []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function getWorkspace(id: string): Workspace | undefined {
  return listWorkspaces().find((w) => w.id === id);
}

export function findWorkspaceByUsername(username: string): Workspace | undefined {
  const u = username.replace(/^@/, "").toLowerCase();
  return listWorkspaces().find((w) => w.username.toLowerCase() === u);
}

export function createWorkspace(name: string, username: string): Workspace {
  const now = new Date().toISOString();
  const workspace: Workspace = {
    id: uid(),
    name: name.trim() || `@${username}`,
    username: username.trim().replace(/^@/, ""),
    createdAt: now,
    updatedAt: now,
  };
  const all = listWorkspaces();
  all.push(workspace);
  writeJson(WORKSPACES_KEY, all);
  return workspace;
}

export function updateWorkspace(
  id: string,
  patch: Partial<Pick<Workspace, "name" | "username">>
): Workspace | undefined {
  const all = listWorkspaces();
  const idx = all.findIndex((w) => w.id === id);
  if (idx < 0) return undefined;
  all[idx] = {
    ...all[idx],
    ...patch,
    username: patch.username ? patch.username.replace(/^@/, "") : all[idx].username,
    updatedAt: new Date().toISOString(),
  };
  writeJson(WORKSPACES_KEY, all);
  return all[idx];
}

export function touchWorkspace(id: string): void {
  const ws = getWorkspace(id);
  if (ws) updateWorkspace(id, { name: ws.name, username: ws.username });
}

export function deleteWorkspace(id: string): void {
  writeJson(
    WORKSPACES_KEY,
    listWorkspaces().filter((w) => w.id !== id)
  );
  writeJson(
    RUNS_KEY,
    listRuns().filter((r) => r.workspaceId !== id)
  );
}

export function listRuns(workspaceId?: string): SavedRun[] {
  const all = readJson<SavedRun[]>(RUNS_KEY, []);
  const filtered = workspaceId ? all.filter((r) => r.workspaceId === workspaceId) : all;
  return filtered.sort((a, b) => b.ranAt.localeCompare(a.ranAt));
}

/** Chronological (oldest → newest) for charts. */
export function listRunsChronological(workspaceId: string): SavedRun[] {
  return listRuns(workspaceId).sort((a, b) => a.month.localeCompare(b.month));
}

export function saveRun(
  workspaceId: string,
  month: string,
  insights: AuditInsights,
  source: SavedRun["source"] = "audit"
): SavedRun {
  const run: SavedRun = {
    id: uid(),
    workspaceId,
    month,
    ranAt: new Date().toISOString(),
    insights,
    source,
  };
  const all = listRuns();
  const next = all.filter((r) => !(r.workspaceId === workspaceId && r.month === month));
  next.push(run);
  writeJson(RUNS_KEY, next);
  touchWorkspace(workspaceId);
  return run;
}

export function saveRunFromAudit(workspaceId: string, month: string, full: FullAuditResult): SavedRun {
  return saveRun(workspaceId, month, full.insights, "audit");
}

export function importAuditJson(
  data: ImportedAuditJson,
  opts?: { workspaceId?: string; createIfMissing?: boolean }
): { workspace: Workspace; run: SavedRun } {
  if (!data.insights) {
    throw new Error("JSON is missing insights — use output from `openhearth audit … --json`.");
  }

  const username = (data.username ?? "").replace(/^@/, "");
  if (!username && !opts?.workspaceId) {
    throw new Error("JSON has no username. Open a workspace first, or export a full audit JSON.");
  }

  let workspace: Workspace | undefined;
  if (opts?.workspaceId) {
    workspace = getWorkspace(opts.workspaceId);
  }
  if (!workspace && username) {
    workspace = findWorkspaceByUsername(username);
  }
  if (!workspace && username && opts?.createIfMissing !== false) {
    workspace = createWorkspace(`@${username}`, username);
  }
  if (!workspace) {
    throw new Error("No matching workspace. Create one or import while inside a workspace.");
  }

  const month =
    data.range?.from?.slice(0, 7) ||
    new Date().toISOString().slice(0, 7);

  const run = saveRun(workspace.id, month, data.insights, "import");
  return { workspace, run };
}

export function deleteRun(id: string): void {
  writeJson(
    RUNS_KEY,
    listRuns().filter((r) => r.id !== id)
  );
}

export function compareLastTwoMonths(workspaceId: string): {
  newer: SavedRun;
  older: SavedRun;
  delta: {
    total: number;
    repos: number;
    hidden: number;
    mergeRate: number;
  };
} | null {
  const byMonth = new Map<string, SavedRun>();
  for (const run of listRuns(workspaceId)) {
    if (!byMonth.has(run.month)) byMonth.set(run.month, run);
  }
  const months = [...byMonth.keys()].sort();
  if (months.length < 2) return null;
  const older = byMonth.get(months[months.length - 2])!;
  const newer = byMonth.get(months[months.length - 1])!;
  return {
    newer,
    older,
    delta: {
      total: newer.insights.totalContributions - older.insights.totalContributions,
      repos: newer.insights.uniqueRepos - older.insights.uniqueRepos,
      hidden: newer.insights.reposHiddenByFeed - older.insights.reposHiddenByFeed,
      mergeRate: newer.insights.mergeRate - older.insights.mergeRate,
    },
  };
}

export function getStoredToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredToken(token: string): void {
  try {
    const t = token.trim();
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARD_KEY);
  } catch {
    /* ignore */
  }
}
