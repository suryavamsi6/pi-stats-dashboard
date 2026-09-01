import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aggregate } from "../src/aggregate.js";

const u = (n, c = 1) => ({ input: n, output: n, reasoning: 0, cacheRead: 0, cacheWrite: 0, totalTokens: n * 2, cost: { total: c } });

test("aggregates sessions, forks, transcripts, tools and warnings", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-stats-"));
  await mkdir(join(root, "project"), { recursive: true });
  const a = { type: "message", id: "a1", timestamp: new Date().toISOString(), message: { role: "assistant", provider: "p", model: "m", usage: u(10), stopReason: "stop", content: [{ type: "toolCall", id: "t", name: "bash", arguments: {} }] } };
  const header = JSON.stringify({ type: "session", version: 3, id: "s" });
  await writeFile(join(root, "project", "a.jsonl"), [header, JSON.stringify({ type: "message", id: "u", timestamp: new Date().toISOString(), message: { role: "user", content: [{ type: "text", text: "NOOO!!! you forgot" }] } }), JSON.stringify(a), "bad json", JSON.stringify({ type: "compaction", id: "c", timestamp: new Date().toISOString(), usage: u(2) })].join("\n"));
  await writeFile(join(root, "project", "fork.jsonl"), [header, JSON.stringify(a)].join("\n"));
  await mkdir(join(root, "project", "subagent-artifacts"));
  await writeFile(join(root, "project", "subagent-artifacts", "x_transcript.jsonl"), JSON.stringify({ recordType: "message", role: "assistant", runId: "r", timestamp: Date.now(), provider: "p", model: "m2", usage: u(3) }));
  const out = await aggregate(root);
  assert.equal(out.totals.all.requests, 3);
  assert.equal(out.totals.all.input, 15);
  assert.equal(out.diagnostics.invalidLines, 1);
  assert.equal(out.behavior.messages, 1);
  assert.ok(out.behavior.anguish > 0);
  assert.equal(out.by.tool.bash.requests, 1);
});
