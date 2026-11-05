# Pacific Missile Range Facility / Barking Sands Access Atlas — 2026-11-05

## Mission and visitor decision

This is the sixth connected U.S. launch-area specialization. The purpose is to resolve three incompatible-sounding access claims: "the beach is open," "I have a Navy guest card," and "the launch is scheduled." None implies a safe public launch-day spectator site. The live public tool is \`/barking-sands-rocket-launch-viewing/\`; canonical stays on the root site. Hawaiʻi's national launch location is ID **1** and the timezone is **Pacific/Honolulu** (HST year-round). The shared Postgres-based national launch snapshot remains the only calendar.

## Evidence ledger, independently read November 5, 2026

1. U.S. Navy Beach Access: https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/ . It says generally accessible shoreline is open subject to restricted signs, enables walk-in recreation from the north/south boundaries, prohibits entrance beyond designated beach/vegetation line without authorization, forbids vehicles on state beaches, and explicitly allows sudden restrictions due to force protection, range hazards and endangered species. This is a **general published policy** and NOT live gate state.
2. U.S. Navy MWR Guest Pass Program: https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Resources/MWR-Guest-Pass-Program/ . A screened, one-year guest card authorizes specific recreation, generally 05:00-22:00 unless heightened FPCON; no launches, pads or operational ranges. Published application has a $25 background investigation fee (always confirm latest rate). The site presents the policy rather than inventing access availability.
3. U.S. Navy installation: https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/ . Pass and ID 808-335-4221, MWR Guest Pass 808-335-7936, Range Ops Access Schedule 808-335-4229. The site supports military/defense flight and other tests, so an LL2 absence does NOT mean inactivity.
4. Coast Guard **33 CFR 165.1406**, official https://www.ecfr.gov/current/title-33/chapter-I/subchapter-P/part-165/section-165.1406 ; readable https://www.law.cornell.edu/cfr/text/33/165.1406 . Regulatory coordinates use **OHD datum**, defining a conditional maritime zone for **STARS** launches only. Activation and exact timing come from Coast Guard broadcast/local notices. The site shows the regulation as **conditional**, NEVER active/inactive. Other range areas are not mapped.
5. Coast Guard notices: https://navcen.uscg.gov/local-notices-to-mariners-by-cg-district . The official hub is linked; no false real-time check of broadcast activation is claimed.
6. Hawaiʻi DLNR **Important Park Notices**: https://dlnr.hawaii.gov/dsp/important-park-notices/ . As of the latest reviewed November 2026 bulletin, all other Kauaʻi state parks (including Polihale) remain **closed**, notwithstanding nominal hours listed on https://dlnr.hawaii.gov/dsp/parks/kauai/polihale-state-park/ . Source checked on 2026-11-05. State-park access and recreation bookings do not override recovery closures.
7. DLNR park description says Polihale is approached by an unimproved, flood-prone and sandy road, often restricted by rental vehicle agreements. The site does not give road directions to a closed park.
8. General name coordinate (Polihale park vicinity ONLY, not entrance) used from https://kauai.uscoast.info/POI/Parks/Polihale-State-Park/1677418/ . Approximate PMRF coastal range reference inherited from national launch atlas; it is not a pad, gate, entrance, or legal public approach.
9. Image: actual archival June 2024 Department of Defense photo at PMRF, source https://www.defense.gov/News/Releases/Release/Article/3821376/dod-completes-flight-test-of-hypersonic-missile/ ; no attribution to an upcoming mission.

## Product boundaries

- Dynamic official source desk \`/api/pmrf-official\` polls fixed allowlisted public Navy beach/guest-card and Hawaiʻi DLNR park-notice pages server-side with short timeouts and bounded HTML responses. Each source independently degrades to \`source-unavailable\` and never becomes a "GO" or active beach closure indicator.
- Interpretive map offers approximate military range and *closed* park reference plus the regulation's OHD polygon. Map is optional; labels and trusted source links are in static HTML. No map-based directions, guessed coastal trailheads, surveyed launch pads, flight-path models, nautical navigation, or visitor GPS.
- National mission identity is preserved in both directions by UUID handoff; the launch selector handles absent, stale, partial, date-only, expired UUID and provider failure without a false countdown.
- Design is specific to Kauaʻi: archival military flight photograph, deep-ocean and sand color palette, admission personas, independent source confidence, and no presumption that visitors should drive toward the Navy range.
- Existing ads, global page structure protections, server scheduling, Redis, Supabase, and other national regions are unchanged.
- Discovery: single main sitemap entry with true 2026-11-05 lastmod; guide collection, national region inspector and route rewrites linked.

## Launch gates and expected follow-up

1. Run \`node --test tests/pmrf-barking-sands.test.js\` and existing national/Florida/Kodiak regressions.
2. Run full 59-step repository gate, SERP length, canonicals and sitemap freshness plus Vercel preview deployment.
3. Check 360/390/768/1440 rendering, source failure states, missing LL2, expired deep link, keyboard use and map CDN/CARTO fallback.
4. Confirm production GET page, canonical, sitemap entry and Navy/DLNR links. Do not report visitor CTR improvements before real GSC data.

Potential later value: an official machine-readable PMRF/Coast Guard *event-specific* access/closure feed, if one is actually available. Do not infer it exists from generic Navy beach policy or persistent Coast Guard regulations.
