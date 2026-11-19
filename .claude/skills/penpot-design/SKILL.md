---
name: penpot-design
description: "On-demand Penpot design capability for chrisizworski.com. Use ONLY when the user explicitly asks to use Penpot to inspect, design, edit, or audit a website experience; do not invoke for normal coding, automatic Foundry reviews, or background tasks."
---

# Penpot Design (explicit invocation only)

This skill routes a requested design task to Penpot's **official MCP server**. It is a repository-specific workflow, not the Penpot AI Kit installed in a client. The official kit is available separately at https://github.com/penpot/penpot-ai-kit.

## Before using Penpot

1. Read the repository `AGENTS.md`, the owning tool's instructions, and `docs/PENPOT_DESIGN_WORKFLOW.md`. If the feature is owned by a different repository, do not treat a deployment mirror as the implementation owner.
2. Apply `design-systems/experience-os-v1/AGENTS.md` and `experience-foundry/README.md` for substantial visitor-facing work. Penpot does not replace those quality gates.
3. Only activate this workflow for an **explicit Penpot request**. Merely working on CSS, a UX improvement, a photo, or a map does not trigger Penpot. No hooks, background jobs, or auto-edits.
4. Verify that the client exposes the actual Penpot MCP tools and that a design file is connected. Start with `high_level_overview`, then a **read-only** `execute_code` inspection (for example, `return penpotUtils.shapeStructure(penpot.currentPage.root, 1);`). If unavailable, explain that the MCP connection or Penpot file authorization is needed. Never invent a connected Penpot file, frame ID, screenshot, or successful edit.

## Design workflow

1. Identify the exact visitor task, current implementation, source-backed constraints, relevant screenshots and live-data unknowns.
2. For a meaningful new interaction, compare two genuinely different concepts. Reuse tokens and components without cloning page composition across unrelated tools. Apply: **Standardize the quality. Never standardize away the imagination.**
3. Inspect the selected Penpot file and page **before writing**. If several sessions are connected, ask the owner to select the intended one. Never guess which file is authoritative.
4. Operate in **Suggest → Review → Apply** mode. Present the planned edits and get approval for meaningful changes to existing frames, geometry, components, tokens, shared libraries or deletions. Prefer a duplicate or new page for major redesigns; do not silently overwrite an existing design.
5. Use only the tools and API supported by the live Penpot MCP. Consult `penpot_api_info` when uncertain. Prefer editable frames, real layout constraints, named layers, existing token libraries and reusable components. Do not substitute an imported SVG for proof of live Penpot editing.
6. After edits, inspect/export the resulting design, compare it to the intended visitor decision, review mobile and desktop layouts, keyboard/touch targets, contrast and visual hierarchy. Record the design URL/session, changes, evidence and limitations. A preview is not an implementation.
7. If the user also requested website implementation, make the source change **in the owning GitHub repo** after design review, retain canonical/Person, ads, legal access, attribution and API behavior, and run browser tests at 360/390/768/1440px plus the repository's full gate. Do not automatically merge or deploy.

## Hard boundaries

- No Penpot token, `userToken` URL, OAuth secret, private document contents or screenshots in repository config, commits or logs.
- The project's `.mcp.json`, `.codex/config.toml` and `.cursor/mcp.json` contain the **public hosted URL only**; user authentication is per-client. A config file does not prove the MCP is authenticated or a design is connected.
- No changes to production solely because a design was made. No generated photos passed off as actual destinations. No unsupported safety, access or weather claims.
- Optional upstream specialists: `penpot-router`, `penpot-build-screen`, `penpot-build-from-code`, `penpot-audit-accessibility` from https://github.com/penpot/penpot-ai-kit **only if actually installed and available**; never claim they have been installed by this repository wrapper.
