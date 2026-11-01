# Experience OS: canonical name and release selection

**Package ID:** `EXPERIENCE_OS_V1`. **Owning repository:** `izworskic/chrisizworski-com`. **Canonical path:** `design-systems/experience-os-v1/`. **Source of truth:** `manifest.json` at that path on the repository's default `main` branch. As reviewed November 1, 2026, that manifest reports **1.2.1**. Check `main` on each new task; the number in this note can become outdated.

## One framework; multiple historical names

| User phrase or code identifier | Required resolution |
| --- | --- |
| "Experience OS" / "use the experience OS" | Active released package at the canonical path on `main` |
| "Experience OS v1.2" / "use v1.2" | Highest **released 1.2.x** version in the canonical `main` manifest, currently 1.2.1 |
| "EXPERIENCE_OS_V1" / folder `experience-os-v1` | Stable package ID/path, **not** a downgrade instruction or a separate design system |
| "v1.2.1 exactly" | The exact release if still on `main`; otherwise use an immutable reviewed commit or version tag that actually exists |
| "v1.2.0 exactly" or another historical version | Resolve to an existing immutable commit/tag and explicitly name it; do not pretend a stale feature branch is a released version |
| "v1.3" or "v2" | Do not infer a new release from a branch. Use the requested version only if published; otherwise explain what's released |

## Agent workflow (required for new substantial tool work)

1. **Read the tool's owning repository's `AGENTS.md` first.** It may be different from this site repository. Do not transplant implementation or move canonical ownership across repos.
2. Find this canonical `main` manifest and read `AGENTS.md`, `README.md`, `docs/CONNECTED_EXPERIENCE_CONTRACT.md`, `docs/V1_2_OPERATING_KIT.md`, `docs/PILOT_LESSONS_V1_2.md`, `docs/GOOSEBERRY_PILOT_20261031.md`, and relevant lifecycle, patterns, inspiration, accessibility and QA documents. Use version-specific files only if present in the resolved release.
3. Before editing, inspect open pull requests, recently merged changes, current owner/source version and deployment for the **same tool**. Adopt or extend in-flight work; do not create a parallel engine, duplicated route, forked "1.2" framework, or conflicting PR.
4. For substantive work, use the experience brief, state matrix and evidence-record checker, then run the owning repository's full CI, real browser/media/map verification and honest production/live smoke. A passing checker or Vercel READY is not evidence of user conversion.
5. If a request specifies an exact historic behavior, preserve reproducibility via a verified commit/tag; otherwise follow the latest released compatible `1.2.x` from `main`.
6. For extracted tools, add an adoption pointer in the **owning repository** as a reviewed change where absent. Instructions in this central site are **not automatically injected** into other repositories, other conversations or unsupported bot harnesses.

## Versions and branches

- Merged [PR #1335](https://github.com/izworskic/chrisizworski-com/pull/1335) established the initial 1.2.0 connected-state and media QA standards.
- Merged [PR #1344](https://github.com/izworskic/chrisizworski-com/pull/1344) advanced the **same package** to 1.2.1, adding the operational kit and Gooseberry lessons.
- Feature branches named `docs/experience-os-v1-2-pilot-lessons-20261031` and `feat/experience-os-v12-operational-kit-20261031` remain historic implementation branches. Their existence is not evidence of competing active releases.
- The folder name `experience-os-v1` and ID `EXPERIENCE_OS_V1` intentionally remain stable for compatibility; **do not rename the folder or introduce a second v1.2 folder**.
- A new patch version changes the `main` manifest after PR review/tests. Do not edit `manifest.version` just to enforce this selection policy.

**Short answer for any agent:** "Use Experience OS v1.2" = **use the canonical released 1.2.x framework in `main`, currently 1.2.1**, respecting the tool owner's local instructions and checking current in-flight development first.
