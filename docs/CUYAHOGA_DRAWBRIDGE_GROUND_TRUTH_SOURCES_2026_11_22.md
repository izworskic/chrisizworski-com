# Cuyahoga ground-truth source discovery: actual bridge opening and vessel passage logs

Research date: November 22, 2026.
Owning draft PR: https://github.com/izworskic/chrisizworski-com/pull/1841
Status: VERIFIED LOGGING OBLIGATION AND PUBLIC REQUEST ROUTES; ACTUAL HISTORIC LOGBOOK CONTENT NOT RETRIEVED.
No bridge ETA may be activated from this document.

## Decisive source: federal drawbridge log requirement

33 U.S.C. § 499(f)(1)(A) requires a drawbridge operator opening for a vessel to log:
- Bridge identification and date, tender/operator, the time opened for navigation and time closed.
- Number and direction of vessels passing during each opening; vessel types; dimensions of largest passing vessel.
- Each vessel's name and registration number if easily observable; maintenance, malfunctions and other remarks.
- Section 499(f)(2) requires retention for at least five years, and (f)(3) permits Coast Guard Secretary to request copies from the operator.

Official primary text: https://uscode.house.gov/us/usc/t33/s499/

**Vital distinction:** the legally required log is maintained by each bridge OPERATOR and is not necessarily published or held by the US Coast Guard. It is an independent actual-opening/vessel-movement source, NOT a dataset that we have downloaded. A ship capable of passing beneath a fixed/open drawbridge without a lift will not necessarily cause a draw opening entry. Absence of an opening log is not absence of a transit.

## Local Cleveland records confirm vessel passing times are tracked

City of Cleveland August 2026 Electric Bridge Operator duties explicitly state: "Maintains a log recording bridge openings, vessel movements, accidents, equipment malfunctions, and unusual occurrences" and "Records vessel names, direction, and time of passing in logbook."
Published city job bulletin: https://www.governmentjobs.com/careers/cleveland/jobs/newprint/5447446

2026 City of Cleveland Department of Public Works mechanical bridge maintenance legislative summary names six active mechanical/movable bridges: Center Street Swing, Columbus Road Lift, West Third Street Lift, Carter Road Lift, Willow Avenue Lift, and North Coast Harbor Bridge.
Official summary: https://cityofcleveland.legistar.com/View.ashx?GUID=487919DA-C181-4A4C-9C7A-B7D061572277&ID=15380991&M=F

IMPORTANT OWNERSHIP DISTINCTION: Columbus Road lift bridge is owned by Cuyahoga County, while the City of Cleveland reportedly handles moving parts. Source with detailed owner/operator reporting:
https://clevelandmagazine.com/articles/rating-clevelands-bridges-how-safe-are-they/
The City should be asked first as an operator; Cuyahoga County Public Works is the second public record holder to try. Railroad drawbridges are often privately operated. The 2026 municipal maintenance inventory is not a complete list of all navigational bridges or owners.

## Official public-record portals and engineering contacts

City of Cleveland Department of Law public-record request and released-requests archive:
https://www.clevelandohio.gov/city-hall/departments/law/requests-claims
https://clevelandoh.govqa.us/
Phone: 216-664-2772
Policy: https://www.clevelandohio.gov/city-hall/departments/law/public-records-policy

Cuyahoga County public-record portal and departmental contact:
https://cuyahogacounty.gov/public-records-request
https://cuyahogacounty.gov/public-records-request/public-records-managers
Cuyahoga County Public Works public records manager email: kcelebrezze@cuyahogacounty.gov; phone: 216-348-3867.

City Bridge Section / engineering plans:
https://www.clevelandohio.gov/city-hall/office-mayor/capital-projects/divisions/engineering-construction
Bridge Section phone 216-664-2381; Engineering Design email EngineeringDesign@clevelandohio.gov.
City project section contact for published Center Street bridge rehabilitation: mandrasik@clevelandohio.gov.
City records policy lists original blueprints, maps and plans as permanent records. Historic measured drawings may be downloaded from the Library of Congress HAER Center Street survey https://www.loc.gov/pictures/item/oh0108/ and Columbus Road survey https://www.loc.gov/item/oh1486/ ; these are not necessarily current, surveyed, georeferenced modern span axes.

