# Rocket Launch Live: Rust/WebAssembly migration register
Date: 2026-11-13 · Repository: izworskic/chrisizworski-com

## Goal
Move computational decisions across the national rocket launch tool and six regional pages to audited, reproducible Rust/WebAssembly. Preserve SEO-first static HTML, editorial sources, accessible controls, maps, APIs and advertising. Rewriting source-fetching JavaScript in Rust is not by itself a quality improvement.

## Full seven-page inventory
| Page | Current Rust status | Migration design |
|---|---|---|
| Vandenberg, California | Deployed in PR #1663 | Rust filters and ranks six published viewing candidates, with caution codes. |
| Wallops, Virginia | In PR #1669 | Shared Rust engine for four visitor profiles across three source-linked viewing references; NASA lawn is event dependent. |
| Starbase, Texas | In PR #1669 | Same Rust engine for three visitor profiles across three source-linked place references; park, causeway and lighthouse limits remain distinct. |
| Florida Space Coast | Not migrated | Rust evaluates current NPS/KSC public-viewing evidence, mission-specific restrictions, Playalinda cutoff and stale-source states; unknown must never mean open. |
| National Rocket Launch Live USA | Not migrated | Rust evaluates mission time precision, schedule freshness and user search/region filtering, keeping launchId continuity across regions. |
| Kodiak, Alaska | Not migrated | Rust access gates must not turn a state park or restricted spaceport reference into an authorized spectator venue. |
| Barking Sands, Hawaiʻi | Not migrated | Rust access gates must preserve Navy range restrictions, Polihale closures and maritime source scope without inventing public access. |

## Architecture
- Existing reviewed regional lib source and JSON exporters remain venue authorities. Rust duplicates no geographic coordinates, official status or launch schedules.
- Rust functions are dependency-free no_std compiled with pinned Rust 1.90.0 to wasm32-unknown-unknown, with unit tests and byte-for-byte binary parity.
- A small browser adapter validates ABI, complete manifest site IDs and safety guards before using Rust. Failure falls back to existing JavaScript ordering, static venue cards and Leaflet.
- Keep server API normalization, NASA/NPS/LL2/NWS source freshness, maps, canonical SEO, JSON-LD, ad safeguards and analytics intact until a specifically tested replacement is ready.
- Ranking answers what might suit the visitor. It never authorizes a visit. Only a current authoritative land-manager rule may support permitted access; stale/missing source = verify, never inferred open.
- Keep verified user-visible answers in ordinary server/static HTML for crawlers and visitors with JavaScript disabled.
- Check responsive phone/tablet/desktop behavior; stale, empty, closed, conflicting-source, offline API, unavailable map, invalid launch ID and disabled WebAssembly cases before production merge.

## Release gate
Each guide must demonstrate real user-visible Rust-driven decision logic, exact known-case parity, explicit unknown states, pinned reproducible build and no SEO/ad/map/mission identity regression. Do not call the full launch network migrated until all seven pass this gate. PR #1669 migrates the next two guides incrementally rather than risking the entire source-reconciliation stack in one change.
