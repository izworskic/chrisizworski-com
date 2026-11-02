# Rocket launch official weather: independent source discovery

Updated November 1, 2026

## Why this matters
Previously the hourly 45th Weather Squadron collector could discover official forecast PDFs only if a third-party Launch Library 2 (LL2) mission update contained a direct official PDF link. The collector now checks a small fixed set of first-party public sources independently of LL2's update records. **No new official forecast value is displayed unless the actual PDF is downloaded, parsed, and matched to the current LL2 mission and launch date.**

## Source inventory and limitations
Four bounded pages are checked each scheduled run:
- `https://45thweathersquadron.nebula.spaceforce.mil/` (45WS home).
- `https://45thweathersquadron.nebula.spaceforce.mil/pages/launchForecastSupport.html` (45WS forecast support).
- `https://45thweathersquadron.nebula.spaceforce.mil/sitemap.xml` (optional sitemap, only if served).
- `https://www.patrick.spaceforce.mil/About-Us/Weather/` (official parent resource).

These are *discovery attempts, not guaranteed document feeds*. Search/browser checks encountered 403 responses at the government sites, so source accessibility and the existence of PDF links in these pages must not be assumed. The independent unofficial `kscwx.com` archive may be useful background, but its rehosted PDFs and extracted percentages are **not accepted as authoritative** and are never promoted to 45WS official records.

Each HTML or XML page is bounded to 650 KB and 1,000 entries. The collector follows **no arbitrary pages or off-domain redirects**. It only accepts explicit PDF URLs on the exact allowlisted official 45WS assets host/path. It never constructs speculative forecast filenames.

## Association and source policy
1. Download the normal LL2 bounded Florida list to establish current mission identity.
2. Parse publicly linked PDF candidates from these official pages and match a unique, distinctive mission marker (Starlink group, Crew, CRS, NROL, etc.) and the filename's stated launch month/day to the current Florida-local launch target. Date in a filename is only a candidate prefilter, not proof.
3. Check LL2 detailed update links as an *independent fallback* for the same mission.
4. Deduplicate URLs across both routes, prioritize direct official source candidates, and download a maximum of three official PDFs per mission / eight total per hourly run.
5. Use the existing PDF content parser and backend's independent official host, mission ID/identifier, valid-date, issuance, bytes digest and probability extraction checks. Do not infer PoV from any search snippet, source page, LL2 comment or unofficial archive.
6. Persist a constrained discoveryRoute per report (`45ws-public-page` or `ll2-update-link`) plus source-specific health in the existing Postgres ToolState. Rechecking the same exact official PDF refreshes its evidence time without generating a spurious forecast revision.

## Monitoring and user-visible behavior
Source-health entries distinguish a page unavailable from a page successfully checked with no PDF links. The national and Florida launch pages say when first-party checks were blocked or returned no documents, and identify the discovery route when a verified forecast exists. A blocked first-party source does not erase an independently confirmed PDF from the LL2 fallback; an old or unverified PDF cannot become a current PoV.

The hourly GitHub Actions monitor still uses GitHub OIDC authorization and does not require user secrets. The additional official-source requests add small bounded upstream load. `scripts/space_coast_weather_discovery.py` contains source matching and fixed source IDs, and `tests/test_space_coast_weather_discovery.py` checks blocked-source status, spoofed hostnames, wrong missions/dates, duplicate PDFs, direct-only discovery and preserved LL2 fallback. A separate PR test workflow runs the Python PDF/discovery tests and JS backend regression tests before release.

## Follow-up
If these first-party URLs continue returning 403s or contain no PDF links, the next source investment should be **finding a verifiable, licensed, machine-readable first-party forecast index** rather than manufacturing URLs or presenting a mirrored archive as official. The source-health evidence gathered here will quantify this gap.
