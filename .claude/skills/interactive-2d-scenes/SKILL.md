---
name: interactive-2d-scenes
description: "On-demand SVG, Canvas and PixiJS technology selection for meaningful animated 2D explanatory tools. Use when choosing SVG, Canvas or PixiJS for an animated or dense 2D scene, such as ships, locks or maps in motion."
---

# interactive-2d-scenes

Use for genuinely interactive 2D scenes such as freighter turns, lock operation or system simulations. This is a technology-selection skill, not a PixiJS dependency. Consult maintained [PixiJS](https://github.com/pixijs/pixijs) documentation and its own skill before authoring PixiJS v8 code.

Choose progressively:
- Semantic HTML + SVG for markers, diagrams, silhouettes, annotated scenes and most vessel-type icons.
- SVG + CSS for small state transitions with reduced-motion support.
- Canvas 2D when dynamic geometry or large drawn sets justify it.
- PixiJS only when measured rendering demands or specialized layered animation justify its library and GPU costs.

Keep actual/source measurements independent of rendering. Label demonstrations as simulated, not live AIS or navigational guidance. Supply a data/source timestamp separately when any real feed is involved. Provide pause/replay, keyboard and touch controls, textual interpretation, resize behavior, static fallback, throttling and cleanup. Never allow a canvas to cover map controls or Auto ads.

Examples: Soo Locks class-specific vessel silhouettes should usually stay SVG; a Cuyahoga S-bend motion laboratory might justify Canvas after a benchmark; Rideau lock water-level states remain readable when motion is off.

## Release rules

Read `AGENTS.md`, the owning repository's tests, Experience OS, Experience Investment and Foundry before substantial implementation. This skill is a specialist extension, not a replacement for those systems. Preserve scientific source truth, canonical/Person, Google Auto ads, accessibility, performance and repo ownership. No skill grants permission to install a package, alter deployment, publish, register MCP, scrape private sites or auto-merge.

Compare two materially different approaches, including the smallest capable technology. Explain the specific visitor decision and the tradeoff against two existing site tools. For an implementation, verify at 390px and 1280px, with keyboard, reduced motion, no-JS fallback and real-browser QA where available. Run relevant tests and the full `npm run verify:all` gate. Mark unavailable checks NOT VERIFIED. Do not auto-merge.
