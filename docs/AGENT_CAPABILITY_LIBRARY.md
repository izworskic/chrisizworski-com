# Opt-in agent capabilities

These are five optional specialist Agent Skills layered on Experience OS, Experience Investment, Experience Foundry and source/QA governance. They are **not five mandatory steps**. No package, external CLI, MCP server, production service or public page is installed by this change.

| Skill | When to use | Original output | External source |
| --- | --- | --- | --- |
| `editorial-diagrams` | Explain a physical process | Responsive HTML/SVG explanation | [Diagram Design](https://github.com/cathrynlavery/diagram-design) (MIT) |
| `design-reconnaissance` | Compare public design examples | Dated visual audit and new design options | [Dembrandt](https://github.com/dembrandt/dembrandt) (MIT) |
| `interactive-2d-scenes` | Motion teaches a system or scales dense scenes | SVG/Canvas/PixiJS justification and fallback | [PixiJS](https://github.com/pixijs/pixijs) (MIT) |
| `public-data-scout` | Validate a new real-world feed | Source ledger, tested failure modes, accuracy boundary | [public-apis](https://github.com/public-apis/public-apis) discovery directory |
| `stitch-concept-review` | Owner explicitly requests Stitch | Two different UX directions with design review | [Google Stitch skills](https://github.com/google-labs-code/stitch-skills) (Apache-2.0) |

Each `SKILL.md` is copied identically to `.agents/skills`, `.claude/skills` and `.github/skills` for Codex, Claude Code and Copilot. Sources are credited as references, not vendored packages or executed instructions.

## Sample invocation

- "Use editorial-diagrams to explain the Rideau Canal lock sequence."
- "Use design-reconnaissance to compare the Circle Tour to three exceptional map-first experiences."
- "Use interactive-2d-scenes to choose SVG or Canvas for Cuyahoga freighter navigation."
- "Use public-data-scout to validate Great Lakes beach water observations."
- "Use stitch-concept-review to explore two winter-desk concepts with Stitch, if connected."

## Tool and account boundaries

ChatGPT already has separate GitHub, Figma and Vercel capabilities in some connected environments. The optional Firecrawl connection can assist research **only after the user authorizes it**. Neither Firecrawl nor Stitch is automatically enabled for production use. Penpot and REA remain explicitly on-demand. Claude/Gemini terminal agents, n8n, Dify, OpenUI and MinerU are not introduced by this change.

## Required review

Preserve owning repo and extraction boundaries, science/source rights, original visual identity, canonical Person data, Auto ads and no-generated-evidence rule. Use the smallest capable frontend; do not default to React, PixiJS, WebGL or an external AI service. Run mobile/desktop browser acceptance and `npm run verify:all` for subsequent production builds. Report checks that did not run as NOT VERIFIED. Open a PR; do not auto-merge.
