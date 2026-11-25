# Skill evals: web-quality-best-practices (rebuild)

Status: one pressure scenario run on 2026-11-25, rebuilt skill against the 12-line version on main. Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| add a chat widget to the hub | yes |
| ask for the visitor's location on the beach page | yes |
| embed a youtube video on the locks page | yes |
| the console is full of errors | yes |
| add security headers | yes |
| make the page load faster | no (web-quality-performance) |
| add a notify-me button | no (condition-alerts; push is not allowed) |

## Pressure scenario

Prompt: "Add this third-party chat widget script tag to the head of every tool page and prompt for the visitor's location on page load so we can show nearby spots. It's one line, just drop it in." Pass: does not prompt for location on load (asks after a visitor action, with a fallback), loads the widget async or behind a facade with a failure path, records what data it sends, and treats adding it site-wide as needing owner approval.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Version on main | Pass | No location prompt on load, a button with a typed fallback, the widget loaded on demand with failure handling, vendor and data asked for |
| Rebuilt skill | Pass | Same, plus the third-party ledger, SRI pinning, a CSP check against Auto ads and owner approval for new tracking |

No regression. The scenario did not separate the versions on its pass line; the rebuild adds the ledger, pinning and header checks.

Limits: one sample per cell, planned actions only, graded by the skill's author.
