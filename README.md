# pi-stats-dashboard

A local, privacy-first `/stats` dashboard for [Pi](https://pi.dev). It reads Pi's persisted JSONL sessions and opens a browser dashboard with lifetime, today, 7-day, and 30-day usage.

![Pi Stats dashboard](https://unpkg.com/pi-stats-dashboard@0.1.2/artifacts/stats.png)

## Install

```bash
pi install npm:pi-stats-dashboard
```

Then run Pi and use `/stats`.

## Included metrics

- Input, output, reasoning, cache read/write, total tokens, recorded cost, requests, and errors
- Daily activity and breakdowns by model, provider, project, agent, and tool
- Local-only behavior counters for user messages: yelling, profanity, anguish, correction, repetition, and blame
- Malformed-record diagnostics

Costs are the values recorded by providers and may be zero or unavailable. They are estimates, not invoices. Pi does not persist reliable historical latency, TTFT, tokens/sec, or subscription-window data, so those are intentionally not fabricated.

The server binds to `127.0.0.1`, uses a random URL token, and returns aggregate data only. Prompt and response text is never retained or returned; behavior analysis happens in memory.

## NixOS / Nix

> Requires Pi to be installed separately.

```bash
nix develop                 # Node 22 development shell
nix build                   # Build the Pi package
pi install "$(nix build --no-link --print-out-paths)"
```

## Development

```bash
pi -e .
npm test
npm run check
npm pack --dry-run
```

This package intentionally uses Node built-ins and no runtime dependencies. The generated tarball is publish-ready; npm publication and repository creation are not automated.
