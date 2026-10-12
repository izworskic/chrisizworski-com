# Epic / Ikon V2: JEV-guided ski day interpretation (2026-10-12)

The first screen is a pass-rule decision. The second screen helps a traveler understand what the visit **would mean** and **what action is next**. These must never be conflated.

## Reused architecture and provenance
Prior user product guidance (Detroit Outdoors, Old Sow, Niagara Falls):
`official facts → deterministic hard gates → closed safe candidates → shared-harness JEV choice → evidence-bound field notes → one next action`. JEV is the **editor/recommender**, not a policy source. No extra Haiku costs in V2; prose comes from dated official resort context and rule templates. The harness is called **only after deliberate “Check my access” submit**, via server-side `POST /api/epic-ikon-guide`, using the existing OIDC/shared-key client. No browser credentials or invented pass numbers. Timeout 2.2 s; one-click deterministic fallback. The site still renders the V0 result if the API fails.

## Policy and place evidence
- Epic peak dates: https://www.epicpass.com/info/peak-restricted-dates.aspx
- Ikon roster & day pools: https://www.ikonpass.com/en/compare-passes ; https://www.ikonpass.com/en/faq/
- Ikon reservation and blackout: https://www.ikonpass.com/en/how-to-use-your-ikon-pass
- Vail Back Bowls and Blue Sky Basin: https://www.vail.com/Explore/Experience-Vail.aspx
- Breckenridge five peaks: https://www.breckenridge.com/explore-the-resort/the-breck-experience/breck-five-peaks.aspx
- Jackson Hole Tram: https://www.jacksonhole.com/aerial-tram
- Four Aspen mountains: https://www.ikonpass.com/en/destinations/aspen-snowmass
- Whistler hours and PEAK 2 PEAK: https://www.whistlerblackcomb.com/explore-the-resort/about-the-resort/hours-of-operation.aspx

Curated place notes only. The historical, place-specific images for Vail (Joe Lin, CC BY 2.0), Breckenridge (Jlfdz, CC BY-SA 4.0), and Jackson Hole Aerial Tram (Sirguh, CC BY-SA 4.0) are correctly captioned and attributed beside the image, hidden if unavailable. No place photo unless subject, license and sourcing have been verified. Fallback for unprofiled mountains deliberately avoids claiming specific terrain, drive times or experiences. Do not show a random Vail photo for all 75 mountains.

## V2 trust and handoff corrections

- When a user explicitly selects **Check**, only their selected pass tier, mountain, date, trip intent and optional count/reservation answers are submitted to the site's server for the editorial recommendation; no account credentials or pass numbers are requested. Do not claim the choices remain entirely on-device.
- Shareable trip URLs preserve the four traveler-intent modes as well as pass, date, resort and optional fields, without account identifiers.
- The server rejects array/object/oversized values and unknown keys before JEV runs; it cannot accept untrusted free-text instructions disguised as pass inputs.
- Each historical source photo has a source-page link and a separately clickable Creative Commons license URL. Images are explicitly not current mountain-condition reports.
- All these are regression-tested and do not change V0's season-specific eligibility engine or incur new recurring API calls.

## Loss functions / release gates
- False YES due to JEV or editorial (loss 100): **0 permitted**. API verdict must exactly equal synchronous engine.evaluate(input); 20k deterministic engine fuzz suite remains mandatory.
- Missed blackout / failed reservations/day pool (100): **0 permitted**; mandatory first step cannot be replaced.
- JEV invented option or instruction injection (95): **0 permitted**; accepted choice is an ID in finite options with confidence >=.62 and injection dependency <.45.
- Slow/hung API (65): 2.2s server JEV timeout and client timeout, safe local decision first.
- Editorial pretending to be real time (90): **0**; label sources as dated policy and resort context; avoid asserting operating conditions.
- Wrong place image/rights (85): **0**; verified, credited place-specific assets only or no image.
- Thin or redundant copy (40): one why, one place context, one visitor next action, one official source; dynamic per status/intent.
- Search regressions (80): keep canonical, schema, Person ID, one AdSense loader, GA4 and same URL.
- Cost/latency (60): no Haiku in V2, no background JEV polling, no automatic per-keystroke calls; client retries not automatic.

## Acceptance scenarios
1. Epic Local / Vail / 2026-12-31 → NO, CHANGE_DATE, no JEV green; place note from Vail; next date is possible, not guaranteed open.
2. Epic / Vail / 2026-12-31 → YES, VERIFY_RESORT; official Vail note.
3. Ikon / Jackson Hole / 2027-01-12 (used days 0) → ACTION, RESERVE, official tram story; JEV must not evade reservation.
4. Ikon / Snowmass / 2027-01-12 / usedDays unknown → CHECK, COUNT_DAYS; shared four-mountain allowance.
5. Ikon Base / Aspen Mountain → NO, CHECK_PRODUCT; Snowmass-only special case.
6. Epic Day without peak/day size → UNKNOWN, DETAILS; no false green.
7. JEV unavailable/untrusted -> identical deterministic verdict, no exposed errors/keys.
8. Other 65+ roster resorts -> precise generic place context, not a misattributed mountain photo.

## Benchmark / Search hypotheses
Most valuable existing intent is exact “my pass + this mountain + this date”: one canonical page, not 75 shallow per-resort doorways. Measure GSC 28-day impressions, CTR, Google query clusters; measure `pass_decoder_check`, `pass_decoder_guide_ready`, `pass_decoder_jev_fallback`, `official_outbound` after explicit interaction. No invented measured search-volume or model improvement.
