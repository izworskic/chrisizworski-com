# The Field Guide Design Standard

## The problem it solves

Travel pages often present long hero photos, generic cards, empty gradients and a map several screens below. They tell users that places exist but don't create desire or help them decide. **FIELD_GUIDE_V1** combines destination-led editorial photography with practical evidence, maps and tools. The image makes you want to go; the data helps you choose when.

**Reference:** https://chrisizworski.com/michigan-destinations/ . Reuse the **principles**, not the exact page.

## Six non-negotiables

1. **Show a place.** Use recognizable, location-accurate photographs, individually art-directed and credited. No synthetic landscapes passed off as place photography.
2. **Keep the top short.** By the end of the first viewport the visitor should see a meaningful choice or immediate way to browse; do not make an enormous decorative hero.
3. **Let the story lead.** A place name, a grounded why-go narrative and one vivid experiential suggestion outrank a density of controls or repetitive "confidence" cards.
4. **Place the map with the story.** When place discovery is the task, make the real map visible early, not after every card. Provide a working non-map path.
5. **One truth per sentence.** Typical seasonal attractiveness, verified access, live conditions and historical reports are different claims. Label them, including observation/source dates.
6. **Give every section a purpose.** No repeated caveat blocks, stacks of fake rankings, dead space, or multiple ads inserted by changing ad code.

## Working color and type tokens

The starter exposes CSS custom properties. Change palettes deliberately by brand and landscape, but preserve strong contrast.

| Role | Initial token | Value |
|---|---|---|
| Background | `--fg-paper` | `#f6f4ed` |
| Surface | `--fg-cream` | `#fffefa` |
| Primary text | `--fg-ink` | `#1c302e` |
| Action green | `--fg-pine` | `#265648` |
| Secondary | `--fg-muted` | `#586d67` |
| Accent | `--fg-terra` | `#995d3f` |
| Dividers | `--fg-line` | `#dcded5` |
| Display | `--fg-display` | Fraunces / Georgia fallback |
| UI and body | `--fg-ui` | DM Sans / system fallback |

The fonts may be remote in the sample; stable local/system fallbacks must work. Do not share or embed unlicensed font files.

## Composition

### First screen
- Shallow editorial hero: short eyebrow; compelling 1–2 line heading; concrete trip promise; one primary action.
- Small, purposeful photo montage (at most three images, each serving a distinct visual role), **not** a full-screen AI-looking background. Target roughly **250–340px imagery on desktop**, **120–180px imagery on mobile**, adapting to content.
- One tap to begin discovery. Put mood/intent/region filters *with* the introduction, not isolated several scrolls below.
- Never trade the user's initial ability to act for ornamental whitespace.

### Story cards
- A **real photograph**, specific place name, geographic label, tight 2–3 sentence why-go, meaningful "the move" (what to actually do), access caveat only when relevant, one specialist-tool link and one official source.
- Desktop: alternating image emphasis, not mechanically equal thumbnails. Mobile: preserve recognizable crop and prioritize clarity over fitting several columns.
- Photo credits are visible, subdued, keyboard-accessible and link to source/license. On image, keep them away from focal subject.
- Don't duplicate the same image across unrelated places. Don't fake ratings, travel times or available parking.

### Map
- Co-locate the map with the destination stories; sticky on wider screens, in natural document order on narrow screens.
- Pins are grounded coordinates or trusted addresses; no approximate invented route metrics.
- Markers and filter results stay synchronized. Avoid flashing icons and whole-country zoom jumps.
- Tile error, missing permission and no JavaScript have readable text/list fallbacks.

### End section
- 2–4 distinct seasonal or tool handoffs. No repeated “Explore / Discover / Learn More” fragments after every section.
- End with a grounded invitation, provenance and safety distinctions rather than an SEO-stuffed footer.

## Responsive & accessibility rules

- Check at **390×844** mobile, **768×1024** tablet and **1366×900** desktop. Check a second mobile width around 320–360 for overflow.
- No sideways scroll; controls must be reachable with thumb/touch and work with keyboard.
- Semantic headings; a unique H1; a skip link; explicit form labels; photo alt text describing the scene, not keyword repetition; live region for result changes; map text alternative.
- Respect `prefers-reduced-motion`. Avoid parallax, auto-rotating hero carousels or distracting effects.
- Images use `object-fit:cover` with per-image `--fg-image-position`; do not assume 50% center is correct for every destination.
- Lazy-load below-fold photos but verify with *element-targeted* screenshot/scroll so a full-page capture doesn't falsely classify unrequested images as broken.

## Contrarian review

Before shipping ask: "Would someone visit this place because of this page? Can they decide *today* without being misled?" If the image is generic, hero dominates the first screen, the map is ornamental, or cards feel mechanically cloned, revise the composition rather than rewording headers.
