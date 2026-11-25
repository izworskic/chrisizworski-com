---
name: tool-handoffs
description: "Link single-purpose tools into one trip: hand a visitor from one tool to the next useful owned decision, carrying the same place and date, using stable place IDs. Use when a tool should send visitors to another tool, when adding places that other tools also cover, or when asked to connect or cross-link tools."
---

# Tool handoffs: one trip across single-purpose tools

The owner builds single-purpose tools first and links them later. This skill does the linking. The network already decides which tool should feed which: `benchmarks/tool-network-registry.json` holds 140 tools and 290 directed relationships (`docs/TOOL_NETWORK_REGISTRY.md`). A handoff turns one of those relationships into a link that opens the next tool on the visitor's own answer.

## 1. Only registry-backed handoffs

Roll out handoffs one tool per PR, never all tools or relationships at once. Follow `change-intake`: extend the existing PR for that tool if appropriate, verify its receiving links and context, then consider the next tool.

- Add a handoff only for a relationship in the registry, `from` the current tool `to` the next decision. If the relationship is missing, add it to the registry in the same PR with its `type`, `strength` and `reason`.
- `essential` and `strong` relationships may be prominent, next to the answer. `optional` ones stay secondary. `experimental` ones go through `benchmarks/tool-network-actions.json` and earn prominence through measured clicks.
- No blanket footers that link every tool to every other tool. Each handoff says why the next tool matters in a short phrase ("Check the launch ramp before you go").

## 2. Carry the visitor's context

- A handoff link carries what the visitor already chose: place, date and mode, as URL parameters the receiving tool reads (`?place=ID&date=2026-07-04`).
- The receiving tool opens on that place and date if it covers them, and says so plainly if it does not ("No ramp data for this beach; here are the nearest three").
- Parameters never create new indexable pages; the canonical stays the tool URL.

## 3. Stable place IDs

- A place that more than one tool covers gets one stable ID, reused everywhere. The ShoreFeel unified beach registry (`docs/SHOREFEEL_UNIFIED_BEACH_REGISTRY_20261124.md`) is the model: each source keeps its own key and links to the shared ID.
- Never invent a second ID for a place another tool already names. Look it up first.
- A new shared place list for a whole category is its own reviewed PR with source records, not a side effect of a handoff.

## 4. Optional trip memory

If a visitor saves places, use `my-spots-offline` (on the device only). No accounts and no server-side trip storage.

## 5. Measure

Count handoff clicks with the existing GA4 setup (an event with `from`, `to` and `relationship type`). Report click-through with its window and sample size. A handoff nobody uses gets demoted, not repeated.

## Output

The registry relationships used or added, the link copy, the parameters and how the receiving tool handles them, the place IDs used, and the measurement plan. Unchecked behavior NOT VERIFIED.

## Boundaries

Each tool's own repository owns its code; a handoff into an extracted tool needs that repository's reviewed change. Circle Tour publication rules (`build-circle-tour-network.mjs --audit`) still apply. Preserve canonical and Person identity and Auto ads. No new route or function. Do not auto-merge.
