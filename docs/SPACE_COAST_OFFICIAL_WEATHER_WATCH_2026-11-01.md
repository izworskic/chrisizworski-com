# Official 45th Weather Squadron Mission Forecast Intelligence
Built November 1, 2026

## Visitor outcome
National Rocket Launch Live's Florida selection and the Florida Space Coast specialist now distinguish:
1. Mission schedule: LL2 third-party, not range authority.
2. Official 45th Weather Squadron *document forecast*, where matched: probability of violating covered flight-weather constraints, primary concerns, and separately labeled additional risks.
3. NWS range-area surface hazard context; not mission PoV or launch approval.
4. Spectator visibility and public access; separate from flight-weather constraints.

Do not label 100 minus PoV as "chance of launch." An operator may scrub for equipment, upper winds, recovery weather, safety or other reasons not included in 45WS PoV. An official forecast is not a live range GO call.

## Source discovery
- Hourly GitHub Actions job (minute 17 UTC) checks a bounded LL2 Florida upcoming list: maximum three next-six-day missions with at most one detail request each.
- An LL2 mission update's info_url only nominates an official document. Ignore contributor comment text, percent claims and conclusions.
- Fetch at most two PDFs per mission from https://45thweathersquadron.nebula.spaceforce.mil/assets/LaunchForecasts/*.pdf; different-host redirects prohibited, 2MB limit, 1–4 pages. No raw PDF stored.
- Python pypdf==5.9.0 extracts the explicit mission, UTC-issued time, launch valid date, first Launch Day PoV if unambiguous, primary concerns from a bounded vocabulary, and separate risk entries. Ambiguous or missing numbers remain null.
- Signed GitHub Actions POST is verified against the dedicated OIDC audience, workflow path, main branch, repository/owner IDs, runner and token age.
- Existing private Postgres ToolState persists only validated mission evidence, source URL and SHA-256, and bounded weather revision history; no Redis.
- Backend verifies official URL, mission identity, LL2 UUID, valid day (within two days of LL2 target), issue date, source digest and probability bounds.

## Chronology and failure rules
An issued-at date belongs to the official forecast; a detected-at date belongs to this website. A new SHA-256 and issued time yields a revision event. Updated PoV or concerns are shown with the earlier value. A changed launch target may invalidate a previously matched document. Missing links or source outages are unverified, not favorable.

The monitor is nominal hourly, not guaranteed. Some official documents may never be referenced by LL2 updates. Source servers sometimes restrict automated access; no source ingestion or probability is claimed in that case. Underlying official probabilities do not cover every mission risk. No GO/NO-GO or scrub chance is generated.

## Checks
- Node: node --test tests/space-coast-official-weather.test.js tests/space-coast-live.test.js tests/rocket-launch-usa.test.js tests/space-coast-launch-day.test.js tests/space-coast-media.test.js
- Python: python -m unittest discover -s tests -p 'test_space_coast_official_weather_pdf.py' -v
- GET /api/space-coast-official-weather reports monitor health even before first observation.
- Compare selected mission's source PDF and displayed issued time, valid window and PoV on both launch pages. No PoV for unmatched/stale/unavailable documents.

Sources:
- https://www.patrick.spaceforce.mil/About-Us/Weather/
- https://www.patrick.spaceforce.mil/Portals/14/Weather/LaunchFAQ.pdf
- https://45thweathersquadron.nebula.spaceforce.mil/assets/LaunchForecasts/Falcon%209%20Starlink%206-92%20L-2%20Forecast%20-%207%20Dec%20Launch.pdf
- https://ll.thespacedevs.com/2.3.0/launches/upcoming/?format=api
