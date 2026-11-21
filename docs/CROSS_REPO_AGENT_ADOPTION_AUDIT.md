# Cross-repository agent adoption audit

## Purpose

Independent tool repositories do not automatically load the central site's Experience OS or Experience Investment skills. An audit must distinguish an explicit checked-in entrypoint pointer from a central README claim. Do not copy the framework into every sibling repository or silently modify another repository.

Run a read-only inventory:

    node scripts/audit-agent-adoption.mjs

To check one reviewed owner:

    node scripts/audit-agent-adoption.mjs --repo=izworskic/national-rivers

Opt-in enforcement for a migration sprint:

    node scripts/audit-agent-adoption.mjs --strict

Default output: `artifacts/agent-adoption-audit.json`. Statuses are \`adopted\`, \`partial\`, \`missing\` and \`unknown\`. Denied access, rate limits, and unsupported GitHub content are unknown, not missing or compliant. This audit proves only that pointers are present in checked-in agent entrypoints; it cannot prove that any given ChatGPT, Claude, Copilot or Codex session actually loaded and applied the documents. A complete adoption still requires product-specific evidence in a reviewed PR.

The allowlist originates from the authoritative extracted-repository section of central `AGENTS.md`, plus the independently owned phenology product. Update the list when an extracted owner is added or retired. The weekly GitHub Action writes a report artifact and never modifies siblings. Missing adoption does not block unrelated production releases; strict enforcement is explicit.

## Safe adoption change

1. Read the owning repository's `AGENTS.md`, README, tests and current PRs before editing.
2. Add a short pointer to the authoritative central sources below. Keep the owning repository's existing data, access, SEO, advertising, CI, privacy and canonical rules at higher priority.
3. For substantial visitor experience work, compare genuinely different designs, run actual browser QA and full owning-repo gates.
4. Create a normal PR in that owning repository. Do not push directly to main or merge a red release.
5. Record actual PR evidence, not just the link, before upgrading the status from pointer present to implemented in practice.

Central sources:
- Experience OS: https://github.com/izworskic/chrisizworski-com/tree/main/design-systems/experience-os-v1
- Experience Investment: https://github.com/izworskic/chrisizworski-com/tree/main/.agents/skills/experience-investment
- Cross-repository policy: https://github.com/izworskic/chrisizworski-com/blob/main/design-systems/experience-os-v1/docs/MULTI_REPO_ADOPTION.md

No credentials or protected metrics are collected. No runtime server, framework, default design skin, or deployment dependency is added.
