# REA on-demand development research

REA (Reverse Engineer Anything) is an optional investigation tool for coding agents. **Do not launch, install, connect, or use REA unless the owner explicitly asks to use REA for a particular task.** Continue normal research and development without it.

Official source: https://github.com/morluto/rea

Reviewed release: `rea-agents@6.9.0`, published November 12, 2026.

## Run only for a requested investigation

There is deliberately **no repository-level `.mcp.json` registration**, no persistent agent connection, and no `rea-agents` production or development dependency. Merely opening this repository or launching Claude Code, Codex, or another agent must not start REA.

When asked to "use REA" or "run REA", first define the exact permitted investigation and confirm the machine's Node.js meets the selected release's engine requirement: `^22.23.4 || ^24.22.1 || >=26.12.1`.

Run REA's CLI as a one-off, pinned command from the development machine, without installing a persistent MCP server:

```bash
npx -y rea-agents@6.9.0 analyze-javascript-application /absolute/path/to/app --json
```

This is an upstream-supported example for a locally available JavaScript application directory or ASAR. Replace the path with the actual authorized target. Other tasks require the corresponding [documented CLI command](https://github.com/morluto/rea/blob/main/docs/getting-started/cli.md). Do not assume that a CLI command supports an arbitrary URL or browser inspection.

For a task that specifically needs REA's MCP tools instead of the CLI, request an explicit, session-scoped registration or run a reviewed setup only for the named client. Do not commit a persistent registration to this repo, and do not silently change user-level agent configuration. After that investigation, stop the process and remove any temporary registration. Consult the upstream [client configuration guide](https://github.com/morluto/rea/blob/main/docs/getting-started/client-configuration.md) for the client's actual setup and removal instructions.

## Evidence and implementation standards

1. Work only on authorized targets; respect licenses, access controls, privacy and credentials. Never bypass protection mechanisms.
2. State what was directly observed, what remains inferred, and the limitations of the analysis.
3. Propose original implementations. Do not copy proprietary source, presentation, imagery or branding from another product.
4. Develop changes only in the authoritative owning repository, with its AGENTS.md instructions, Experience OS requirements, accessibility, search integrity, ads, and source provenance safeguards.
5. Use real browser tests for mobile and interactive acceptance. Run the owning repository's full CI gate. REA evidence is not proof of behavior, deployment or visitor improvement.

Example invocation for the coding agent:

> Use REA for this one investigation: inspect the locally available JavaScript application at [authorized path], explain its observed event flow and module boundaries, and compare two original implementations for our tool. Use the pinned one-off CLI. Do not install or register REA persistently.

## Non-negotiable boundaries

- **Opt-in only:** no auto-start, auto-setup, auto-invocation, background service, agent registration, recurring job or default design workflow.
- No REA commands in `package.json`, `verify:all`, the Vercel build, API routes, cron jobs or production.
- Never send sensitive or private inputs to an analysis service without authorization; agent outputs may go to the configured model provider.
- If REA cannot run, explain why. Do not pretend it was used.
- Extracted specialist repositories continue to own their own source and instructions.
