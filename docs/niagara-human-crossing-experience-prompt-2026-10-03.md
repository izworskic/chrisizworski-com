# Niagara Border Crossing — Human-First Experience Rebuild Prompt

## Mission
Rebuild the traveler-facing Niagara border-crossing page so a person can understand what is happening now, picture the crossing, and know what to do next without first learning how the product works.

The backend decision engine is already working. Preserve it.

## Reference products
Inspect and borrow the strongest product patterns from:

1. `/mackinac-bridge-live/`
   - direct answer before machinery
   - personalized traveler question
   - current-condition card
   - visual/current evidence near the decision
   - physical instructions: what happens, where to go, what to do
   - authority/methodology pushed behind the traveler experience

2. `/michigan-border-wait-times/`
   - side-by-side crossing choice
   - direction and traveler controls
   - clear separation of border delay from approach conditions
   - cameras/history as action-oriented supporting evidence

Do not copy either page mechanically. Use their product logic to make Niagara feel native to Niagara.

## Primary traveler question
> Which Niagara crossing should I use right now, what is happening there, and what will the crossing actually be like for me?

## Hard constraints
- Do not rewrite the backend comparison rules.
- Do not weaken eligibility, restriction, freshness, conflict, or authority logic.
- Do not turn operator traffic into CBP/CBSA wait time.
- Do not invent approach travel times.
- Whirlpool remains NEXUS-only and lower-confidence where the operator says real-time technology is unavailable.
- Keep U.S.-bound and Canada-bound evidence separate.
- Unknown/stale/unavailable must remain visible as such.
- Preserve canonical/SEO metadata and accessibility.

## Experience hierarchy
### 1. First mobile screen — What should I do?
Show only what changes the immediate decision:
- direction
- traveler type
- natural corridor / bridge
- decision headline
- recommended bridge
- current border delay
- comparison to realistic alternates
- freshness

Do not lead with source-health, methodology, confidence architecture, or product explanations.

### 2. Immediately after — What is happening there?
Build a live-reality strip for the recommended/focus bridge:
- border-processing delay from the controlling border agency
- operator traffic/plaza context when available
- current approach-road context when available
- active weather warning count/status
- toll for the selected direction
- crossing hours / eligibility cue

Label different kinds of delay honestly.

### 3. Then — Put me there
Create a bridge-specific journey card: “If you take [bridge] right now.”
Explain the trip as a sequence:
1. Approach — which corridor feeds the bridge.
2. Plaza — what the current wait/operator state means before inspection.
3. Crossing — what kind of crossing this is and the key rule for this traveler.
4. Exit — where the crossing naturally puts the traveler on the other side.

Provide strong actions:
- open live/official camera
- open bridge/operator traffic
- open official 511 map

Use a real Niagara bridge photograph as atmosphere, not decoration, and never imply a photo is live unless it is live.

### 4. Then — Compare all four bridges
Retain the strong Detroit-style side-by-side decision surface, but make each card human:
- current wait/status
- what the bridge is for
- who should/should not use it
- route/corridor
- switch penalty only when it changes the decision

Avoid internal terms like “proof layer,” “guardrail” and “authority hierarchy” in the main experience. Translate them into traveler language.

### 5. Supporting layers
After the trip experience, show:
- approach incidents/camera context
- weather alerts
- vehicle/traveler eligibility and tolls

Put source health and methodology in compact disclosure/details near the bottom.

## Language rules
Prefer:
- “Stay with Rainbow Bridge.”
- “Border wait: 1 min.”
- “The bridge operator is also reporting no delay at the plaza.”
- “You’ll approach from I-190 and come off toward Highway 420.”
- “Peace is reporting no delay, but the drive south is not worth leaving your Niagara Falls route.”

Avoid:
- “Proof → Experience → Understanding”
- “The engine adds a conservative route-switch guardrail…”
- “human interpretation of deterministic output”
- long explanations of why the product is defensible before the traveler gets the answer

## Mobile benchmark
At ~390 px, before the user has scrolled through a full viewport, they should be able to answer:
1. Which bridge should I use?
2. What is the reported delay?
3. Is my traveler type allowed?
4. Is another bridge meaningfully better?

Within the next two viewport lengths they should understand:
5. What will the approach/crossing feel like?
6. What should I check or do before committing?

## Value function
Maximize:
- decision clarity
- sense of place
- actionable traveler guidance
- honest live context
- fast comparison
- trust from specific, concrete language

## Loss function
Hard failures:
- recommendation logic diverges from backend
- stale/unavailable becomes a confident live answer
- wrong traveler is sent to an ineligible crossing
- operator traffic is mislabeled as customs wait
- mobile first screen is dominated by explanatory copy

Major losses:
- source-health/methodology appears before traveler reality
- cards describe the product instead of the crossing
- repeated caveats bury the action
- bridge-specific experience is generic enough to fit any bridge

## Verification
Before merging:
- run the full repository gate
- verify Canada-bound passenger flow live
- verify U.S.-bound passenger flow live
- verify NEXUS/Whirlpool behavior
- verify commercial/Rainbow exclusion
- verify source failures still degrade safely
- verify 390 px hierarchy and no horizontal overflow
- verify current page no longer leads with “Proof / Experience / Understanding” or source-health exposition
- verify visible page tells a traveler what to do and what happens next
