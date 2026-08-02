import { unsupportedForgeError, type ForgeClient } from "./forge.js";

async function notYet(): Promise<never> {
  throw unsupportedForgeError("gitlab");
}

export const gitlabForge: ForgeClient = {
  id: "gitlab",
  label: "GitLab",
  supported: false,
  runAudit: notYet,
};

export const bitbucketForge: ForgeClient = {
  id: "bitbucket",
  label: "Bitbucket",
  supported: false,
  runAudit: async () => {
    throw unsupportedForgeError("bitbucket");
  },
};
