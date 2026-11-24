---
name: editorial-diagrams
description: "On-demand explanatory diagram methods for locks, rivers, ships, weather, ecology and technical systems. Use when a page needs to explain a physical process (lock lifts, river flow, ship routes, weather, ecology) as a responsive HTML/SVG diagram."
---

# editorial-diagrams

Use only when an explanatory diagram answers a question that a map, photo or prose cannot. Adapt ideas from [Diagram Design](https://github.com/cathrynlavery/diagram-design) without vendoring the upstream MIT-licensed package.

1. Name the visitor question, facts, measurements, unknowns and sources. Never invent physical scale or process data.
2. Compare cross-section, side elevation, sequence, time strip, system map, decision flow and layered diagrams. Choose the most explanatory structure, not an automatic house style.
3. Prefer semantic HTML and inline responsive SVG. Provide accessible labels, a textual explanation, keyboard controls and a useful static no-JS state.
4. Motion must be optional, pausable and reduced-motion-aware. Label schematics as schematic and measured drawings as measured.
5. Show sources and observation timestamps beside technical claims. Test comprehension on mobile before decorating.

Examples: Rideau Canal gate and water-level stages; Cuyahoga river-bend vessel orientation; frozen lighthouse ice-formation sequence.

Do not automatically run REA, download upstream code or assume a diagram accurately models navigation.

## Release rules

Read `AGENTS.md`, the owning repository's tests, Experience OS, Experience Investment and Foundry before substantial implementation. This skill is a specialist extension, not a replacement for those systems. Preserve scientific source truth, canonical/Person, Google Auto ads, accessibility, performance and repo ownership. No skill grants permission to install a package, alter deployment, publish, register MCP, scrape private sites or auto-merge.

Compare two materially different approaches, including the smallest capable technology. Explain the specific visitor decision and the tradeoff against two existing site tools. For an implementation, verify at 390px and 1280px, with keyboard, reduced motion, no-JS fallback and real-browser QA where available. Run relevant tests and the full `npm run verify:all` gate. Mark unavailable checks NOT VERIFIED. Do not auto-merge.
