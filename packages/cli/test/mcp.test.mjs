import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { callMcpTool } from "../src/mcp/server.js";

describe("2.7 MCP server", () => {
  it("returns audit insights via tool call", async () => {
    const result = await callMcpTool({ name: "audit", arguments: { username: "demo", month: "2026-07" } }, {});
    assert.equal(result.ok, true);
    assert.ok(result.output?.insights);
  });

  it("returns prompt helpers", async () => {
    const hiring = await callMcpTool({ name: "prompt_hiring", arguments: { username: "demo" } }, {});
    assert.equal(hiring.ok, true);
    assert.match(hiring.output?.prompt ?? "", /hiring/i);

    const digest = await callMcpTool({ name: "prompt_digest", arguments: { username: "demo" } }, {});
    assert.equal(digest.ok, true);
    assert.match(digest.output?.prompt ?? "", /digest/i);
  });
});
