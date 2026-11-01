# Porcupine Mountains: original 16 personas after the three Experience OS fixes

**Date:** November 1, 2026 · **Canonical:** https://chrisizworski.com/porcupine-mountains/ · **Owning repo:** izworskic/chrisizworski-com  
**Production release:** [PR #1360](https://github.com/izworskic/chrisizworski-com/pull/1360), merged commit `3061ac619ed6a023a573b18099903c45b9b2b9f6`; production Vercel deployment confirmed **READY**.  
**Independent production-browser run:** [GitHub Actions #41305446061](https://github.com/izworskic/chrisizworski-com/actions/runs/41305446061); 30-day artifact `porkies-persona-research-20261101` with `persona-results.json`, `readout.md`, screenshots.

## Controlled before/after

| Original test criteria | Before (November 1) | After deployment (November 1) |
| --- | --- | --- |
| Scripted persona paths meeting all expected criteria | **11 of 16** | **16 of 16** |
| Persona paths flagged | **5** | **0** |
| RV, camper and trailer examples | 3 flagged for missing restrictions in first answer | All 3 pass; first answer includes source-led restrictions |
| Short-trip requested attraction vs distant arrival | 2 flagged for silent substitution | Both pass; explicit reversible local-vs-requested separate-trip path |
| Mobile-first useful control | full planner starts ~4,876px below top (390×844); hero jump link existed | First meaningful scenic-view/river/forest choice **297px from top** in 390×844 production browser, preselects the real planner; full form remains lower down by design |
| JS, keyboard source proof, no-JS, 503 entry ledger | baseline tests passed | all passed again |
| Issues in postrelease issue register | N/A | One deliberate **P1 indexing gate**: `noindex,follow` remains |

**Interpretation:** 16/16 is a *scripted expectation count*, NOT a human task-completion rate, survey, user satisfaction percentage, actual in-park arrival success, verified road/bridge/passability, increased clicks, or measured engagement lift. The same 16 original personas were rerun using the revised requirement that a distant attraction counts only if the user can explicitly choose it and reverse the choice; the source-backed main itinerary and A/B comparison both update. No unverified drive time is accepted.

## What was actually tested on production

- Browser visits `https://chrisizworski.com/porcupine-mountains/` loaded published HTML, scripts, and first-party experience JSON. The automation independently checked `window.PorkiesEngine.vehicleCautions` exists, three `.hero-quickstart [data-porkies-start]` controls render, and the static DNR camper source exists.
- Travel time constraints and season: short 2h opposite-district views/falls, summer 4h RV, summer 8h trailer cross-park, winter western motorhome, January east skiing, May reopening, November outlook, two-day backcountry.
- Both opposite-district cases: the A/B choice offered the desired attraction, button changed the **actual primary recommendation**, relevant photo/source comparison shifted to the requested place, wording denied two-hour-trip certification, and reverse button returned to local outing.
- RV/trailer checks read the first generated result, not just the downstream map.
- The mobile real production DOM measured the first choice at **297px** and the original full form at **5,329px** down. This solves the initial decision discovery, **not** by compressing the original field-guide storytelling into a cloned template.
- Keyboard-operated source panel, static no-JavaScript (3 stories, 6 parking records, 1 initial comparison) and forced HTTP 503 on the entry-evidence file all passed. No unreviewed route was produced. Production `noindex,follow` remains.
- Source GIS query calls were replaced with bounded empty fixtures during persona sweeps so 16 sessions would not stress Michigan DNR endpoints; **these tests do not prove live GIS feed reliability.** Public HTML, JS, media source semantics and first-party JSON were real. Maps and photos were also separately exercised in [PR #1360 browser QA](https://github.com/izworskic/chrisizworski-com/actions/runs/41304894416): four viewport widths, 36 screenshots, no overflow, no JS errors, no-JS, no fake route, actual licensed images.

## Remaining independent release blockers

- Verified signed entry, vehicle staging coordinates and legal park approach to individual lots are incomplete; County Road 519 work-zone reopening and live gates are still not certified.
- The original `noindex` state remains on purpose pending broader park readiness; do not quietly remove it to inflate impressions.
- Real visitor completion, user comprehension, moderated usability testing, real-world accessibility, provider tile reliability on poor networks and long-term search/engagement results are **NOT MEASURED**.

## Lessons for Experience OS v1.2

1. Put source-backed feasibility into the first answer; don't assume a visitor will discover a critical RV restriction in a later map panel.
2. Preserve the stated attraction when it conflicts with arrival side/time. Offer a reversible *nearby vs separate trip* fork rather than pretending a view is a waterfall or a cross-park drive is quick.
3. First-screen choice accessibility is distinct from moving an entire complex planner above the fold. Keep the ranger narrative and imagery; choose the correct visitor intent in one early action.
4. Confirm live production deployment **and** rerun exact user-goal tests after release; structural CI alone does not establish deployed behavior.

**Source guidance:** [Michigan DNR 2025 scenic-area visitor guide](https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/PMWSP-paper-23/PMWSP-Visitor-2025.pdf), [DNR park information](https://www.michigan.gov/recsearch/parks/porkies), [official DNR map](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/porcupine_mountains_map.pdf).
