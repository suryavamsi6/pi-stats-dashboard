# Pi Stats Dashboard Plan

## Context

Build a publishable Pi package that adds a `/stats` command and summarizes usage across the user's persisted Pi sessions. Pi stores sessions as JSONL under `~/.pi/agent/sessions/`; assistant messages and nested tool results already record input/output/cache token counts and cost breakdowns.

The repository is currently empty apart from Pi task metadata, so this will be a new package. The target experience is an oh-my-pi-style local dashboard while keeping the first release deliberately small and dependency-light.

## Approach

Recommended baseline, reflecting the selected browser UI and near-oh-my-pi scope:

- Ship the currently available unscoped npm package `pi-stats-dashboard` as one dependency-free ESM Pi package with the `pi-package` keyword and a `pi.extensions` manifest.
- Register `/stats`; on first use, scan usage-bearing records from `~/.pi/agent/sessions/`, start an in-process HTTP server on port 3847 (falling back to an OS-assigned loopback port if occupied), and attempt to open the browser in every Pi mode. Reuse the server on later invocations, still surface the URL when browser launch fails, and close it on `session_shutdown`.
- Aggregate standard Pi v3 session JSONL plus `subagent-artifacts/*_transcript.jsonl`, whose schema uses `recordType` rather than Pi session `type`. Keep main-agent and named subagent usage distinguishable; use subagent transcript usage as the source of truth rather than aggregate values duplicated in parent tool metadata.
- Count assistant usage, usage attached to compaction/branch-summary entries, and generic nested tool-result usage. Deduplicate exact cloned history created by forks/clones so paid calls are not counted twice while still counting unique abandoned-branch calls.
- Use recorded `usage.cost` values rather than repricing historical requests. Show zero-cost/unknown-cost calls honestly instead of inventing provider charges.
- Provide lifetime/today/7d/30d totals; daily trend; provider, model, project, main/subagent-name, and tool breakdowns; request/error/cache metrics; and malformed/skipped-record diagnostics. Pi does not persist duration, TTFT, or subscription-limit history, so those metrics will be documented as unavailable rather than estimated or tracked only after installation.
- Add local-only user-message behavior aggregates—message/character/word counts plus yelling, profanity, anguish, corrective negation, repetition, and blame—after stripping code fences, URLs, quoted blocks, file mentions, and other structured text that would cause false positives. Never retain or return prompt text.
- Serve one self-contained HTML/CSS/JS dashboard and a single aggregate JSON endpoint with Node built-ins. Use native SVG/CSS for charts and Node's built-in test runner; avoid React, Chart.js, SQLite, transpilation, build tooling, and runtime/dev dependencies.
- Keep all data local; bind only to `127.0.0.1`, require a random per-process URL token, validate `Host`/`Origin`, expose aggregates rather than message content, set no-store/security headers, and reject non-GET requests. Project groups use a basename plus opaque stable ID rather than exposing absolute working-directory paths.

### Accounting and dashboard rules

- A valid standard session starts with a `type: "session"` header. Count distinct header session IDs as sessions; process the full stored tree so abandoned branches remain represented.
- Deduplicate cloned fork history with a stable event key built from entry kind, entry ID, timestamp, and usage signature. Independent entries remain billable even when their token totals happen to match.
- Treat assistant messages, compaction/branch-summary `usage`, generic nested tool-result `usage`, and subagent transcript assistant records as model requests. Track the last known main-session provider/model for compaction summaries; use `unknown` when a source does not record attribution.
- For `subagent` results, prefer per-request transcript records; only use parent `totalChildUsage` as a fallback when no matching transcript exists. Reconcile rather than sum both.
- Sum input, output, reasoning (when present), cache-read, cache-write, and recorded cost components. Distinguish absent cost from an explicitly recorded zero and label dollar totals as recorded estimates, not provider invoices.
- Count each assistant `toolCall`; link results by `toolCallId` for tool errors. For tool token/cost attribution, split the invoking assistant request evenly across that turn's tool calls, matching Oh My Pi's documented approach.
- Analyze behavior only for deduplicated human user messages in standard main sessions; exclude custom messages and subagent instruction prompts. Analysis is in-memory and emits counts only.
- Use local-calendar buckets: today from local midnight, and 7-day/30-day ranges from the corresponding local date boundary. Precompute all four ranges in one scan.
- Dashboard sections: Overview, Models, Providers, Projects, Agents, Tools, and Behavior. Every section shares the range selector; charts have equivalent tables/text and sortable breakdown tables.

