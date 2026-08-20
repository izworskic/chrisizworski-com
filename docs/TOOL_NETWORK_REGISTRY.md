# Tool Network Registry

`benchmarks/tool-network-registry.json` is the canonical internal map of how the site's tools fit together.

## Why it exists

Do not treat a new tool as an isolated build. Before adding or materially repositioning a tool, use the registry to answer:

1. What distinct search/user decision does this tool own?
2. Which existing tools naturally feed it?
3. Which tools should it feed next?
4. Is it a flagship, evidence source, explanatory support page, hub, or leaf?
5. Does another page already own the intended query?
6. How will we measure whether the relationship is useful?
7. Does the proposed build clear the best-fit threshold?

## Required node fields

Each tool node has a stable symbolic `id`, canonical URL, optional aliases, kind, cluster, primary intent, season months, geography, personas, network role, search treatment, and search-evidence status.

Search evidence may be `measured`, `measured-query`, `known-demand`, `growing`, `preseason`, `new`, or `unknown`. Unknown means unknown; do not manufacture a baseline.

## Relationships

Relationships are directed. `from` is the current visitor context and `to` is the next useful owned decision. Strength is one of:

- `essential`: the next tool completes the task or owns the operational answer.
- `strong`: routinely useful and suitable for prominent contextual placement.
- `optional`: useful for a subset of visitors; keep secondary.
- `experimental`: plausible but should earn prominence through measured behavior.

Relationship types describe *why* the handoff exists: `decision-next`, `authority-to-tool`, `evidence-next`, `regional-handoff`, `seasonal-router`, `content-depth`, etc. Do not add a relationship simply to create internal links.

## Search ownership and cannibalization

`cannibalizationGroups` define one canonical owner for a broad intent and name supporting pages/tools with distinct sub-intents. A new page must not compete with an owner merely to increase page count.

If a new idea overlaps an existing owner, first test whether the existing owner or a contextual handoff can satisfy the demand.

## Best-fit scoring for new builds

Every candidate is scored out of 100:

| Dimension | Points |
| --- | ---: |
| Distinct search intent | 25 |
| Network fit / useful upstream and downstream connections | 20 |
| Unique utility or data advantage | 20 |
| Existing authority + seasonal fit | 15 |
| Measurement plan | 10 |
| Cannibalization safety | 10 |

- **85–100:** priority candidate. Strong reason to build when evidence supports it.
- **70–84:** viable, but improve evidence or network fit first.
- **Below 70:** do not build as a standalone tool yet.

The score is a prioritization device, not a traffic forecast.

## Workflow for any agent adding a tool

1. Read this file and `benchmarks/tool-network-registry.json`.
2. Search the registry for overlapping primary intent and cannibalization groups.
3. Add the proposed node or candidate with a stable ID.
4. Define at least two meaningful connections unless the node is explicitly a leaf.
5. Mark search evidence honestly.
6. If a search experiment is protected, do not alter its title, description, H1, first answer, canonical, structured data, or indexability.
7. Run `npm run report:tool-network` to inspect topology and candidates.
8. Run `npm run benchmark:tool-network -- --check` and then `npm run verify:all`.
9. Only ship a contextual handoff if the destination is actually useful from that source surface.

## Measurement model

Keep two layers separate:

- **Search acquisition:** impressions → CTR → landing tool.
- **Network amplification:** landing tool → second tool → third tool / return use.

Cross-tool events should use stable symbolic IDs (`source`, `destination`, `surface`). Do not record precise coordinates, typed addresses/destinations, cookies, local/session storage, or personal identifiers for this purpose.

## Maintenance

The benchmark checks that the visible `/tools/` catalog remains represented in the registry, all relationship targets exist, candidate scoring is internally consistent, search owners are unique within cannibalization groups, and the registry remains part of the full release gate.

When the catalog changes, update the registry in the same PR. When fresh Search Console evidence arrives, update only the relevant `searchEvidence` fields; do not rewrite the network merely because a metric moved for a few days.
