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
