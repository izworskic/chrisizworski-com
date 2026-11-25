---
name: incident-rollback
description: "Recover when production breaks: confirm and scope the failure, choose between Vercel Instant Rollback and a revert PR, avoid the pinned-production trap, verify on the live site and write a short postmortem. Use when a live page, API or tool on chrisizworski.com is broken after a deploy, when someone asks to roll back or revert, or when main deployed something bad."
---

# Incident and rollback

`main` auto-deploys to production with no staging step (AGENTS.md). When something reaches visitors broken, speed matters, and so does not making it worse.

## 1. Confirm and scope

- Reproduce on the live URL, not a preview. Record the time, the affected URLs and what the visitor sees.
- Find the first bad production deployment and the commit or PR behind it.
- Decide whether a deploy broke it or a data source or writer did. Rollback does not fix a dead feed; see freshness-watch.
- Hold new PRs for the affected tool until it is resolved (change-intake).

## 2. Choose the path

| Path | Use when | Note |
| --- | --- | --- |
| Vercel Instant Rollback | A deploy broke production and the previous production deployment was good | Reassigns domains to an existing deployment; nothing rebuilds |
| Revert PR | The bad change must leave `main`, or several commits are tangled | Normal PR gate |
| Forward fix PR | The cause is understood and the fix is small | Still a PR; never a direct push to `main` |

The usual order: Instant Rollback to stop the harm, then a revert or fix PR, then undo the rollback.

Rollback and merge are owner actions. Prepare the exact dashboard step or command and the evidence, and run nothing without the owner's word.

## 3. The pinned-production trap

After an Instant Rollback, Vercel stops auto-assigning production domains. Merges to `main` keep building but do not go live until a deployment is promoted again, with `vercel promote DEPLOYMENT_URL` or the Manage button on the production deployment tile. While production is pinned:

- Report merged work as merged, not live.
- Promote the verified fixed deployment as soon as it exists, which also restores automatic production assignment.

During a rollback, environment variables are not changed and cron definitions revert to those of the target deployment. Hobby plans can roll back only to the immediately previous production deployment; Pro can choose any earlier production deployment. Only one rollback or promotion runs at a time per project.

## 4. Verify recovery

Check the live URL, the affected API routes and the next portfolio-sentinel sweep (or a manual run). Recovery means the live page shows the correct answer. A green build or a successful rollback dialog is not recovery.

## 5. Postmortem

Append one short entry to `docs/INCIDENTS.md`, creating it if absent. Markdown only, so the commit skips the Vercel build.

```
## YYYY-MM-DD: TOOL, what broke
Impact: who saw what, from when to when (local time)
Cause: the change or source failure, with PR or commit
Fix: rollback, revert or fix, with links
Missed by: the gate or monitor that should have caught it
Follow-up: one concrete check or test, as its own PR
```

Write it blameless: describe systems and gates, not who made the mistake.

## Boundaries

Never push to `main`, bypass a red gate, delete deployments or change environment variables as part of recovery. Auto ads, canonical and Person contracts and existing release contracts apply to the fix PR. Do not auto-merge.

## Sources

Vercel docs, Instant Rollback (page updated 2026-07-07). PagerDuty postmortem docs (PagerDuty/postmortem-docs, Apache-2.0) for the blameless postmortem shape. Reference only.
