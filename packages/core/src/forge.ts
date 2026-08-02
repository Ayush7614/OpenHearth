import type { AuditKind, DateRange } from "./queries.js";
import type { AuditResult } from "./aggregate.js";

export type ForgeId = "github" | "gitlab" | "bitbucket";

export type ForgeClient = {
  id: ForgeId;
  label: string;
  supported: boolean;
  /** Search-style contribution fetch for a user. */
  runAudit: (
    username: string,
    kind: AuditKind,
    range: DateRange,
    onProgress?: (msg: string) => void
  ) => Promise<AuditResult>;
};

export function unsupportedForgeError(id: ForgeId): Error {
  return new Error(
    `Forge "${id}" is not implemented yet. OpenHearth v2.4 ships a multi-forge adapter; only GitHub runs today. See docs/architecture-multi-forge.md.`
  );
}
