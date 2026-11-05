# Sunshine Skyway Connected State Matrix (2026-11-05)
Selected ID: allowlisted northbound/southbound direction plus vehicle class. Source of truth: FL511 operational snapshot, separately NWS forecast context. No custom map geometry or new photos are added.

| Scenario | Native user action | Expected connected answer and next action | Safety / status | Browser result |
| --- | --- | --- | --- | --- |
| Initial | Open northbound/car | FL511 status, vehicle, NWS forecast, northbound bypass sequence | UNKNOWN until source fetch; no inferred OPEN | NOT MEASURED |
| Alternative | Select southbound/RV | Reversed corridor and RV caution, same official status | No weather-based prohibition | NOT MEASURED |
| Reverse | Choose northbound again | Restored northbound corridor and share URL | FL511 remains road authority | NOT MEASURED |
| No JS | Disable scripts | Static unknown-status message and official FL511 link | Never claims live status | NOT MEASURED |
| No map tiles | Block external imagery | Text route and official FL511 link remain | No unverified route line | NOT MEASURED |
| Stale-data | Missing FL511 feeds | UNKNOWN with official handoff | No optimistic state | NOT MEASURED |
| Slow traffic | Stale traffic speed source | No live slowdown conclusion | Source freshness gated | Unit test |
| No NWS | Forecast fetch failure | Unavailable wind outlook | Weather does not set status | NOT MEASURED |
| No image | Hero background fails | Readable dark gradient and preserved official answer | Existing photo credit retained | NOT MEASURED |
| Keyboard | Use Tab / Enter / arrow keys | Native controls change same answer/route detail | No forced page scroll | NOT MEASURED |

Required capture widths: 360, 390, 768, 1440. Check answer location, overflow, keyboard focus, photo attribution, status, reduced motion, no-JS and responsive source links.
