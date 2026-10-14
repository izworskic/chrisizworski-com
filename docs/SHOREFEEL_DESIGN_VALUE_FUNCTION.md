# ShoreFeel design value function

The design is scored, not argued about. `scripts/shorefeel-design-benchmark.cjs` opens the Traverse City and
Grand Haven pages in a real browser at 390x844 and 1280x800 and computes

    V = sum(w * s)      pass: V >= 0.85 at every viewport and every hard gate holds

| w | dimension | measures |
|---|---|---|
| .22 | answerSpeed | the water temperature ends within 30% of the screen (0 past 85%); type big enough to be the answer |
| .12 | answerComplete | number, plain-word band, scale marker, source and time all visible without scrolling |
| .16 | forecastReach | the beach forecast starts on the first screen (0 at 2.5 screens down) |
| .14 | calm | 70 words or fewer on the first screen (0 at 200); extra notice boxes cost |
| .08 | hierarchy | one dominant element, 5x the median type |
| .10 | ergonomics | 44 px tap targets, contrast 4.5 (3 for large text), no sideways scroll |
| .10 | stability | layout shift after data loads; nothing injected by a third party in the first 1.2 screens |
| .08 | degraded | with no reading and no forecast the hero stays short and still says why |

Pages scored: Great Lakes, Lake Michigan, Traverse City, Grand Haven. On the two lake pages, which have no beach
forecast, forecastReach scores a visible path to the beach pages instead. The Great Lakes page answers with five
numbers, so there each must be at least 28 px (phone) / 44 px (desktop) and they must be the largest type on screen,
instead of one number dominating at 56 / 72 px. Added Oct 14 after the hub pages regressed unmeasured.

Hard gates (a failure caps V at 0.5): source and time visible on the first screen; the "not a beach thermometer"
caveat is in the page; any forecast shows a range; no sideways scroll at 320 px.

Run it against the real site, with real ads, to see what visitors see:

    node scripts/shorefeel-design-benchmark.cjs --url=https://chrisizworski.com --inject-forecast

## Baseline (live site, Oct 14 2026, before the overhaul): V = 0.33 to 0.39
Google Auto ads injected a 390 px (phone) / 280 px (desktop) unit inside the hero above the temperature.
Phone hero 1,199 px tall, temperature ends at 772 of 844 px, source and time below the fold, forecast starts
at 1,781 px, layout shift 0.35, nav links under 44 px, band labels at 4.0:1 contrast.

## What the research said
- Water-sport condition apps put the single decision-driving value first, encode state in colour and not only
  numbers, use 600+ weight for key values, scroll a horizontal time strip, keep warnings clear but not alarming.
- Dark Sky opens on now and the next hours at your location, replaces false precision with ranges and
  categories, and uses almost no text.
- Apple Weather scales range bars to a shared axis so days compare without reading every number.
- The NWS West Michigan beach page leads with the actionable forecast and has no water-temperature section.

## Design moves
1. The hero is coloured by the water: cold-shock blue, cold teal, cool green, warm amber, slate when unknown.
2. A thermometer fill replaces the multi-colour scale. Sources and the caveat sit behind "How we know".
3. The forecast is a ribbon chart (range over best guess, 48 h) with Now, Tomorrow and In two days beneath.
4. Photo, breadcrumbs and skip link leave the hero. Nav targets are 44 px.
5. Auto ads are excepted on these pages (`config/in-article-ads.json` pageExceptions) until AdSense
   "Excluded areas" protects the hero. Revisit by removing the exception once that is configured.
