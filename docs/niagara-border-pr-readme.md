# Niagara border engine PR verification notes

## Hard safety invariants

- Bridge eligibility is static authority data and is never removed by freshness degradation.
- U.S.-bound waits come from CBP; Canada-bound waits come from CBSA where CBSA publishes the crossing.
- Whirlpool is not treated as an equal-confidence real-time wait source because NFBC says real-time technology is not currently available there.
- A closed or ineligible crossing is never recommended.
- An eligible/open preferred crossing with stale, unavailable, conflicting or context-only current evidence does not trigger a speculative detour recommendation.
- Alternate crossing recommendation requires a fresh, conflict-free comparison and at least the configured 10-minute net benefit after the conservative bridge-switch buffer.
- Bus, tow, pedestrian and bicycle selections never inherit a passenger-car wait as if it were their own measured queue.

## Required gates before merge

1. Niagara targeted tests.
2. Existing border/bridge tests.
3. Full repository test suite.
4. Repository verification gate.
5. Vercel build.
6. Preview API verification against live official sources.
7. 390 px and desktop render inspection with console check.
8. Metadata/canonical/schema check.
9. Existing Michigan/CBBT/Mackinac bridge products remain green.

Do not merge if any required gate is red.