## Files to modify

Expected new files:

- `package.json` — npm metadata, Pi package manifest, Node engine, scripts, files allowlist, and gallery metadata.
- `extensions/stats.js` — extension entry point, `/stats` command, server reuse, cross-platform browser launch, and shutdown cleanup.
- `src/aggregate.js` — standard-session and subagent-transcript discovery/parsing, deduplication, and aggregate result construction.
- `src/behavior.js` — pure structured-text stripping and behavior-metric heuristics.
- `src/server.js` — loopback HTTP server, aggregate JSON endpoint, dashboard response, and method/route handling.
- `src/dashboard.html` — self-contained accessible browser UI with inline CSS/JS and native SVG charts.
- `test/aggregate.test.js` — focused accounting tests using temporary synthetic JSONL.
- `test/behavior.test.js` — focused false-positive and signal tests for behavior metrics.
- `test/server.test.js` — focused loopback token, method, route, and response-data tests.
- `README.md` — installation, usage, metrics, unavailable metrics, privacy, and publishing instructions.
- `LICENSE` — MIT license.
- `.gitignore` — generated/package artifacts only.

## Reuse

- Pi's documented session schema and persisted `usage` values: `docs/session-format.md` in `@earendil-works/pi-coding-agent`.
- Pi extension command registration and lifecycle APIs: `docs/extensions.md`.
- Pi package manifest/gallery conventions: `docs/packages.md`.
- Node built-ins (`node:fs`, `node:path`, `node:http`, `node:crypto`, `node:child_process`) instead of runtime dependencies.
- Pi's installed `registerCommand()` and `session_shutdown` patterns from `examples/extensions/commands.ts` and `docs/extensions.md`; the extension need not import Pi packages at runtime.
- Oh My Pi's metric definitions, grouping, lenient line parsing, agent classification, and even-split tool attribution as product references, without copying its Bun/React/Chart.js/SQLite architecture.

## Steps

- [x] Define one aggregate result shape for totals, rolling windows, daily time series, provider/model/project/agent/tool breakdowns, behavior metrics, and diagnostics.
- [x] Implement recursive discovery and line-by-line JSONL aggregation with the accounting rules above, warning counters, and non-retaining prompt analysis.
- [x] Implement the token-protected loopback server, aggregate JSON endpoint, self-contained seven-section dashboard, `/stats` launch/reuse behavior, cross-platform browser opening in every mode, and shutdown cleanup.
- [x] Add built-in Node tests covering assistant/summary/nested usage, fork duplicates, subagent reconciliation, malformed lines, zero/unknown cost, project/model/tool grouping, behavior false positives/signals, and server boundaries.
- [x] Add `pi-stats-dashboard` metadata, README, install instructions, privacy/limitations notes, MIT license, and the `pi-package` gallery keyword; omit optional image/video metadata until a public asset URL exists.
- [x] Verify local install, dashboard behavior, fixture totals, behavior counts, server isolation, package contents, and publish-ready tarball. External repository creation and npm publication are explicitly out of scope.

## Verification

- Run `node --test` against synthetic standard-session, fork, subagent-transcript, behavior, and server fixtures with independently known results.
- Run `node --check` for every shipped JavaScript file on Node 22.19+, matching the installed Pi engine floor.
- Load locally with `pi -e .`, invoke `/stats`, and verify one browser/server starts in each practical mode, repeat calls reuse it, browser-launch failures still report the URL to stderr/UI, and Pi shutdown/reload releases the port.
- Compare lifetime, local-calendar ranges, daily series, and grouped totals against independently calculated fixtures; verify cloned records count once and subagent usage is not doubled.
- Confirm malformed/truncated JSONL and unknown record variants do not crash the dashboard and produce warning counts.
- Confirm behavior fixtures strip code/URLs/quotes, exclude child-agent prompts, and never expose source prompts in aggregate/API output.
- Confirm the server listens only on loopback, requires its random token, validates host/origin, rejects unsupported methods/routes, and returns no prompt, response, tool-result, absolute cwd, or credential content.
- Exercise all seven dashboard sections at narrow/mobile widths and keyboard-only; verify visible focus, chart/table fallback text, reduced motion, and light/dark themes.
- Run `npm pack --dry-run`, inspect that only intended runtime/docs files are included, install the generated tarball through Pi, and test `/stats` from a clean project directory.
