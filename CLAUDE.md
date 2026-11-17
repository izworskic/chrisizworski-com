# Claude project guidance for chrisizworski.com

First read the repository's `AGENTS.md`; it contains authoritative release, search, ads, extracted-tool repository and safety instructions.

**Automatic visitor-experience research:** For every new tool, substantial UX redesign or significant new interactive mode, read `design-systems/experience-os-v1/AGENTS.md`, `README.md` and the related evidence, pattern, technology and QA docs before designing. Do not depend on a user invoking `EXPERIENCE_OS_V1` by name. Use the research brief and release review for substantial changes; preserve the existing site architecture when sufficient. For tiny repairs, apply relevant guardrails without an unnecessary research project. This pointer does not load the package in sibling repositories; follow their own instructions and adopt as separately reviewed.

**On-demand REA research:** Use REA only when explicitly requested for a specific investigation. Do not install, configure, register, or launch it by default. This repo deliberately has no REA project MCP registration. When asked to use REA, read `docs/REA_DEVELOPMENT_WORKFLOW.md` and run its pinned, one-off CLI where appropriate. REA does not replace Experience OS, browser testing, full repository verification, or authoritative owning-repository work.
