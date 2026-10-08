# Flight Tracker assignment resilience

The scheduled-flight tracker uses FlightStats as its primary assignment source.

For resilience:
- if FlightStats is unavailable, the tracker checks the public Flightradar24 flight-history page through a server-readable text mirror and accepts a tail only when date + flight + origin + destination all match exactly;
- PlaneMapper is a tertiary fallback only when its exact dated route row itself contains a registration; it never borrows the aircraft from an adjacent leg;
- the current occurrence embedded on the FlightStats base page can satisfy assignment lookup when the secondary occurrence-detail page is unavailable;
- successful assignments and route choices are cached in Upstash Redis for 18 hours and may be used as clearly labeled last-confirmed data during a transient source outage;
- direct ADS-B fallback checks marketing and known regional operating callsigns (for Delta, DAL / EDV / SKW) and reports every callsign checked;
- source outage and "scheduled but not airborne yet" are separate traveler-facing states.

This design preserves the deterministic V2/V3 aircraft-state reconciliation and never invents a tail, route, gate, or live position.
