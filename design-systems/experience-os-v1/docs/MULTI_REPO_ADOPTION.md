# Cross-repository and cross-agent adoption

**Important limitation:** a root `AGENTS.md` in `izworskic/chrisizworski-com` applies to agents in that repository only. A new chat, an independent extracted tool repository, and a different agent harness may **not** load the same instructions. Do not claim this package is universally injected.

## This repo (first adoption)

- The root `AGENTS.md` requires reading `design-systems/experience-os-v1/AGENTS.md` for relevant work.
- `CLAUDE.md` points compatible Claude project sessions at the same policy.
- `.github/copilot-instructions.md` covers supported Copilot repository sessions.
- Each entrypoint keeps a short pointer, rather than duplicating a long drifting playbook.
- Root `tests/experience-os.test.js` checks pointer presence, required docs and the manifest.

## Independent tool repositories

During the **next approved substantial work** on a separate tool, first read its `AGENTS.md`, then add a scoped adoption pointer if absent:

```md
## Experience research and UI governance
For new visitor tools, substantial UI redesigns or new interactions, read the
EXPERIENCE_OS_V1 package maintained at:
https://github.com/izworskic/chrisizworski-com/tree/main/design-systems/experience-os-v1
Use AGENTS.md, EXPERIENCE_LIFECYCLE, INTERACTION_PATTERN_LIBRARY, QA_SCORECARD,
and, for substantial interconnected interactions, CONNECTED_EXPERIENCE_CONTRACT.md
and templates/STATE_MATRIX.md. Apply this repository's own safety, CI,
canonical, map/data and ad rules first. Read the current default-branch release
or pin a reviewed commit if stable reproducibility is required.
Tiny bug fixes need only relevant guardrails.
```

Add `CLAUDE.md` and/or Copilot instruction files where needed **after** checking what the tool repository already uses; do not overwrite its custom instructions. If an agent cannot access the source package, do not pretend to have read it; stop, find an accessible copy or state incomplete.

## Ownership/automation

- Central source package = **one authority**; do not fork all of the source documentation into each tool repo.
- A future lightweight conformance job may scan known repo entrypoints for a pointer and report missing adoption, but it must not mutate other repos without change review.
- Newly extracted tool repos should include the pointer and correct owning-repo gates in their bootstrap checklist.
- Periodically audit adoption and source links; if instructions conflict, the owning repo's safety and product contracts take precedence.
- ChatGPT memory is convenient for context but not a reliable substitute for checked-in files; generic chats don't automatically access a repo.

## Safe rollout

1. This source-only PR in central repo, with tests and pointer entries.
2. Verify CI green; merge if allowed.
3. Adopt in Porcupine Explorer's owning repo, then next high-value design work; log coverage in a future registry.
4. Apply to other independent repos as they receive significant UX work; never silently edit all of them.
5. Audit after releases: source checked dates, actual source URLs, reusable lessons and outcomes.

## Evidence of adoption

A project is **adopted** only if its owning repository contains a discoverable pointer *and* a project PR shows a concrete research/experience brief and evidence. A central README mention alone is **not** adoption.

## V1.2.1 portable source evidence (October 31, 2026)

When an independent tool's owner explicitly adopts Experience OS, copy or vendor the **reviewed** small `lib/release-evidence.mjs`, `scripts/new-experience-os-v1.2.mjs` and `scripts/verify-experience-os-v1.2.mjs` with an explicit upstream commit reference. A mere link in this central repository does not load runnable code in another repo. Its own tests, CI, data and publishing contract remain authoritative; the central `--check-site` option is deliberately valid only for `izworskic/chrisizworski-com`. A future independent repo may implement its own catalog verifier rather than copying central HTML assumptions. No auto-push, secret access or blanket modification of sibling repos is authorized.
