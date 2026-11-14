# Shared Rust Itinerary Engine v1 | 2026-11-14

## Visitor problem

Multiple source-verified waterfall experiences already maintain distinct safety checks: the
Keweenaw and Black River regional presets, Munising's NPS road season, Presque Isle's
one-arrival river walk, geographic "nearby" discovery, and the six-stop shareable day sheet.
A visitor can browse any of them, but duplicated rules increase drift risk.

**This is a shared decision kernel, not an AI route writer or a substitute for land managers.**

## Source ownership

- `data/up-waterfalls.json` and the existing editorial visitor guides own stop identity,
  source links, season/advisory language, access classification and parking evidence.
- `public/assets/up-waterfalls-nearby.json` is still generated deterministically by the
  current Python/Rust proximity pipeline from waterfall *feature* coordinates. It is
  straight-line distance, not road mileage.
- `rust/shared-itinerary/src/lib.rs` contains no route network, maps, coordinates,
  land-manager approvals, live opening assertions, or agency source claims.
- `public/assets/shared-itinerary-engine.js` has an independent JavaScript policy oracle.
  It loads only `public/assets/shared-itinerary.wasm.b64` compiled from the pinned
  rustc 1.90.0 toolchain and must pass an exhaustive input matrix before activation.
- The existing page owns all copy, photographs, maps, semantic HTML, source footnotes,
  canonical URLs, analytics and advertisements.

## Exact supported decisions

| Contract | Inputs | Outcome |
|---|---|---|
| `it_stop` | source-approved visitor status and verified arrival | Permit a stop **candidate** or withhold it |
| `it_nearby` | reviewed stop plus an already-published straight-line distance and 10/25/50-mile filter | Include/exclude a geographic lead; **no driving route** |
| `it_plan` | independently reviewed saved/proposed stops, calendar-valid date and editorial outing mode | Atomic six-stop gate; conditional winter/date/source veto |
| `it_sheet` | stop count and region count | Distinguish regional checklist from cross-region research list |

The returned `it_plan=1` means "eligible to add to the editor's checklist," **never**
"safe/open today," "approved to park," "drivable in one day," or "landowner permitted."

Existing specialist rules still run **first**. The shared kernel is allowed to veto an
otherwise approved plan; it cannot override a specialist refusal.

Season modes: `0` = date advisory only, `1` = date required and winter extended-walk
precaution, `2` = motor-vehicle outing barred in December–March but date optional
outside winter. Munising's original published NPS unplowed-road caution still supplies
the actual explanation; the kernel never attributes a legal closure itself.

## Integrated experiences

- Keweenaw parks / gorge and Black River one-stop / corridor, with their existing
  conditional construction restrictions and a separate phase-3 Rust regional source gate.
- Munising shore / forest recipes, including their NPS unplowed-road rule.
- Presque Isle overlook / single-arrival three-fall walking circuit; it is **one park
  arrival**, never three independent driving destinations.
- Nearby source-backed geographic results; current saved-stop buttons remain the
  owner of selection and map focus.
- Shareable six-stop field sheet; the original parking-evidence gate is unchanged.
  No natural waterfall pin becomes a parking coordinate.

## Release / failure contract

1. A true WebAssembly binary must be produced by rustc 1.90.0, checked byte-for-byte
   against the committed base64 asset. Build logs, not a hand-written mock, supply it.
2. Rust unit tests, `scripts/verify-shared-itinerary-rust.cjs` (binary parity),
   `tests/shared-itinerary-engine.test.cjs`, and legacy waterfall planner tests pass.
3. A mobile Chromium run proves `engine() === 'rust-wasm'` on the actual visitor page,
   checks winter/closed/six-stop/radius cases, and tests a blocked WASM asset where
   the independent JavaScript fallback preserves all source refusals.
4. Full repository and live browser gates remain separate. Do not merge solely from
   the dedicated shared-engine workflow if existing publication gates fail.
5. If the binary disappears, is from the wrong ABI, or diverges from the independent
   oracle, the visitor must retain the JavaScript-only decisions. Runtime disagreement
   fails closed rather than creating a new access grant.

## Next expansion threshold

Before reusing this for Lake Superior Circle Tour or Pictured Rocks, build a
separate, source-approved adapter for their actual stop identities and route
constraints. A Circle Tour itinerary has border waits, road mileage, seasonal
road closures and longer time budgets; none can be inferred from the waterfall
six-stop gate. Existing 31-stop and specialist planner behavior must remain
unchanged until their own reference comparisons and browser regressions pass.
