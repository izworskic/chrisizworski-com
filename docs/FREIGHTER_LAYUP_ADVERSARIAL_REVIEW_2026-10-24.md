# Winter layup adversarial review — October 24, 2026

Baseline PR head: `5bf84c5a4d41e0d147fd3bcc5887413ed188b17d`. Production remains unchanged pending owner merge of PR #1161.

The earlier component rubric passed its narrow checks but missed sequences across history, keyboard focus and asynchronous map events. This pass adds release regressions rather than interpreting the earlier scores as proof of perfect usability.

## Reproduced or isolated failures and fixes

| Problem | Evidence | Fix |
| --- | --- | --- |
| Back restores Lee's story, then Close focuses Barker | Reproduced in the preview with real keyboard actions and browser Back | Removed the redundant return-vessel variable. Close uses the currently restored selected vessel. |
| Keyboard harbor choice drops focus to body | Reproduced by activating Superior's comparison button | Harbor actions and disappearing recovery buttons focus the stable fleet heading, scrolling only as needed. |
| Oakglen search says no matches despite a documented earlier winter | Reproduced in the default 2025–26 view; existing registry has the earlier record | Explicit other-winter suggestions preserve the query and reset incompatible refinements only after the visitor chooses to switch. No automatic mixing or switch. |
| Fit matching records remains available with no matches | Reproduced with Oakglen in the default winter | Disabled when there is no usable map or no matching record. All Great Lakes/reset remains available. |
| A late location callback takes over a newer harbor choice | Controlled execution of actual callbacks with a map fixture | A request generation invalidates old responses after a new task, browser history change, map fit or newer location request. Obsolete errors cannot overwrite newer messages. |
| Tile load completion is treated as successful even when every tile failed | Controlled CARTO/fallback tile events; old code labeled completion as a working basemap | Count actual successful/error tile events, show unavailable/partial states, and ignore events from a provider already replaced by fallback. |
| Old popups remain after new ship/filter selections | Controlled actual map handlers | Close stale popups on task changes, while allowing a clicked harbor's own popup to remain open. |
| Result scroll position has no explicit preservation/reset policy | Controlled result-list rerenders | Preserve scroll when the ordered result IDs are unchanged; reset it when the actual results change. |

Also scoped the upcoming-winter notice to this archive, derived it from registry seasons, exposed the active harbor in the collapsed refinement summary, and labeled date sorting as the record's as-of date rather than implying the newest event in a ship's history.

## Before/after benchmark

The exact same updated application-handler test suite and harness were run against baseline source in an isolated worktree and candidate source. The fixtures isolate tiles, network and map drawing; they are not human visitor tests.

- Baseline: **13 of 21** interaction scenarios passed; **8 failed**.
- Candidate: **21 of 21** interaction scenarios passed.
- Candidate combined data, biographies and interaction suite: **35 tests passed**.
- Additional browser CI assertions cover the two-ship Back/Close sequence, Oakglen's explicit earlier-winter recovery, zero-match fit availability and failed basemap labeling in both desktop and phone viewports.
- Full repository gate and exact final head/browser results are recorded in PR #1161 after completion.

These results extend the release gate. They do not establish visitor completion, learning, search, revenue or an overall product-quality score.

## Limits that UI code cannot fill

The source set remains a partial historical archive: twelve 2025–26 records across five harbors, with four rights-verified vessel photos in that sample, plus two records in 2024–25. There are no sourced 2026–27 records in the registry. No missing source was replaced by a current-location claim or an AIS-based layup inference. No source records, photo rights or legacy shipping/ice endpoints were changed.

Geolocation denial and delayed responses are tested through controlled actual handlers, not an observed physical-device permission dialog. Physical touch, full screen-reader use, 200% browser zoom and representative visitor outcomes remain unverified. GSC/GA4/AdSense are unavailable. No ad settings changed.

Exactly one next action: owner reviews the repaired PR/preview and chooses whether to merge.
