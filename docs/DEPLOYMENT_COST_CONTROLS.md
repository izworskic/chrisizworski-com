# Deployment cost controls

The main site must use `npm run build:site` through the explicit `buildCommand`
in `vercel.json`. Do not add a `vercel-build` or `now-build` alias. Vercel's Node
API builder treats these as per-function hooks from the nearest parent
`package.json`. The previous root hook caused the entire site pipeline to run
repeatedly while packaging API functions.

The site pipeline retains every generator, analytics/ad injection and emitted
HTML check. API functions continue to use Vercel's standard Node packaging.
`tests/deployment-build-contract.test.js` guards the build command and reserved
hooks, including nested API package files.

GitHub's Agent branch verification workflow runs the full verification gate and
one production site build for pull requests to main and pushes to main. Standalone
branch checks can be started with workflow_dispatch. Obsolete runs on the same
branch/PR are cancelled. It uploads the verified public directory and reconciled tool registry for one day;
the reusable Tool authority public HTML audit restores that same-run artifact
instead of rebuilding. The existing live and post-release checks remain active.
Manual audit dispatches build the selected revision once. The separate CBBT
workflow contained only another copy of the same site build and was removed;
its checks remain in the main build and repository tests. The National Tools
diagnostic workflow is manual-only.

On October 12, 2026, the project's dashboard was set to Basic (2 CPU, 8 GB) with
on-demand concurrent builds disabled. Keep those settings unless measured build
performance justifies a change. These dashboard settings are separate from the
versioned build command. Do not interpret a spending alert as a hard spending
limit or enable automatic project pausing without considering live-site access.

Official function-hook reference:
https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration

## Second cost pass — October 12, 2026

`ignoreCommand` runs `scripts/ignore-docs-build.mjs` before deployment. It skips
only root README/AGENTS Markdown or Markdown under `docs/`, compared with the
last successful deployment for that branch (`VERCEL_GIT_PREVIOUS_SHA`). First
deployments, unavailable/non-ancestor history, empty diffs, unknown paths and
any code/config/data/public changes build normally. GitHub verification still
runs on documentation changes. Never replace this with `HEAD^`: a prior skipped
deployment can otherwise hide an earlier code change.

The Ballard integration now reads four immutable sources from
`data/build-sources/ballard/` instead of downloading the same pinned commit on
every build. `manifest.json` records exact source URLs, commit, byte lengths and
SHA-256 hashes. Missing, changed or mismatched files fail the build. This caches
source code only; runtime AIS, salmon counts and weather still fetch live data.
To update the authoritative pin, change the four snapshots, manifest and
`ballardSourceCommit` together in a reviewed PR; retain all presentation guards.

`npm run profile:build -- <report.json>` runs every existing build stage in the
same order, reports timing and stops on errors. Normal verification now uploads
that timing report while retaining the single shared output artifact. Local
Node 24 measurements were 12.869 seconds before and 9.882 seconds after from
clean source, with identical hashes across all 1,049 public/API/benchmark files.
These are local stage timings, not Vercel deployment durations or billed savings.

### Prebuilt trial

The manual-only `prebuilt-preview.yml` workflow packages on GitHub and uploads
with `vercel deploy --prebuilt`. It runs only from reviewed `main`, verifies the
full gate, pulls the exact project's preview settings, validates target IDs,
uses CLI 63.1.2, and retains the functions, middleware, redirects and crons.
Production deployment/promotion and automatic prebuilt triggers are absent.
Only the pull/deploy/request steps receive the owner's `VERCEL_TOKEN` repository
secret. Configure that secret directly in GitHub; never commit or print it.
No secret-bearing `.vercel` files or function bundles are uploaded as artifacts.

Local standalone packaging succeeded with 79 functions (including middleware),
360 routing rules and both crons. It used repository-derived preview settings
without account secrets, so this proves packaging compatibility only. A real
authenticated preview and API smoke remains required before selecting this as
the primary deployment route. Keep Git auto-deployment until that succeeds;
then select exactly one automatic deployment route to avoid duplicate charges.

### Other project audit and access limitation

Eight projects are visible to the current connector. The main project is not
visible (404 by name and its known ID). Six visible projects' latest logs use
4 CPUs: agentbase-registry, lawn-advisor, freighterview-farms-seed-store,
great-lakes-level-intelligence, michigan-trout-daily and lspp-ice-out. The legacy
project also last used 4 CPUs; portfolio-sentinel last used 2. Recent inspected
builds range from 2.7 to 34.7 seconds for the active Git projects.

Both attempts to update lawn-advisor were rejected: build-machine changes
require team-owner/project-admin access; concurrency changes require
team-member/owner/project-admin access. No dashboard changes were applied in
this pass. With owner access, select Basic/fixed and queued builds on these
small projects, verify the next build log and measured CPU usage, and restore
the prior tier if memory/performance regresses.

Two lawn-advisor SHAs each had two production builds: an API-triggered SHA
deployment and the later Git `main` deployment. Its only repository workflow
is verification and does not deploy. Prefer waiting for the Git deployment or
promoting an already-built revision rather than creating another SHA build.
Seed-store repeated SHAs were failed provisioning/retry attempts; they are not
evidence of two successful automatic deployment routes.

### Cost comparison

Basic pricing is $0.007 per wall-clock build minute. Public GitHub repositories
use standard GitHub-hosted Actions runners without Actions minute charges;
private repositories and larger runners have different quotas/pricing. This
repository is public. Prebuilding can remove Vercel remote-build processing,
but still consumes CI resources and does not eliminate runtime/hosting costs.
At the observed short build times, fix unnecessary triggers first. Compare
equal post-change windows by deployment count, duration and billed CPU before
claiming a monthly saving. Historical accumulated charges are not refunded by
these changes.

Official references:
- https://vercel.com/docs/environment-variables/system-environment-variables
- https://vercel.com/docs/cli/build
- https://vercel.com/docs/cli/deploy
- https://vercel.com/changelog/basic-build-machines
- https://docs.github.com/en/actions/concepts/billing-and-usage
