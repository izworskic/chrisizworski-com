---
name: hydrological-intelligence
description: "Use when analyzing river networks, watershed boundaries, upstream gauge relevance, stage/discharge trends or drainage and flow relationships. Not for simply displaying an unchanged gauge reading."
---

# Hydrological Intelligence

Proposed first pilot: National Rivers. This is an engineering workflow, not an installed runtime or a claim of improved results.

## Workflow

- Read the owning river repository and existing USGS integration first. Record gauge IDs, agency, datum, units, parameter code, time, provisional/revised status, drainage area and reach relation. Stage is not discharge; gauge datum is not depth at a boat launch.
- Compare current reach/gauge mappings to official NHD or successor hydrography and watershed layers. PyNHD can assist source retrieval; PySheds is an offline candidate for DEM flow direction and catchment analysis. Check service coverage, dataset version, terms and terrain resolution; validate against official topology.
- Separate upstream/downstream, tributaries, regulated releases, lake backwater and gauge gaps; never use straight-line closeness as hydrological connectivity. Do not transfer readings across reaches without documented applicability.
- A downstream timing or paddling forecast needs independent observations, validation across flows and uncertainty. Never infer navigability, safe water, flood category or exact local depth from an unvalidated model; link official alerts and gauge statements.
- Deliver reproducible reach fixtures, unit and missing-data tests, source ledger and a descriptive fallback. No new production service or shared logic copied into a sibling repo without its own adoption.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Scope this skill to the authorized task, preserve source rights, canonical Person/URLs, Auto ads, existing dependencies and owning-repository release gates. No new route, cron, paid service, database, push notification, or package install is authorized by loading this skill. Use skill-eval for adoption, compare against baseline, record unrun tests as NOT VERIFIED, and open a reviewed PR; do not auto-merge.

## Upstream references

- [hyriver/pynhd](https://github.com/hyriver/pynhd)
- [pysheds/pysheds](https://github.com/pysheds/pysheds)
- [DOI-USGS/dataretrieval-python](https://github.com/DOI-USGS/dataretrieval-python)

Reference only; no upstream code is vendored. Verify license, maintenance, compatibility and data rights at the selected revision before any implementation adoption.
