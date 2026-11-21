# Claude project guidance for chrisizworski.com

First read the repository's `AGENTS.md`; it contains authoritative release, search, ads, extracted-tool repository and safety instructions.

**Automatic visitor-experience research:** For every new tool, substantial UX redesign or significant new interactive mode, read `design-systems/experience-os-v1/AGENTS.md`, `README.md` and the related evidence, pattern, technology and QA docs before designing. Do not depend on a user invoking `EXPERIENCE_OS_V1` by name. Use the research brief and release review for substantial changes; preserve the existing site architecture when sufficient. For tiny repairs, apply relevant guardrails without an unnecessary research project. This pointer does not load the package in sibling repositories; follow their own instructions and adopt as separately reviewed.

**Penpot, only when asked:** For an explicit Penpot task, activate `.claude/skills/penpot-design/SKILL.md` and read `docs/PENPOT_DESIGN_WORKFLOW.md`. The `.mcp.json` endpoint is not proof of a signed-in MCP session; confirm the design file connection before editing. Do not invoke Penpot for routine UI or Foundry work.

**Experience Investment skill:** For new substantial tool proposals, existing-tool design reviews, or implementation of a major redesign, use .claude/skills/experience-investment/SKILL.md and its .agents/skills/experience-investment/references/ instructions. Diagnose the visitor's decision and compare two genuinely different purpose-built designs before implementation. Preserve Snow Totals Visual V1 as a pilot, not a default page skin. Proposal/review-only requests do not mutate source; implementation requests include code and real browser proof. Existing Experience OS, Foundry and owning-repo gates remain in charge. Penpot is still explicit-use only.

**REA opt-in only:** Use REA only when explicitly requested for a specific investigation. Do not install, register, start, or launch it by default. This repository has no REA MCP registration; consult `docs/REA_DEVELOPMENT_WORKFLOW.md` for the pinned one-off approach. REA never replaces Experience Investment, browser verification or the repository release gate.
