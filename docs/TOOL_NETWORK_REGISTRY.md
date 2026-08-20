# Tool Network Registry

`benchmarks/tool-network-registry.json` is the canonical internal map of how the site's tools fit together.

`benchmarks/tool-network-actions.json` is the operational overlay for relationships and experiments that are actively being executed. The report and benchmark merge both files. Historical search evidence stays in the canonical registry; temporary tests and promotion gates stay in the action overlay until they earn a permanent registry change.

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

## Active actions and experiments

Use `benchmarks/tool-network-actions.json` when the registry has already made a decision and execution is underway.

An active experiment must define:

- a stable experiment ID and the candidate it tests;
- the surfaces where the treatment appears;
- the existing tools it connects;
- a hypothesis;
- explicit search-evidence, network-evidence, and cannibalization-safety promotion gates.

A high best-fit score is not enough to create a new canonical URL. If the candidate is evidence-gated, run the contextual test first. Promote it only after its recorded gate is satisfied.

Current example: `fall-river-window-v1` tests the 93/100 Best Fall River Paddle Window candidate inside existing Fall Color and river surfaces. It must earn both distinct Search Console demand and measured network engagement before becoming a standalone tool.

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

1. Read this file, `benchmarks/tool-network-registry.json`, and `benchmarks/tool-network-actions.json` when it exists.
2. Run `npm run report:tool-network -- --focus=<tool-id>` when a specific existing tool is under review.
3. Search the registry for overlapping primary intent and cannibalization groups.
4. Add the proposed node or candidate with a stable ID.
5. Define at least two meaningful connections unless the node is explicitly a leaf.
6. Mark search evidence honestly.
7. If a search experiment is protected, do not alter its title, description, H1, first answer, canonical, structured data, or indexability.
8. If the report says `AMPLIFY + MEASURE`, add useful network handoffs and measurement before search-facing repositioning.
9. If a priority candidate says `TEST FIRST` or `TEST RUNNING`, do not create a standalone canonical until the promotion gate is satisfied.
10. Run `npm run benchmark:tool-network -- --check` and then `npm run verify:all`.
11. Only ship a contextual handoff if the destination is actually useful from that source surface.

## Measurement model

Keep two layers separate:

- **Search acquisition:** impressions → CTR → landing tool.
- **Network amplification:** landing tool → second tool → third tool / return use.

Cross-tool events should use stable symbolic IDs (`source`, `destination`, `surface`). Do not record precise coordinates, typed addresses/destinations, cookies, local/session storage, or personal identifiers for this purpose.

For contextual experiments, record an exposure event as the denominator and a handoff event as the numerator. This allows a real handoff rate rather than counting clicks without knowing how many users saw the treatment.

## Durability across sessions and agents

The repository is the durable memory for this system. A chat session may end or another agent may enter the repo, but the network model, active experiment state, promotion gates, protected search treatments, benchmark rules, and operating instructions remain source-controlled here.

Agents should recover state from the registry, action overlay, experiment ledger, and current Search Console evidence rather than relying on conversational memory. If a future conversation conflicts with source-controlled current state, verify the repo and newest measured evidence before changing strategy.

## Maintenance

The benchmark checks that the visible `/tools/` catalog remains represented in the registry, all effective relationship targets exist, candidate scoring is internally consistent, active experiment gates are explicit, search owners are unique within cannibalization groups, and the registry remains part of the full release gate.

When the catalog changes, update the registry in the same PR. When fresh Search Console evidence arrives, update only the relevant `searchEvidence` fields; do not rewrite the network merely because a metric moved for a few days.
