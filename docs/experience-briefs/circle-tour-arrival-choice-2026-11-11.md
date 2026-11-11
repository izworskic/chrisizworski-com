# Circle Tour Arrival Desk — Foundry 0.3 → Experience OS v1.2.1

**Reviewed:** November 11, 2026. **Owner:** `izworskic/chrisizworski-com`. **Canonical:** https://chrisizworski.com/lake-superior-circle-tour/ . **Baseline:** `53ef82aa15a545c4d760c7512e84c988b1b605c8`. **Scope:** existing eight official-source handoffs, 11 arrival records and original 31-stop route, not new GIS or parking intelligence.

## Foundry diagnosis: visitor is stranded at a fork

The arrival-desk first release provided accurate source-led search/direction links but rendered **both** arrival cards whenever a stop had alternatives. The same traveler could tap the Nipigon Marina map and Red Rock map without selecting which hike they intended. At Cascade, a wayside and a park office read as equivalent to a trailhead. At Temperance, DNR trails and Lutsen resort were given equal map actions. The shareable trip URL identified only a stop, not the starting point.

**Concrete visitor question:** “I am near this stop. Where exactly should I begin my chosen outing and what must I check before leaving?”

### Authoritative source context

| Claim | Evidence checked | Scope and remaining unknown |
| --- | --- | --- |
| Nipigon offers distinct short and long walks | [Parks Canada Nipigon River Recreation Trail](https://www.parcs.canada.ca/amnc-nmca/on/super/activ/experiences/randonnees-hiking/nipigon) | Lloyd's Lookout from Red Rock is about **2.6 km return**; the entire recreation trail is **10.1 km one way**. A map search is not a verified exact trailhead pin; return transport needs independent verification |
| Cascade falls and longer hill hikes have distinct starting requirements | [Minnesota DNR Cascade River tour](https://www.dnr.state.mn.us/state-parks/virtual-tours/cascade-river/dialup.html), [park map](https://files.dnr.state.mn.us/maps/state_parks/spk00133.pdf) | DNR describes Lookout Mountain from a day-use parking area. The **park office street address is not established as the Lookout Mountain trailhead** |
| Cascade historical parking disruption | [MnDOT May 27, 2026 notice](https://www.dot.state.mn.us/news/2026/05/27-d1-cascade.html), [Superior Hiking Trail current conditions](https://superiorhiking.org/trail-conditions/) | May parking controls are historical notices, not a November open/closed verdict. Trail improvements may be in progress; access must be checked again before departure |
| Temperance river versus Lutsen resort | [DNR Temperance River map](https://files.dnr.state.mn.us/maps/state_parks/spk00268.pdf), [Lutsen resort FAQ](https://www.lutsen.com/faqs) | The Highway 61 gorge/Carlton Peak approach and **467 Ski Hill Road** resort are separate operators/arrivals. Park route descriptions do not prove lift availability |
| Other eight-stop starting areas | [original source and precision ledger](circle-tour-arrival-desk-2026-11-10.md) | **Four published street addresses and seven named-place Google Maps searches** remain differentiated |

### Two outside experience references

- [National Park Service: Where can I hike?](https://www.nps.gov/subjects/trails/where-can-i-hike.htm): genuine affordance is task-first park hiking guidance, NPS App maps and offline park information. Adopt the separation of selection, place and offline source, **not** the NPS app's proprietary UI or data.
- [Parks Canada: Nipigon River Recreation Trail](https://www.parcs.canada.ca/amnc-nmca/on/super/activ/experiences/randonnees-hiking/nipigon): actual short and long routes, two documented starting ends and return planning in one guide. Adopt the concrete visitor distinctions, **not** inferred live route availability.

## Opportunities and concepts compared

Foundry investigated three: (1) one selected arrival with synchronized map and source (achievable), (2) live lot opening/parking (unavailable source coverage; unsafe to invent), and (3) surveyed route geometry (requires authoritative GPX/entrance point audits). **Selected (1)**.

Two credible designs were reviewed:
- **Compact two-path switcher:** two contextual native controls where needed, **one active** arrival detail, one outbound map link and one corresponding source. Choice is reversible and kept with the stop in a shareable URL. Zero extra controls for single-start stops. **Selected** for a stopover on a phone.
- **Two-row comparison then confirm:** both options show time/terrain/sources and require a separate “Use this start” confirmation. Supports deliberation but adds an extra action and repeated warnings to a 360px roadside interface. Preserve as a future option if observed usage warrants.

## Experience OS sequence: answer, proof, experience, understanding, fallback

1. **Answer:** The selected stop's specific outing remains first. The visitor chooses its starting *area* (not a status claim) and immediately sees the corresponding map/source.
2. **Proof:** The selected card carries the controlling source link and precision caveat. Published street addresses use Google Maps directions; named places/streets use search only.
3. **Experience:** Nipigon Marina versus Red Rock, Cascade wayside versus office consultation, and Temperance gorge versus resort **tell three different trip stories**. The design adds neither stock photos nor an unrelated second atlas.
4. **Understanding:** Red Rock short lookout and full one-way trail have genuinely different hiking commitments; Cascade's park office is not promised as the longer route's trailhead. Historic work notices stay historic.
5. **Fallback:** Unsupported interest (e.g., ships at Cascade) does **not** show waterfall directions and supplies a reset to other outings. Invalid share parameter returns to a bounded first option. No JS, catalog failure and no photo retain original Circle Tour guides.

### Connected-state matrix

| Journey | Stable selection | What must change | What must not drift | Failure/alternative |
| --- | --- | --- | --- | --- |
| Initial Nipigon | `stop=19, arrival=0` | Marina note, marina map search and Parks Canada source visible | No Red Rock second map button | Original park source if map does not resolve |
| Select Red Rock via Enter | `stop=19, arrival=1` | Active aria-pressed, Red Rock note, Third Street search, source, `ctArrival=1` | Keyboard focus stays on actual selector; no guaranteed trail status | Check signed trailhead and return transport |
| Switch to Temperance | `stop=25, arrival=0` | Temperance trail approach, DNR source, no stale `ctArrival` | Nipigon selection kept for later return | Trail or resort choice stays operator-specific |
| Return to Nipigon | `stop=19, arrival=1` | Red Rock choice restored | No stale Temperance source/map | Reset to Marina removes `ctArrival` |
| Filter ships at Cascade | `stop=24, theme=ships` | No park-only arrival is shown | No false ships specialist | Explicit reset to all outings restores falls directions |
| Unsupported/invalid index | `stop=19, ctArrival=99` | Falls back to index 0 | No invented third start | Source and named search stay attached |
| Original JS disabled | Original 31-stop HTML | Static vetted guide and specialists readable | No dynamic map claim | Original no-JS fallback |
| Catalog, photo or map unavailable | Original selected plan or fallback | Text and official source remain usable | No false open/available status, no blank canvas | Browser/site fallback, not invented directions |

### Difference from the closest existing tools

| Product | Existing core task | Deliberate distinctions |
| --- | --- | --- |
| Original 31-stop Circle Tour planner | Select places, order a route, compare itinerary length | The new arrival microdecision is **inside one chosen stop**, does not reorder the trip or claim an ETA |
| Journey Atlas | Photo-led visual route discovery with destination mood | The arrival desk has **one selected source-to-map action**, sparse native choice controls, named arrival caveats and no new map/photo hero |

The shared landscape typography and link safety are deliberate reuse. The two material differences are **decision granularity** (physical starting area, not stop/route) and **interaction** (one synchronized map/source selection, rather than multi-stop itinerary or visual atlas). It is not a cloned card catalog.

### QA and release truth

Foundry `startImprovement` captures the **real pre-change merge SHA**, assesses researched design, then replays seven scenarios against baseline and candidate. An improvement must be a genuine before→after gain; all existing preservation cases must continue to pass.

Experience OS structural release record: `circle-tour-arrival-choice.release.json`. Chromium tests actual buttons and map/source/URL changes at **360, 390, 768, 1366, 1440px**, including keyboard focus, A→B→A, deep link, unsupported interest, catalog 503, no-JS and horizontal overflow. Screenshots for changed Nipigon states are retained by the browser workflow. New photo/map assets, routes, canonical metadata, tool registry, AdSense and other engines are **out of scope**.

**Acceptance cannot be claimed** until exact-head browser/Foundry/Experience OS verification, full repository CI, preview, merge and independent production read-back complete. Google Maps query resolution, current trail/lot status, actual user visits and revenue impact are **NOT MEASURED** by source tests.
