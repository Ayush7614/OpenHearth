import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createAgentTranscript, runAgentTool } from "../src/agent/index.js";

describe("2.7 agent runtime", () => {
  it("creates an auditable transcript", () => {
    const t = createAgentTranscript({ tool: "run_audit", username: "demo" });
    assert.ok(t.id.startsWith("agent-"));
    assert.ok(t.startedAt);
    assert.equal(t.finishedAt, "");
  });

  it("enforces approval gates for write tools", async () => {
    const t = createAgentTranscript({});
    const result = await runAgentTool("publish_gist_report", { path: "" }, { approvalRequired: true }, t);
    assert.equal(result.ok, false);
    assert.equal(result.approved, false);
    assert.match(result.error ?? "", /Approval required/);
  });

  it("dry-runs without side effects", async () => {
    const t = createAgentTranscript({});
    const result = await runAgentTool("write_digest", { path: "" }, { dryRun: true }, t);
    assert.equal(result.ok, true);
    assert.equal(result.output?.dryRun, true);
  });

  it("enforces token budget", async () => {
    const t = createAgentTranscript({});
    t.steps.push({ tool: "x", ok: true, at: new Date().toISOString() });
    const result = await runAgentTool("run_audit", { username: "demo" }, { tokenBudget: 1 }, t);
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /budget exhausted/i);
  });
});
