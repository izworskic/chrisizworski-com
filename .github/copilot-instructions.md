# Repository-level coding instructions

Read the repository root `AGENTS.md` before any change. Preserve authoritative extracted-tool repositories, SEO/canonical/Person identity, existing ad configuration, source accuracy, no-Redis policy and all owning-repo test gates.

**Default EXPERIENCE_OS_V1 governance:** For any new visitor-facing tool, substantial interface redesign or new meaningful interaction, consult `design-systems/experience-os-v1/AGENTS.md` and its linked research, pattern, technology, accessibility and QA documentation **without requiring the owner to invoke a template name**. Write a brief for substantial work, test rendered mobile/desktop experiences, and capture a reusable lesson. Small corrections/bug fixes need only relevant guardrails. This package guides experience research; it does not require React, Rust, 3D or a shared page layout. Never claim CI or browser verification not actually performed.

**Penpot is opt-in:** When the user specifically asks for Penpot, read `.agents/skills/penpot-design/SKILL.md` and `docs/PENPOT_DESIGN_WORKFLOW.md`. Do not equate repository MCP configuration with a live authenticated design session. Leave the default Experience OS and Foundry process unchanged for other work.

**Experience Investment:** For substantial new visitor tools, major UI reviews and requested redesigns, consult .agents/skills/experience-investment/SKILL.md and its reference guides. Choose a visitor-task-specific composition and meaningfully different interaction, rather than applying the Michigan Snow Totals style to every page. For proposals/reviews, do not edit code; when implementation is requested, follow research with actual source changes and browser/CI proof. Existing Experience OS, Foundry, owner, ads, SEO and Penpot opt-in rules remain authoritative.

**REA is explicit-use only:** When the owner directly requests REA for a named, authorized investigation, consult `.agents/skills/rea/SKILL.md` and `docs/REA_DEVELOPMENT_WORKFLOW.md`. Do not auto-run REA, register MCP, add dependencies, or invoke it for routine Experience Investment, Foundry or Penpot work.


**Playwright browser QA:** For Playwright requests and significant interactive, map or responsive UI work, read `.github/skills/playwright-browser-qa/SKILL.md` and `docs/PLAYWRIGHT_BROWSER_QA_WORKFLOW.md`. Use an executable browser for screenshots, state changes and console/network evidence, then targeted regression tests and full CI. No browser runtime or MCP server is installed by the skill alone.

**Agent Browser investigation (opt-in):** For requested AI-led browser exploration, read `.github/skills/agent-browser-qa/SKILL.md` and `docs/AGENT_BROWSER_WORKFLOW.md`. The optional local smoke runner uses an installed Agent Browser CLI; do not assume browser execution is available or add production dependencies/MCP. Playwright remains the regression gate. Preserve existing source, SEO, Auto ads, maps and CI rules.