Secondary open official resources:
- USCG Great Lakes Broadcast Notices to Mariners for temporary deviations and restrictions, e.g. https://content.govdelivery.com/accounts/USDHSCG/bulletins/3e7547e. These provide operating *windows/restrictions*, NOT the actual moment the ship passed.
- USGS NIMS/HIVIS time-stamped photographic archive, official API https://api.waterdata.usgs.gov/docs/nims/, includes a Rivergate Park Cleveland camera; a photo is useful only if the specific frame actually depicts the named vessel and bridge in the claimed time window. Historical July/August 2025 images and vantage were not confirmed in this research.
- Port/EarthCam Terminal Tower panorama https://www.earthcam.com/usa/ohio/cleveland/terminaltower/?cam=terminaltower is live, not confirmed as an accessible 2025 historical archive.
- Ohio DOT EnviroNet district 12 Center Street bridge environmental and project materials: https://environet.dot.state.oh.us/public/GetPublicDocuments.aspx?district=12. This is not itself a public georeferenced modern axis dataset.

## Narrow log request, exact historical test days

Request City of Cleveland Department of Public Works / Division of Streets bridge operator logs and digital movement records specifically for Center Street Swing Bridge, Columbus Road Lift Bridge, and West Third Street Lift Bridge on:
- July 6–7, 2025 LOCAL Cleveland time (EDT). One historical sequence starts at 2025-07-07 03:57 UTC, which is 11:57 p.m. July 6 EDT; later points are after midnight July 7. Vessel MARK W BARKER, MMSI 368251670. NOAA chart-reference candidates Center July 7 04:01:09–04:02:19 UTC and West Third July 7 05:07:40–05:08:50 UTC and 13:24:31–13:26:21 UTC.
- August 15, 2025 (EDT): vessel SAM LAUD, MMSI 366938760. This date has sparse AIS; log would provide independent positive/negative passage labels if preserved.
- August 21, 2025 (EDT): vessel MARK W BARKER, MMSI 368251670. NOAA chart-point Center candidate August 21 15:37:28–15:38:39 UTC; Columbus proximity observations 15:56:21 UTC do NOT establish its physical crossing.

Ask in existing native format (CSV/XLSX/database report if available, otherwise scans/photos):
(1) each bridge's opening and closing time, (2) vessel name and number if logged, (3) vessel count, direction and observed passing time, (4) reason for openings, special remarks, maintenance and delays, and (5) the native timezone convention and clock/source used. When an individual item is not recorded, preserve it as NOT REPORTED rather than guessing. Avoid unnecessary operator personal data. If another agency keeps a given bridge's records, request identification of custodian.

Suggested pasteable public-record request (do not send without explicit owner instruction):

"Under Ohio Revised Code 149.43, please provide the existing bridge tender/operator logs, drawbridge opening and closing logs, and vessel-passage movement logs for Center Street Swing Bridge, Columbus Road Lift Bridge and West Third Street Lift Bridge for local Cleveland calendar dates July 6 and 7, August 15 and August 21, 2025. I am looking for the existing records showing each opening and closing time and the name, direction and passage time of each vessel if recorded. Specifically relevant vessels include Mark W. Barker and Sam Laud. Please provide electronic records in their native format (CSV/Excel or readable scans) where available, indicate the timestamps' time zone, and identify another records custodian for any logs not held by the City. Please notify me of any fees before producing paper copies. Thank you."

This small request is 4 calendar days x 3 named municipal-operated bridges and is intended to maximize useful independent ground truth without an overly broad request. A similar request to Cuyahoga County specifically for Columbus Road backup is useful if the City redirects.

## Acceptance and scientific limits

These logs could provide independently observed actual vessel passage times, separate from NOAA AIS and point geometry. But (i) publication/release is not guaranteed, (ii) recorded time precision and clock calibration are unknown, (iii) logs of lifts/openings will miss any vessel passing below without a required opening, and (iv) multiple vessels through one lift need vessel-specific timing to avoid confusing opening start time with passing time.

After documents are obtained, preserve source files, evidence identifiers, source time zones, date-specific source references and unknown fields; compare to the existing Cuyahoga NOAA historical AIS 2025 dates. Require actual held-out bridge-passage labels before claiming forecast accuracy.

**Exactly one next action:** submit the targeted request to the City through its official portal, then request Columbus Road backup from Cuyahoga County if needed. No external request was submitted as part of this research; the user must authorize or submit it.
