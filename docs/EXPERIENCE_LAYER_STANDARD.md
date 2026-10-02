# Decision Product Experience Layer Standard

## Product rule

**Decision first. Then make the decision tangible.**

The strongest destination tools should feel like places, events, and experiences that happen to contain software. The experience layer is not a tourism article and it must never push the answer below the fold.

Use this sequence:

1. **ANSWER** — What should I do today / when should I target it?
2. **PROOF** — What authoritative rule or live observation controls that answer?
3. **EXPERIENCE** — If I follow the answer, what does the outing actually become on the ground?
4. **UNDERSTANDING** — Why does the place behave this way, and what uncertainty remains?
5. **EXPLORATION** — What is the useful fallback or adjacent opportunity if the primary experience does not line up?

## Experience-layer loss function

Treat every surface as minimizing this weighted loss:

`L = 6D + 6T + 6S + 5O + 4G + 3M + 2P + 2F + 1B`

Where each term is a normalized penalty from 0 (good) to 1 (bad):

- **D — Decision displacement:** experience content delays, obscures, or competes with the primary decision.
- **T — Truth drift:** experiential language is not supported by an authority, first-party visitor source, or stable physical fact.
- **S — Safety / precision overclaim:** the experience layer upgrades uncertain conditions into a guarantee, safe window, or exact cutoff.
- **O — Outcome opacity:** after reading the answer, the visitor still cannot picture what they will see, do, or notice.
- **G — Generic tourism language:** copy could be pasted onto another destination without changing meaning.
- **M — Mobile friction:** the layer creates a wall of cards, excess scrolling, horizontal overflow, or hides the answer on a 390 px viewport.
- **P — Proof distance:** source and uncertainty language are separated too far from the claim they support.
- **F — Fallback absence:** the tool does not tell the visitor what the outing becomes when the headline experience is unavailable.
- **B — Bloat:** long narrative adds reading without improving the decision or the visitor's mental picture.

### Hard gates

`D = 0`, `T = 0`, and `S = 0` are mandatory. A page fails regardless of its total score if any hard gate is non-zero.

### Practical acceptance criteria

- The first interactive result remains the decision, not the story.
- The experience block appears immediately after the decision.
- The experience block contains: **scene**, **how to use today's signal**, **what to notice**, and **fallback**.
- Experience context sources are visibly separate from decision sources.
- No experience copy is allowed to change `decision.status`.
- Mobile layout remains one-column where needed with no horizontal scrolling.
- No generic superlatives such as “must-see,” “hidden gem,” or “perfect day.”

## Oregon Coast pilot

The Oregon Coast opportunity desk is the first implementation of this standard.

### Yaquina Head — official-window experience

- Decision owner: BLM Tidepool Discovery Times.
- Experience: Cobble Beach intertidal life, nearshore seals, lighthouse/headland context.
- If the official source is stale or says no exposure, do not create a tidepool window; shift the outing description to the headland/lighthouse/wildlife experience.
- Preserve exact published window semantics; never repair or reinterpret conflicting times.

### Haystack Rock — authority-threshold experience

- Decision owner: HRAP's published `<= 1.0 ft` tidepool threshold applied to authoritative tide data.
- Experience: exposed pools at the rock, protected intertidal life, seasonal beach interpreters.
- HRAP's visitor guidance may inform arrival behavior (for example, arriving before the predicted low) but it cannot change the threshold classification.

### Hug Point — conservative-access experience

- Decision owner: lower-tide opportunity plus Oregon State Parks caution.
- Experience: rounding the point toward the seasonal waterfall, sandstone caves, tidepools, and historic stagecoach wheel ruts.
- Never publish an exact safe-until time. Lower tide is an opportunity center, not a safety deadline.

### Thor's Well — conditions-only experience

- Decision owner: `RESEARCH_ONLY` until calibration is sufficient.
- Experience: repeated fill / surge / drain behavior in the basalt opening, interpreted through tide and observed marine context.
- Never convert high tide alone, wave height alone, or a single photograph into a production spectacle window.
- Keep spectacle/activity interpretation separate from safety.
