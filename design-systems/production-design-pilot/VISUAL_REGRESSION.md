# Production design visual regression, Phase 5

Candidate protection for the existing local gallery only. Not a global UI score, live product test or active skill. Baseline source: e1795ba95f4777552f091d630ae4751ac53fda27. Prior green jobs: https://github.com/izworskic/chrisizworski-com/actions/runs/45439618608. Reference provenance, dimensions and artifact SHA-256 values are in visual-reference.json.

## Same-run rendering

A hosted browser and font stack can change over time. Rather than commit megabytes of environment-specific screenshots, render the immutable reviewed source and candidate with the same browser, locale, font stack and verifier in one runner. Historical artifact hashes identify what was reviewed, not a permanent cross-environment pixel match. Preserve the reviewed source as an ancestor of main: **use a merge commit preserving history for this PR, not squash/rebase**. If the source is absent, fail closed; do not switch to latest main.

Compare seven states (mobile/desktop default, alternate/focus, cross-family, mobile no-JS). Any changed RGB pixel, dimension, missing or unexpected capture requires review. Report changed pixel counts, fractions, bounds and red overlays for equal-size changes. Keep both originals for dimension changes. No masking, tolerance or automatic baseline rewrite. A harmless intentional change may fail: that is a review request, not proof of a defect.

The path-scoped workflow replaces the temporary branch-specific design-lab job. It runs independently of the full repository gate, on relevant lab and shared vessel-asset changes or manual dispatch. Existing Agent branch verification and production gates remain intact. No paid service, scheduled job, public route, package.json dependency, build step or Vercel function. Playwright and Pillow are installed only in ephemeral QA.

## Review and update contract

1. Run the behavior verifier first; missing/error states never become visual passes.
2. Inspect both renders and differences. Judge hierarchy, legibility, content, focus, evidence and related product behavior; pixel equality does not prove design quality.
3. Fix unintended changes and rerun targeted QA. Do not mask text or controls.
4. For justified intentional changes, retain failed diff evidence, obtain owner approval of actual new screenshots, and commit a separate explicit reference update pointing to the reviewed source, run, artifact, dimensions and hashes. Review manifest changes manually; they alter what is protected. Preserve the source commit in history.
5. Rerun targeted acceptance and full CI. The owner decides merge; no automatic release.

Review: cross-family layouts preserve differentiated accents, observation numbers and journey order; keyboard alternate state shows independent selection and visible focus; no-JS retains categories and native details. Small AIS silhouettes remain an opportunity, and the lab cannot validate pan, tiles, camera data or live conditions. Duluth has separate real-map acceptance. Independent skill evaluations remain outstanding.

## Verification

Built-in positive and negative controls (--self-test) test identical images, one-channel one-pixel change, changed dimensions, missing and extra captures. A green comparison proves captured lab states unchanged relative to reviewed source in that environment, not that the website is unchanged. Broader route-level baselines need actual-product review before enrollment.
