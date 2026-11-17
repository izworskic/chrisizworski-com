# Claude project guidance for chrisizworski.com

First read the repository's `AGENTS.md`; it contains authoritative release, search, ads, extracted-tool repository and safety instructions.

**Automatic visitor-experience research:** For every new tool, substantial UX redesign or significant new interactive mode, read `design-systems/experience-os-v1/AGENTS.md`, `README.md` and the related evidence, pattern, technology and QA docs before designing. Do not depend on a user invoking `EXPERIENCE_OS_V1` by name. Use the research brief and release review for substantial changes; preserve the existing site architecture when sufficient. For tiny repairs, apply relevant guardrails without an unnecessary research project. This pointer does not load the package in sibling repositories; follow their own instructions and adopt as separately reviewed.

**Optional REA research MCP:** This repository has a project-level `.mcp.json` with a pinned `rea` MCP server. Review and approve it locally before use. For software interaction or visualization research, read `docs/REA_DEVELOPMENT_WORKFLOW.md`. REA does not replace Experience OS, browser testing, repository verification, or work in an extracted tool's authoritative repository. Never claim it is connected without checking.
