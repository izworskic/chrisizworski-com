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

Two opt-in skills complement, not replace, the five existing specialist skills above. On 2026-11-25 they replaced the original eight (`hf-cli`, `huggingface-best`, `huggingface-datasets`, `huggingface-tool-builder`, `transformers-js`, `hf-semantic-discovery`, `hf-visual-evidence`, `hf-forecast-benchmark`); photo QA moved to `photo-sourcing`.

| Skill | When to use | What it actually does |
| --- | --- | --- |
| `ml-justification` | Proposed model, embeddings, semantic search, forecast challenger or browser inference | Offline three-way comparison against no-model baselines, then a go or no-go |
| `hf-hub-research` | Hub model, dataset, license or revision research | Read-only source ledger and an ACCEPT, EXPERIMENT, REJECT or NOT VERIFIED verdict |

All mirrors are identical across three agent harnesses. Upstream source: [huggingface/skills](https://github.com/huggingface/skills). Study [the capability adoption report](HUGGING_FACE_CAPABILITY_ADOPTION_20261122.md) and the relevant SKILL.md before choosing a model. No Hugging Face runtime or paid service is installed. A draft GitHub PR is required; no production deployment or result improvement should be claimed from adding these skills.

**Example requests:**
- “Use ml-justification to test whether local semantic search beats our keyword filters on Adventure Finder.”
- “Use hf-hub-research to check the license and pinned revision of this model before we consider it.”
- “Use photo-sourcing to review confirmed photo assets, not invent destinations.”
- “Use ml-justification for an out-of-time forecast challenger against observed river-stage data.”
