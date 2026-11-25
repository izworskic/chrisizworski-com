# Great Lakes movement intelligence consolidation

## Scope and disposition

Rebase the research by copying new, nonconflicting files from PRs #1904, #1908, #1910 and #1951 onto current main without restoring their older production baselines. Original PRs remain open until this replacement is verified and accepted. PR #1953 is not copied over the current Soo production assets: main already withholds arrival estimates and chamber claims on failed refresh, retains explicitly labeled last-known reports, and includes failure/recovery tests. The old browser run 45509245186 failed on a case-sensitive "Planning estimate at the locks" assertion. The obsolete assertion is absent on main; fresh browser QA is required, not assumed.

The three old branch-only archive/replay workflows are not carried over. Their successful output is preserved; rerunning bulk downloads or relying on expiring artifacts is not necessary for this consolidation. Research CLIs and fixtures are retained for offline reproducibility. No new live feed, public forecast, API, dependency, schedule, Vercel feature, SEO or ad change.

## Actual evidence preserved

- [Historical library run 45390603940](https://github.com/izworskic/chrisizworski-com/actions/runs/45390603940): all three fixed 2025 dates processed, ten geographic regions, 19,097 Soo and 25,731 Duluth reported points. Regional counts overlap; no census, complete passages or traffic absence claim. Output: data/freighter-history/library-coverage-actual-20261124.json.
- [Soo corridor replay run 45391192438](https://github.com/izworskic/chrisizworski-com/actions/runs/45391192438): 6,496 of 19,041 adjacent pairs supported modeled progress. Correlated position pairs are not independent passages. Output: data/freighter-history/soo-corridor-replay-actual-20261124.json.
- [Soo proxy backtest run 45392249652](https://github.com/izworskic/chrisizworski-com/actions/runs/45392249652): nine matched vessels on the October 15 holdout day. Mean absolute error minutes: naive 74.82, existing 58.13, adjusted 29.25. Full reference bracket containment 2/9 existing and 8/9 adjusted, with mean interval widths 74.88 and 148.94 minutes, respectively. Chamber observations are proxies, not official entry times. Single holdout day, no calibrated confidence or production promotion. Output: data/freighter-history/soo-proxy-backtest-actual-20261124.json.
- Rolling forecast audit and development-only policy results from #1951 remain research-only. Current main already contains its required decision-time replay, crossing detector, retrospective reference and bias-corrected window modules. A new integration gate must establish compatibility.

## Acceptance

Run the owning repo full gate, name SERP protection, the four consolidated offline research test suites, and fresh Soo Lock Watch browser QA. Do not claim current production deployment or forecast qualification. No close/merge of superseded PRs until replacement CI is green and owner-authorized consolidation is confirmed.
