# Rocket Launch Live: launch-origin icons across six coasts
Date: 2026-11-07

## Implementation prompt
The visitor needs to see where each scheduled rocket launches, not confuse a viewing site marker with the pad. Implement one shared rocket-icon component across the national map and California, Florida, Texas, Virginia, Alaska and Hawaii regional maps. Every returned mission must have a matching rocket marker or bounded regional fallback; multiple missions sharing a pad are grouped. Marker selection must update the exact launch picker and existing mission-specific decision. Use the third-party scheduled pad latitude/longitude only if inside a defensible region envelope; otherwise show a dashed approximate region icon and say explicitly that the pad is unverified. National low-zoom groups by coast; zooming reveals individual source-derived pads. Restrict no visitor directions to launch sites, no trajectory inference, no new live launch API calls, no asserted spectator access. Existing viewing/parking markers, CARTO fallback, mobile behavior, canonicals, ads and Postgres source cache remain unchanged. No Redis or Supabase.

## Acceptance and release
Run npm run verify:all, the existing rocket regional browser QA workflows, and Vercel preview before merge. Check all six regional map page links, national grouped/shared-pad marker selection, no-GPS fallback, stale/unavailable schedule behavior and mobile card-to-map continuity. Verify the live asset after merge rather than assuming deployment is complete.
