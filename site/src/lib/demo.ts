import type { AuditInsights } from "@felix-ayush/openhearth-core";
import {
  createWorkspace,
  findWorkspaceByUsername,
  listWorkspaces,
  saveRun,
  type SavedRun,
} from "./storage";

const DEMO_FLAG = "openhearth_demo_seeded_v1";

function insights(partial: Partial<AuditInsights> & Pick<AuditInsights, "totalContributions" | "uniqueRepos" | "reposHiddenByFeed" | "mergeRate">): AuditInsights {
  return {
    feedTruncationNote:
      partial.feedTruncationNote ??
      "Demo data — GitHub's activity sidebar typically lists ~25 busiest repos.",
    topRepos: partial.topRepos ?? [
      { repo: "demo-org/flagship", count: 40 },
      { repo: "demo-org/docs", count: 18 },
      { repo: "oss/friend-project", count: 12 },
    ],
    likelyHiddenRepos: partial.likelyHiddenRepos ?? [
      { repo: "tiny/side-quest", count: 1 },
      { repo: "old/archive-pr", count: 2 },
    ],
    busiestDay: partial.busiestDay ?? "2026-06-18",
    byDay: partial.byDay ?? [
      { day: "2026-06-02", count: 4 },
      { day: "2026-06-10", count: 9 },
      { day: "2026-06-18", count: 14 },
      { day: "2026-06-22", count: 7 },
    ],
    byKind: partial.byKind ?? { pr: 80, issue: 12, review: 4 },
    reposVisibleOnFeed: Math.min(partial.uniqueRepos, 25),
    totalContributions: partial.totalContributions,
    uniqueRepos: partial.uniqueRepos,
    reposHiddenByFeed: partial.reposHiddenByFeed,
    mergeRate: partial.mergeRate,
  };
}

/** Seed sample workspaces/runs once so charts & board are visible immediately. */
export function ensureDemoData(): { seeded: boolean } {
  try {
    if (localStorage.getItem(DEMO_FLAG) === "1") return { seeded: false };
    if (listWorkspaces().length > 0) {
      localStorage.setItem(DEMO_FLAG, "1");
      return { seeded: false };
    }
  } catch {
    return { seeded: false };
  }

  seedDemoWorkspaces();
  try {
    localStorage.setItem(DEMO_FLAG, "1");
  } catch {
    /* ignore */
  }
  return { seeded: true };
}

/** Always add demo workspaces (safe to click from UI). */
export function loadDemoData(): { seeded: boolean } {
  const before = listWorkspaces().length;
  seedDemoWorkspaces();
  try {
    localStorage.setItem(DEMO_FLAG, "1");
  } catch {
    /* ignore */
  }
  return { seeded: listWorkspaces().length > before };
}

function seedDemoWorkspaces(): void {
  if (!findWorkspaceByUsername("octocat")) {
    const alice = createWorkspace("Demo · Alice", "octocat");
    const aliceMonths: Array<[string, AuditInsights]> = [
      [
        "2026-05",
        insights({
          totalContributions: 120,
          uniqueRepos: 34,
          reposHiddenByFeed: 9,
          mergeRate: 72,
          byKind: { pr: 90, issue: 20, review: 10 },
        }),
      ],
      [
        "2026-06",
        insights({
          totalContributions: 168,
          uniqueRepos: 41,
          reposHiddenByFeed: 16,
          mergeRate: 68,
          byKind: { pr: 130, issue: 25, review: 13 },
          busiestDay: "2026-06-22",
        }),
      ],
      [
        "2026-07",
        insights({
          totalContributions: 210,
          uniqueRepos: 52,
          reposHiddenByFeed: 27,
          mergeRate: 71,
          byKind: { pr: 170, issue: 28, review: 12 },
          busiestDay: "2026-07-27",
        }),
      ],
    ];
    for (const [month, data] of aliceMonths) saveRun(alice.id, month, data, "import");
  }

  if (!findWorkspaceByUsername("torvalds")) {
    const bob = createWorkspace("Demo · Bob", "torvalds");
    const bobMonths: Array<[string, AuditInsights]> = [
      [
        "2026-06",
        insights({
          totalContributions: 45,
          uniqueRepos: 12,
          reposHiddenByFeed: 0,
          mergeRate: 88,
          byKind: { pr: 40, issue: 3, review: 2 },
          topRepos: [{ repo: "torvalds/linux", count: 40 }],
          likelyHiddenRepos: [],
          feedTruncationNote: "Activity feed likely shows all repos for this range.",
        }),
      ],
      [
        "2026-07",
        insights({
          totalContributions: 62,
          uniqueRepos: 18,
          reposHiddenByFeed: 0,
          mergeRate: 90,
          byKind: { pr: 55, issue: 5, review: 2 },
          topRepos: [{ repo: "torvalds/linux", count: 50 }],
          likelyHiddenRepos: [],
          feedTruncationNote: "Activity feed likely shows all repos for this range.",
        }),
      ],
    ];
    for (const [month, data] of bobMonths) saveRun(bob.id, month, data, "import");
  }
}

export function clearDemoFlag(): void {
  try {
    localStorage.removeItem(DEMO_FLAG);
  } catch {
    /* ignore */
  }
}

export type { SavedRun };
