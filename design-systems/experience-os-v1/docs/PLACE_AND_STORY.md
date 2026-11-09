# Place & Story — Experience OS v1.2.1 optional interpretive capability

**Status:** optional, owner-selected supplement · **Pilot:** Lake Superior Circle Tour, three Ontario park stops · **Reviewed:** 2026-11-09.

## Purpose

Give visitors a precise, memorable sense of **where they would be**, without allowing atmosphere to replace the **decision they came to make**. This is a research, photography and editorial quality contract, **not** a new mandatory component, page template, fixed number of photographs, visual style or score. It is useful for real landscapes, heritage destinations, wildlife settings and certain transport experiences; omit it where photography adds no decision value.

**Principle:** standardize the quality, never standardize away the imagination.

## Authoring sequence

1. Identify the visitor's specific decision and existing next action. Do not introduce a gallery ahead of the first useful answer.
2. Research three differentiating place facts using an authoritative land manager, park or local source. Choose a visible, *true* subject rather than interchangeable adjectives.
3. Curate one excellent photograph and one different-scale/context photo only when both are confirmed to depict this exact place. Do not add photos to hit an arbitrary quota.
4. Keep image-level provenance: stable stop ID, exact source page and photographer, license name and URL, date if known, alt text, meaningful caption, dimensions and visible-crop note. The right to reuse a park's official photo is not automatic. Follow [FIELD_GUIDE_V1 PHOTO_STANDARD](../../field-guide-v1/docs/PHOTO_STANDARD.md), including license adaptation terms.
5. Write a restrained interpretive narrative with **landform, experience and meaningful visitor distinction**; avoid first-person visits you did not make, unverified traditions, invented ecology and generic superlatives. Cite the controlling public source.
6. Connect changes in selected destination to title, *matching* photography, caption, narration, visitor choice and return path. Never show a previous destination's image after a new selection. Keep an unresearched destination photo-free.
7. Treat photographs as **archival documentary material**, not today's conditions. Separate sourced access, trail status, permits, weather and boat schedules into the tool's evidence engine.
8. Use lazy loading, meaningful intrinsic dimensions, good responsive crop, legible photographer/license links, keyboard focus, reasonable mobile page depth and a text-only failure state.
9. Check 360, 390, 768 and desktop rendered views, offscreen lazy loading, missing-image and slow-network cases; inspect real loaded photography, not a green image-tag test. Validate rights per image before publication.
10. Measure visitor-initiated source clicks and specialist continuations separately from initial renders and passive scrolling. Never call DOM insertion a photo view or claim a booking/visit conversion.

## Editorial anti-patterns

- Generic panorama falsely labeled as the selected trail, waterfall, ship or island.
- AI-generated destination scene presented as real photography.
- Romantic descriptions that mask actual hiking distance, seasonality, closures or legal access.
- A carousel full of duplicate vistas; credits too small to read, missing licenses, expired image URLs.
- Sharing a forced landscape-hero layout across tools with fundamentally different visitor jobs.
- Making the decision CTA disappear far below several screens of imagery.

## Pilot composition: Circle Tour

The existing first action remains **one approved specialist check** with explicit limitations. Beneath it, the place layer offers two site-exact licensed Commons photographs and a compact interpretive passage for stops **15 Lake Superior Provincial Park, 18 Pukaskwa National Park and 20 Sleeping Giant Provincial Park**. Other stops retain their correct decisions and show no substitute photography. The source data is in `public/assets/circle-tour-place-story-data.js` and the rendering belongs solely to the existing independent bridge.

Review the [pilot evidence brief](../../../docs/experience-briefs/circle-tour-place-story-2026-11-09.md). Licensing and author fields are visible on-page; seasonal photos cannot determine live access.
