---
name: web-quality-accessibility
description: "Check a page against WCAG 2.2 AA with automated tools plus the manual checks they cannot do: keyboard, focus, target size, maps with list alternatives, charts with tables and live updates. Use when a tool, map, chart or form changes, or when asked to check accessibility or compliance."
---

# Accessibility

Automated tools find only part of the problems. A clean axe run means "no automated failures found", never "WCAG compliant". Many visitors use these tools on a phone, outdoors, in glare or with gloves.

## 1. Automated pass

Run axe-core in Playwright (`playwright-browser-qa`) on each important state at 390 px and 1280 px, plus the Lighthouse accessibility category. Fix every failure. Record rule ids.

## 2. Manual pass (required)

| Check | WCAG 2.2 | How |
| --- | --- | --- |
| Every control works by keyboard, in a sensible order, with no trap | 2.1.1, 2.1.2, 2.4.3 | Tab through the whole journey without a mouse |
| Focus is visible and not hidden behind sticky headers or ads | 2.4.7, 2.4.11 | Watch the focus ring on every stop |
| Skip link to the main answer | 2.4.1 | First Tab stop |
| Touch targets at least 24 by 24 CSS px, or spaced so they do not overlap | 2.5.8 | Measure map buttons, chips and close icons |
| Anything done by dragging also works with single taps or buttons | 2.5.7 | Map pan and zoom buttons; sliders with steppers |
| Text contrast 4.5:1, large text 3:1, icons and control borders 3:1 | 1.4.3, 1.4.11 | Check on the actual background, including over photos |
| Works at 200 percent zoom and reflows at 320 px wide without sideways scrolling | 1.4.4, 1.4.10 | Browser zoom and a narrow window |
| Images have alt text that says what matters; decorative ones are empty | 1.1.1 | Read the alt attributes |
| Form fields have visible labels; errors say what is wrong and how to fix it | 3.3.1, 3.3.2, 3.3.3 | Submit bad input |
| Data that updates (a live reading, a filter count) is announced politely | 4.1.3 | `aria-live="polite"` on the result region, tested with a screen reader |
| Motion respects reduced-motion settings; nothing flashes | 2.3.1, 2.3.3 | `prefers-reduced-motion` |
| Page language set; headings in order; one main landmark | 3.1.1, 1.3.1 | Read the outline |

Test with one screen reader at least (VoiceOver on iPhone or NVDA on Windows) for the main journey.

## 3. Maps and charts

- Every map has a list or text alternative with the same places and facts, reachable without the map. A marker that only a mouse can open fails.
- Every chart has a data table or a text summary with the key numbers, and color is never the only signal.
- Map controls have accessible names ("Zoom in", not "+").

## Output

Automated results with rule ids, the manual checklist with pass, fail or not checked for each row, the screen reader tested, and the fixes. Never write "compliant"; write what was checked and what was not (NOT VERIFIED).

## Boundaries

Experience OS, Playwright Browser QA and owning-repository tests remain authoritative. Preserve Auto ads, canonical and Person identity. No new dependency beyond the pinned QA tools already in the pilot workflow. Open a PR; do not auto-merge.

## Sources

Adapted from addyosmani/web-quality-skills, `accessibility` (MIT), and the W3C WCAG 2.2 success criteria it cites, rewritten for this repository. Reference only.
