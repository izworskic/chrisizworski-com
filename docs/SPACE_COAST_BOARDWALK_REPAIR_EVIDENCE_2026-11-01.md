# Space Coast: official NPS Playalinda boardwalk repair evidence
Research and source-review date: 2026-11-01

## Actual outcome and critical distinction

The next step after mapped boardwalks and official park alerts is to help a
visitor understand whether the physical boardwalk is maintained, repaired or
reopened today. We searched NPS Canaveral news, NPS project planning,
national NPS Developer API, park conditions, storm management announcements,
and publicly reported construction contracts. We did NOT verify a complete
public, continuously maintained facility-level inspection or safe-opening
registry for Playalinda boardwalks #1–14.

Do not invent a boardwalk-by-boardwalk "open" table. The correct result is a
dated official publication history, with exact-numbered facility references
only when a source explicitly names a boardwalk, alongside separately
monitored live NPS closures.

### Verified, bounded historic NPS sources

1. NPS, December 4, 2024, Boardwalk Replacement:
https://www.nps.gov/cana/learn/news/boardwalk-replacement.htm
Announces an awarded contract and planned construction. No complete list of
numbered boardwalk completions, physical inspections or live openings.
Archived pre-2025 source.

2. NPS, November 19, 2025, Limited Access to Playalinda:
https://www.nps.gov/cana/learn/news/limited-access-to-playalinda-beach.htm
Describes limited park access after storms, including then-closed lots 8–13
and road north of Eddy Creek. Its original NPS photograph's identifying
caption reads "Playalinda Boardwalk #3" and image is named
"CANA_Playalinda_NewBoardwalk_3(3.9.25)".
The image depicts historical construction, not current condition.
Photo URL confirmed:
https://www.nps.gov/cana/learn/news/images/CANA_Playalinda_NewBoardwalk_3-3.jpg

3. NPS, September 4, 2026, Playalinda District Storm Adaptive Management Plan:
https://www.nps.gov/cana/learn/news/canaveral-national-seashore-invites-public-feedback-on-plans-to-strengthen-storm-resilience-in-playalinda-district.htm
Potential work and alternatives for roads, boardwalks, dunes and parking. Not
a construction certificate or announcement that proposals have been built.
https://planning.nps.gov/projectHome.cfm?projectID=132971 notes comments are
under review.

4. Current official park alerts, separately handled by existing engine:
https://www.nps.gov/cana/park-alerts-cana.json
On November 1, 2026, NPS explicitly reported a closure effective October 25
for parking lots 8–13, road north of Eddy Creek, and beach north of the Eddy
Creek boardwalk. Such current restrictions always take precedence over dated
historical reopening news.

### Scalable official source, no new credentials

NPS News Releases API:
https://developer.nps.gov/api/v1/newsreleases?parkCode=cana&limit=75&sort=-releaseDate
Documentation:
https://www.nps.gov/subjects/developer/api-documentation.htm
https://www.nps.gov/subjects/developer/changelog.htm

Use the existing server-side NPS_API_KEY, never send it to a browser.
The new independent /api/space-coast-boardwalk-repairs route is cached at
the CDN for 6h, with 1h stale-while-revalidate, and does not slow down or
add an upstream request to LL2 or the critical launch schedule endpoint.
NPS's publishing API may be delayed from official page updates, and can
fail or omit relevant press releases. If it fails, the module provides only
the explicitly reviewed NPS historical articles, clearly labeled
"live official publication metadata unavailable". It never announces
"all repairs confirmed" because no matching news was returned.

The official NPS API returns title, abstract, date, link, parkCode and ID;
the code validates park identity and nps.gov URLs, removes future dates,
caps outputs, deduplicates curated NPS original articles, and only
associates a numbered boardwalk if the text literally names "Boardwalk #N"
or an explicit boardwalk range. A "Parking Lots 8-13" closure is NOT a
"boardwalks 8-13 successfully repaired" source.

Even a news record saying "Boardwalk 10 repairs completed" would produce
a dated historical claim, not a live inspection or a guarantee the public
may visit during a launch. Each of the 14 numbered assets has independent
status fields explicitly set to "not-verified":
- currentInspectionStatus
- currentOpeningStatus
- currentAccessiblePassageStatus

The returned news history and facilityEvidence are separate from the
existing source-fresh park alert closures and official lot geometries.
No automatic "open" classification exists anywhere in this module.

### Visitor UX

Before the numbered-lot explorer, an editorial "Boardwalk Record" presents
a compact readable NPS-dated history, with an explicitly historic real
NPS photo of boardwalk #3, live publication-check status and official links.
For a selected lot, show the corresponding numbered boardwalk's exact
historical source association if available, plus a prominent three-part
"NOT VERIFIED" physical/opening/accessibility statement. For all other
boardwalks with no dated facility-specific release, explicitly say that
absence of a record is not evidence of no work. Do not cover up the existing
closed-lot/map warnings.

Do not add a new database, Redis, cron, mapping API, or unlicensed generated
photography. The NPS image is an original publicly hosted NPS photograph,
shown with caption, date and source. Responsive image treatment is limited,
not a huge hero.

### Release checklist

node --test tests/space-coast-boardwalk-repairs.test.js
node --test tests/space-coast-access-evidence.test.js
node --test tests/space-coast-boardwalk-gis.test.js
node --test tests/space-coast-geo.test.js

Full GitHub Actions gate, public audit, identity protections, Vercel preview;
merge only after green. Verify exact production commit READY and:
- GET /api/space-coast-boardwalk-repairs: HTTP 200 and 14 facility statuses,
  never verified current opening; NPS news status verified or explicitly
  unavailable, with documented historic articles fallback.
- Desktop + mobile page: live NPS closure status still works, 13 lots, 14
  historic boardwalks and CARTO map remain functional.
- Boardwalk Record has image and dated press entries; selected Lot #3 has
  historic photo evidence but no current opening claim.
- Browser script compiles via JavaScript syntax regression tests.

### Future higher-confidence upgrade

Obtain NPS maintenance work order / construction inspection feed when it
exists with fields: facility ID, status as-of, explicit reopening date,
original issuing park authority, repair type, accessible path compliance,
and unique source URL. Then validate and match it to our existing NPS
boardwalk FACLOCIDs. Do not treat federal procurement "contract complete"
or storm-plan proposal as evidence a visitor can walk on a specific site.
