# Rocket & Payload Visual Intelligence v1 — NASA archive + SpaceX launch video

**Implemented:** November 3, 2026 · National Rocket Launch Live USA  
**Canonical:** https://chrisizworski.com/national-tools/rocket-launch-live/

## Visitor outcome

The selected mission now has a source-credited **Meet the Rocket** / **What It Carries** experience just below the mission decision cards. There is also a four-family rocket identification gallery. This is a visual field guide, **not a live camera feed, current-mission photograph, verified payload manifest, operator launch clearance, or sponsored NASA experience**. All imagery labels state it is historical or representative.

The selected rocket is matched to one of four families (Falcon 9, Starship/Super Heavy, Vulcan Centaur, New Glenn), with longer-term expansion possible. The first seed contains three NASA-photographed family examples plus two NASA-photographed payloads (ESCAPADE and IMAP). New Glenn deliberately displays a labeled no-photo state because relevant NASA archive results were credited to Blue Origin or did not clearly photograph the rocket. Generic contractor imagery must not be presented as NASA-owned.

Payload photos appear **only for uniquely named NASA spacecraft** when the mission label matches. Military, commercial broadband or unknown payloads get clear mission/source text and a link to their operator, never an unrelated spacecraft photograph.

## Source architecture

1. Python standard-library script `scripts/rocket_launch_visual_catalog.py` queries only `https://images-api.nasa.gov/search` in a small bounded set of 9 requests (4 families and 5 known payload identities). Results are matched by the photo **title**, NASA center, NASA-specific photographer credit, and safe image URL. Copyrighted partner credits (SpaceX, Blue Origin, ULA, contractor/courtesy marks) and unrelated content are rejected. Results are ranked using pinned, independently reviewed NASA IDs first.
2. A weekly GitHub Action refreshes `public/synced-national-tools/rocket-launch-live/visual-catalog.json`. It commits **only if source-approved content changes**, avoiding Vercel builds on no-op refreshes. Manual dispatch is available. Failures preserve the existing reviewed catalog rather than replace images with random search results. The script does not access the site's private database, NASA API key, Redis, or Supabase.
3. The site's browser requests one **same-origin static JSON file**, never NASA's API directly. Strict client-side checks also reject a malformed catalog: `images-assets.nasa.gov/image/...`, `images.nasa.gov/details/...`, and NASA-identified photographer credit are required. Alt text and source links keep image evidence legible. The page remains fully usable if images fail.
4. `lib/space-coast-media.js` adds the **SpaceX YouTube channel** to the existing operator directory, explicitly labeled "not a verified stream for this mission". The existing mission-specific LL2 video links and click-to-play YouTube player remain unchanged. No unverifiable claims that SpaceX has a public official API or that a channel is streaming this mission.

## Specific seed image evidence

| Family or spacecraft | NASA image ID | Credited to | Correct label |
| --- | --- | --- | --- |
| Falcon 9 | NHQ202409270003 | NASA/Keegan Barber | Crew-9 rollout, representative Falcon 9 |
| Vulcan Centaur | KSC-20210826-PH-KLS01_0073 | NASA/Kim Shiflett | Vulcan 2021 test/rehearsal era |
| Starship | iss072e220043 | NASA/Don Pettit | Starship Flight 6 photographed from ISS |
| New Glenn | **No image approved** | — | Source/operator link only |
| ESCAPADE | KSC-20240822-PH-KLS01_0033 | NASA/Kim Shiflett | Twin spacecraft in a processing facility |
| IMAP | KSC-20250529-PH-AJN01_0065 | NASA/Amber Jean Notvest | NASA spacecraft ground processing |

The source records are accessible at `https://images.nasa.gov/details/<NASA_ID>`. NASA's official rules permit informational editorial use in many cases, but contractor-supplied photos in the NASA archive may remain copyrighted. We require positive NASA credit rather than treating the entire domain as automatically reusable. No NASA insignia is used as a site logo.

## Verification and acceptance

| Measure | Goal |
| --- | --- |
| NASA API calls per visitor | **0** |
| Extra live launch-provider API calls | **0** |
| Recurring API search budget | Up to 9 once weekly |
| Verified NASA-credited initial photos | **5** |
| Current-mission images falsely inferred from rocket-family photos | **0** |
| Images from credited SpaceX/Blue Origin/ULA contractor media | **0** |
| New databases, Redis, Supabase or new Vercel backend | **0** |
| Inaccurate "SpaceX YouTube is live" claims | **0** |
| Canonical/Google indexing behavior | Unchanged |
| Small-screen view | Gallery two columns, features stack |

### Tests

```bash
python3 scripts/rocket_launch_visual_catalog.py --test
node --test tests/rocket-launch-visuals.test.js tests/space-coast-media.test.js
node --test tests/rocket-launch-usa.test.js tests/rocket-launch-slip.test.js
```

Additional existing launch, SEO, weather and site build tests must pass before merge. After merging, verify production in California/Florida/Texas on both a small screen and desktop; check the static JSON delivery, real NASA image URLs and fallback when no photo is approved.

### Official reference documentation

- NASA Image and Video API: https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf
- NASA media-use guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/
- NASA Media Search: https://images.nasa.gov/
- SpaceX mission archive: https://www.spacex.com/launches
- SpaceX official video channel: https://www.youtube.com/@SpaceX
