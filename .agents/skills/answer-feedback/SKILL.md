---
name: answer-feedback
description: "Find out whether visitors actually got their answer, with a one-tap yes or no sent as a GA4 event and read back with return-metrics, without collecting personal data. Use when a new or redesigned tool ships, when asked whether a tool is helping people, or before investing more in a tool."
---

# Answer feedback: did the visitor get the answer?

Every QA skill proves a page works. None proves a person got what they came for. This skill adds the smallest honest signal and reads it back.

## 1. The question

- One question directly under the main answer, in plain words that match the tool's job: "Did this answer your question?" or "Did this help you decide?" Two buttons: Yes, No.
- After a tap, thank the visitor in one line and hide the buttons. No pop-ups, no modal, no interruption before the answer is visible.
- Optional: after No, offer three fixed reasons as buttons ("Data looked wrong", "Couldn't find my place", "Too hard to read"). No free-text box.
- Accessible: real buttons with names, keyboard reachable, result announced politely.

## 2. Send it as a GA4 event

Use the GA4 tag already on hub pages (`scripts/inject-ga4.mjs`):

```js
gtag('event', 'answer_feedback', { tool_id: 'beach-conditions', answer: 'yes', reason: '', state: 'selected-place' });
```

- `tool_id` is the registry id from `benchmarks/tool-network-registry.json`.
- `state` describes what the visitor was looking at (default view, a selected place, a stale or failed feed) in a few fixed values, never the place name typed by the visitor or anything that identifies them.
- No email, no free text, no storage of our own, no new endpoint, database or function.

## 3. Read it back

Read through `return-metrics`' existing read-only GA4 path. Report the yes rate with the number of responses and the date window. Below 50 responses in the window, report NOT MEASURED rather than a percentage. Compare equal windows before and after a change; no causal claims from small samples.

Pair the vote with behavior the page already shows: clicks on the handoff, source link or Google Maps link (`tool-handoffs`). A high yes rate with zero onward clicks, or the reverse, is worth a look.

## 4. Things this skill does not add

No session replay or heatmap scripts (third-party code, privacy questions and extra weight on ad pages), no surveys, no email capture, no push or notification prompts (owner rule). Any of those needs a separate owner decision.

## Output

The question wording, the event schema, where it appears, how the read-back works, and the first window's result or NOT MEASURED.

## Boundaries

Experience OS, web-quality-accessibility, plain-voice and owning-repository tests apply. Preserve Auto ads, canonical and Person identity. Do not auto-merge.
