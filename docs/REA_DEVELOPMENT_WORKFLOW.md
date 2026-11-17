# REA development workflow

REA (Reverse Engineer Anything) is an optional, local MCP research tool for coding agents working on this repository. It helps investigate existing software and interaction patterns using evidence. It does not run on the public site, in Vercel, or in CI.

Official source: https://github.com/morluto/rea

Pinned MCP package: `rea-agents@6.9.0` (official release dated November 12, 2026).

## Connect your agents

REA requires Node.js compatible with the pinned package, currently Node.js `^22.23.4 || ^24.22.1 || >=26.12.1`, plus npm.

**Claude Code:** The repository's `.mcp.json` defines the `rea` MCP server for this project using `npx -y rea-agents@6.9.0 mcp`. Review that file and the package provenance before approving the project MCP server in Claude Code. Restart or reconnect Claude Code after approving the server. No global registration is needed for this project. Do not separately register another `rea` server for the same Claude Code session.

**Codex and other clients:** REA's project-level Claude Code registration is not a Codex registration. Run the official, reviewed setup on your development machine, outside the repository:

```bash
npx rea-agents@6.9.0 setup --client codex --dry-run
npx rea-agents@6.9.0 setup --client codex
```

Inspect the proposed configuration and approve only the change you want. Restart Codex after setup. Other supported clients can be selected through the same setup interface. If REA is already registered in a client, inspect the current entry before installing another. All these changes are local to your development environment, not committed repository dependencies.

For diagnostic help, consult the upstream [installation and readiness guide](https://github.com/morluto/rea/blob/main/docs/getting-started/installation.md) and [client configuration guide](https://github.com/morluto/rea/blob/main/docs/getting-started/client-configuration.md). Pin a reviewed official release rather than automatically following `latest` in a persistent server configuration.

## Use it when the investigation is worth the complexity

REA fits a research step, not the default implementation path. Good examples for this site are investigating a legally accessible map interaction, understanding a browser-side visualization's module boundaries, or examining a malfunctioning locally available JavaScript bundle.

1. Choose a permitted target and a narrow technical question. Respect license terms, site rules, credentials, privacy, and access controls. Do not attempt to bypass protection mechanisms.
2. Ask the coding agent for an evidence record: what it directly observed, what it inferred, source locations when available, uncertainty, and constraints.
3. Compare at least two original implementations suitable for our users and our codebase. Do not copy another product's proprietary source, branding, content, assets, or distinctive presentation.
4. Implement and verify in the **authoritative owning repository**. Preserve AGENTS.md, Experience OS, field guide quality, accessibility, mobile behavior, ads, canonical URLs, and source-integrity contracts.
5. Use existing browser interaction tests for interaction and mobile acceptance. REA analysis is not a substitute for browser testing or for verified factual content. Run the owning repository's full CI gate before merge.

Example assignment:

> Investigate the public interaction pattern for [specific map or visualization] where inspection is permitted. Explain the observed event flow, rendering model, and mobile interaction evidence. Distinguish observations from guesses. Propose two distinct approaches for our own visitor-facing tool, then build and test the stronger original approach without reusing unlicensed material.

## Operational boundaries

- No `rea-agents` dependency in `package.json`, package lock, build scripts, API routes, cron jobs, or Vercel deployment.
- No REA CLI call in `verify:all`, source generation, or production.
- The local MCP process can read files and launch analysis helpers. Only enable it in a trusted workspace, review installation prompts, and avoid handing it secrets or private data.
- The agent may transmit tool output to its model provider. Treat target data accordingly.
- If REA is unavailable, development continues without it. Never claim analysis was run or verified unless it actually ran.
- This integration applies to this repository's developer environment. Extracted specialist repositories retain their own configuration and ownership boundaries.
