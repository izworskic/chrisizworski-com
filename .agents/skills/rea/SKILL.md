---
name: rea
description: "REA (Reverse Engineer Anything) on-demand software investigation for this repository. Invoke ONLY when the owner explicitly says to use REA for a named, authorized target. Do not start MCP, install dependencies, run setup, or analyze targets automatically."
---

# REA: explicit-use software investigation

REA is an optional research capability, not the default design workflow, a page template, or a background tool. **Do not invoke REA unless the owner explicitly requests REA for a specific investigation.** An ordinary design review, experience-investment task, Foundry pass, code audit, or competitor comparison does not authorize it.

## Call it

- "Use REA to inspect this authorized local Electron application and explain its event flow."
- "Run REA on the locally available JavaScript bundle at /absolute/path and compare its navigation with our original implementation."
- "Use REA on this authorized binary" requires the supported provider, host, and licensing prerequisites for that file.

This skill only supplies agent instructions. It does **not** install the REA package, configure MCP, or establish that an REA runtime is available.

## Before any REA operation

1. Read the owning repository's AGENTS.md, relevant tests, and `docs/REA_DEVELOPMENT_WORKFLOW.md`. If the requested product is owned by an extracted repository, work there instead of treating a mirror as its source.
2. Confirm the explicit request, exact investigation target, lawful authorization to examine it, and the permitted scope. No credentials, private customer data, protected systems, or access-control bypass.
3. Determine target type and method from the official documentation at https://github.com/morluto/rea. The supported CLI operation for a local JavaScript or Electron application is not a general-purpose webpage URL command.
4. Verify an available REA runtime and prerequisites before calling anything. For the repository's reviewed release, Node.js must satisfy `^22.23.4 || ^24.22.1 || >=26.12.1`. If unavailable, report the limitation instead of claiming a REA analysis.
5. Do not run `npx rea-agents setup`, install globally, register the server, change `.mcp.json`, modify user-level agent configs, or start a persistent process merely because this skill was loaded.

## Explicit, one-off CLI workflow

For an authorized, locally available JavaScript/Electron application directory or ASAR, after checking its actual path:

```bash
npx -y rea-agents@6.9.0 analyze-javascript-application /absolute/path/to/app --json
```

Use the pinned package version documented in `docs/REA_DEVELOPMENT_WORKFLOW.md`; do not silently replace it with latest. For different target types, read the official CLI contracts and environment requirements first. Do not claim support for a command or target that has not been verified.

For investigations that genuinely require REA MCP tools rather than a CLI operation, obtain separate, explicit approval for **session-scoped** client configuration. Never commit a persistent REA registration, automatically attach the tool to routine coding sessions, or assume a user-facing GitHub or ChatGPT connection is a local REA installation. Remove any temporary setup at the end of that authorized session.

## Investigation and delivery

1. Define a narrow behavioral or architecture question and collect reproducible evidence from the permitted target.
2. Separate direct observations from inferences, unknowns, unsupported behavior, and tool or provider errors. Link evidence and retain redacted artifacts only when authorized.
3. Use lessons to design an original implementation. Do not copy a third party's copyrighted code, protected assets, branding, or proprietary UI wholesale.
4. When implementation is expressly requested, follow the owning repository's Experience OS and Experience Investment guidance where relevant, then its accessibility, factual provenance, SEO/Person, advertising and complete CI requirements. REA findings alone are not browser QA or deployment proof.
5. Report the operation and version actually run, target class, findings, limits, changes made (if any), and checks that passed or could not be run.

## Hard boundaries

- **REA stays off by default.** No automatic invocation from Experience OS, Foundry, Penpot, pull requests, code review, scheduled jobs, or builds.
- Do not add an REA package dependency, Vercel function, build hook, GitHub Action, or default MCP server registration.
- Respect third-party licenses, privacy, permissions, and all existing owning-repository requirements.
- REA is not installed or running merely because `SKILL.md` exists.
