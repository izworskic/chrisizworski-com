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

ChatGPT already has separate GitHub, Figma and Vercel capabilities in some connected environments. The optional Firecrawl connection can assist research **only after the user authorizes it**. Firecrawl and Stitch are not automatically enabled for production use. Penpot and REA remain explicitly on-demand. Claude/Gemini terminal agents, n8n, Dify, OpenUI and MinerU are not introduced by this change.

## Required review

Preserve owning repo and extraction boundaries, science/source rights, original visual identity, canonical Person data, Auto ads and no-generated-evidence rule. Use the smallest capable frontend; do not default to React, PixiJS, WebGL or an external AI service. Run mobile/desktop browser acceptance and `npm run verify:all` for subsequent production builds. Report checks that did not run as NOT VERIFIED. Open a PR; do not auto-merge.


## Hugging Face capability library (added 2026-11-22)

Eight opt-in skills complement, not replace, the five existing specialist skills above.

| Skill | When to use | What it actually does |
| --- | --- | --- |
| `hf-cli` | Investigating the Hugging Face ecosystem | Secure read-only Hub/account/model metadata discovery |
| `huggingface-best` | Selecting a model | Baseline, rights, size and benchmark decision gate |
| `huggingface-datasets` | Evaluating a candidate data corpus | Source/license/freshness/schema audits before data reuse |
| `huggingface-tool-builder` | Repeated Hub research | Bounded, reproducible read-only offline scripts |
| `transformers-js` | Considering JavaScript ML | Model/UX/mobile/download/fallback engineering review |
| `hf-semantic-discovery` | Adventure Finder or similar catalogs | Offline source-card relevance evaluation first |
| `hf-visual-evidence` | Photo-led Field Guide / Foundry work | Source-first offline image QA; no automatic content replacement |
| `hf-forecast-benchmark` | Science/forecast improvements | Out-of-time baseline and model challenger under Python Intelligence OS |

All mirrors are identical across three agent harnesses. Upstream source: [huggingface/skills](https://github.com/huggingface/skills). Study [the capability adoption report](HUGGING_FACE_CAPABILITY_ADOPTION_20261122.md) and the relevant SKILL.md before choosing a model. No Hugging Face runtime or paid service is installed. A draft GitHub PR is required; no production deployment or result improvement should be claimed from adding these skills.

**Example requests:**
- “Use huggingface-best and transformers-js to evaluate local semantic search.”
- “Run hf-semantic-discovery on Adventure Finder, then show what beat our existing filters.”
- “Use hf-visual-evidence to review confirmed photo assets, not invent destinations.”
- “Use hf-forecast-benchmark against historical observed river-stage data.”
