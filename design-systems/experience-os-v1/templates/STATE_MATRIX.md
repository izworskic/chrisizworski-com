# Connected experience state matrix — [tool and canonical URL]

- Owner, owning repo, commit / PR:
- Decision being made and first useful answer:
- Stable selected ID / source of truth:
- Preferences (may suggest) versus explicit selection (must stay coherent):
- Source measurement units and user-facing display units:
- Verified map/route scope and explicit unknowns:
- Screenshot or QA artifacts (actual, not planned):

## Required interaction/failure scenarios

| Scenario | User action & equivalent keyboard action | Expected selected ID | Primary answer changed | Card, map, photo & detail all match or explicitly unavailable | Safety/source qualifier | Observed result & screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| Initial load (JS and no JS) | Open page | | | | | NOT MEASURED |
| Meaningful preference change | Select time/interest/option | | | | | NOT MEASURED |
| Explicit alternative | Choose a different card or native selector | | | | | NOT MEASURED |
| Reverse or reset | Choose original option / reset | | | | | NOT MEASURED |
| No known geometry | Choose unmapped route or no verified point | | | | | NOT MEASURED |
| Missing/slow photograph and A→B race | Block image or slow previous image | | | | | NOT MEASURED |
| Missing map tiles or map script | Block provider | | | | | NOT MEASURED |
| Invalid, stale or unknown data | Fixture / controlled error | | | | | NOT MEASURED |

## Human-visible quality and truth checks

Record at **360 / 390 / 768 / 1440px**: primary answer location, action location, actual computed body text size, horizontal overflow, credit visibility, image aspect/crop, tile render, status label, keyboard focus and whether selection scrolls to the changed answer. Reference full-page and changed-state screenshots; a browser test success does not replace looking at the images.

**Assertion contract:** IDs, measurements, source units, canonical and fixed state may be exact; descriptive text should preserve useful qualifying words and safety disclaimers. No contradiction between recommendation, unknown status and navigation evidence.

## Release evidence

- Source/data/photography provenance:
- Browser tests and exact SHA:
- Owning-repo CI and PR:
- Production deployment READY and matching merged SHA:
- Public canonical HTML smoke and actual observed content (or NOT VERIFIED):
- Performance measured / NOT MEASURED:
- Visitor outcome measured / NOT MEASURED:
- Failing state, correction, final rerun:
