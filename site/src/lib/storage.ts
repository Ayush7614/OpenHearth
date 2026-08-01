import type { AuditInsights, FullAuditResult } from "@felix-ayush/openhearth-core";

const WORKSPACES_KEY = "openhearth_workspaces_v1";
const RUNS_KEY = "openhearth_runs_v1";
const TOKEN_KEY = "openhearth_token";

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

export function updateWorkspace(id: string, patch: Partial<Pick<Workspace, "name" | "username">>): Workspace | undefined {
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

export function saveRunFromAudit(workspaceId: string, month: string, full: FullAuditResult): SavedRun {
  const run: SavedRun = {
    id: uid(),
    workspaceId,
    month,
    ranAt: new Date().toISOString(),
    insights: full.insights,
  };
  const all = listRuns();
  // Replace existing run for same workspace+month
  const next = all.filter((r) => !(r.workspaceId === workspaceId && r.month === month));
  next.push(run);
  writeJson(RUNS_KEY, next);

  const ws = getWorkspace(workspaceId);
  if (ws) updateWorkspace(workspaceId, { name: ws.name, username: ws.username });

  return run;
}

export function deleteRun(id: string): void {
  writeJson(
    RUNS_KEY,
    listRuns().filter((r) => r.id !== id)
  );
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
