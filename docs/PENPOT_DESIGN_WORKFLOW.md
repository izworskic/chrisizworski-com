# On-demand Penpot design in the website repository

Status: Repository configuration only. **No Penpot account has been authorized and no editable Penpot design has been opened or modified by this change.**

## When this is used

Only when the owner explicitly requests Penpot, for example:

- "Use Penpot to redesign the Rocket Launch Live viewing planner."
- "Open the waterfall map screen in Penpot and compare two mobile layouts."
- "Use Penpot to review the Snow Totals tool for accessibility."

Ordinary bug fixes, content improvements, routine Experience OS or Foundry work and REA requests do not invoke Penpot automatically. No background process or scheduled job is created.

## Repository entry points

| Client | Repository file | What it does |
| --- | --- | --- |
| Claude Code | `.mcp.json` | Declares Penpot's official hosted HTTP MCP endpoint; authenticated per developer session |
| Claude Code skill | `.claude/skills/penpot-design/SKILL.md` | Native explicit-use repository skill |
| Codex | `.codex/config.toml` | Declares the same remote MCP endpoint when the repository is trusted |
| Codex skill | `.agents/skills/penpot-design/SKILL.md` | Native explicit-use repository skill |
| Cursor | `.cursor/mcp.json` | Makes the remote Penpot MCP endpoint available; OAuth support depends on client build |

All three point to the official hosted endpoint: `https://design.penpot.app/mcp/stream`. This is Penpot's remote MCP, **not** a local server or a website dependency. The skill instructions are a site-specific wrapper and **do not install or vendor** the entire upstream [Penpot AI Kit](https://github.com/penpot/penpot-ai-kit).

## One-time human authorization

1. Open this repository in the MCP-capable coding client you intend to use. The project settings or skills may require restarting that client.
2. For **Claude Code**, run `/mcp`, choose `penpot` and authenticate with Penpot. For **Codex**, trust the repository and run `codex mcp login penpot`, then verify with `codex mcp list`. For **Cursor**, enable the Penpot server in Cursor's MCP settings and complete its supported sign-in flow; if your Cursor build does not support Penpot OAuth, follow Penpot's official per-client setup. Never put a `userToken` URL into the tracked repository.
3. In Penpot, open the intended design file. Choose **MCP → Connect** in the toolbar. Authenticating the account does **not** automatically connect a design file. Keep that tab awake for the duration of the design session.
4. Invoke the skill explicitly by name, or ask the agent to use Penpot for the specified task. The first proof must be the real MCP `high_level_overview` followed by a read-only `execute_code` shape inspection. If those tools cannot access the open design, stop and report the connection limitation rather than generating fictitious results.

If more than one Penpot design session is connected, select the right file/session before editing. Do not send credentials or private design contents into PR descriptions or logs.

## Execution contract with Experience OS and Foundry

1. **Owner and evidence:** Locate the actual source repository, production URL, baseline, existing design tokens and current visitor task. Read `AGENTS.md` and the owning tool instructions. Respect extracted-tool ownership and deployment mirrors.
2. **Research:** For substantial redesigns, consult `design-systems/experience-os-v1/AGENTS.md`, `docs/QA_SCORECARD.md` and `experience-foundry/docs/IMPROVEMENT_CYCLE.md`. Compare at least two materially different layouts; show an explicit distinction from similar existing tools.
3. **Penpot:** Inspect the connected design file, show a plan and apply meaningful design edits only after review. Use editable frames and actual components/tokens rather than a screenshot-only imitation. Read the MCP's own reference via `high_level_overview` and `penpot_api_info`; do not invent API calls.
4. **Review:** Check smartphone and desktop compositions, the first actionable answer, maps, photographs/credits when appropriate, readable ranger-style interpretive copy for place guides, semantics and WCAG. Export/inspect actual resulting designs and cite the selected file/page. No claim of a live connection without read-only proof.
5. **Implementation (separate):** Only if requested, implement reviewed changes in the owning codebase. Penpot does not become source of truth for routes or source data. Preserve AdSense, Person schema, canonicals, input and access truth, map attributions, no-Redis policy and client-side fallbacks.
6. **Gates:** Run existing Node contracts and production build tests; browser check 360/390/768/1440px, A→B→A control reversibility, keyboard, slow/offline sources, reduced motion and actual source-linked public map routes. Require full repository CI, a PR, and owner merge instructions.

The skill is **on demand**. The MCP endpoint is merely registered as available to the client, not used automatically. Authentication and user authorization remain outside version control.

## Optional upstream Penpot AI Kit

Penpot's [official AI Kit](https://github.com/penpot/penpot-ai-kit) includes a router and specialist skills such as `penpot-build-screen`, `penpot-build-from-code` and accessibility/token audits. This repository's single wrapper can collaborate with those skills **if the user's coding client has separately installed them**. Do not claim the upstream kit is installed solely because this wrapper exists; if the owner wants the full kit, follow its [installation guide](https://github.com/penpot/penpot-ai-kit/blob/main/INSTALL.md) in the actual client environment, with the user in control of OAuth and changes.

## Verification and boundaries

Run `node --test tests/penpot-design-integration.test.js`, then `npm run verify:all`. The source-only checks prove file placement, no-key configuration and operating rules; they cannot prove OAuth, Penpot MCP tools, design modifications, browser screenshots or live deployment.

Official reference: [Penpot MCP setup](https://help.penpot.dev/mcp/).
