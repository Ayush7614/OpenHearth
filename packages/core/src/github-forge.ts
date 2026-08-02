import { runAudit } from "./aggregate.js";
import type { ForgeClient } from "./forge.js";

export const githubForge: ForgeClient = {
  id: "github",
  label: "GitHub",
  supported: true,
  runAudit,
};
