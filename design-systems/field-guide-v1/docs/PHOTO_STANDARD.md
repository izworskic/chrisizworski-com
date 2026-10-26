# Photographic curation and image rights

## Sourcing order

1. Authentic official park/land-management photography with explicit public-domain or compatible permitted-use statements. **Not all government-affiliated images are public domain**; inspect the exact item.
2. Wikimedia Commons originals with clear file-level author, license and source. CC0/PD, CC BY or CC BY-SA may be suitable **only while meeting the specific license terms**. CC BY-SA requires complying with share-alike when you adapt/distribute an adaptation; don't strip attribution.
3. Explicitly licensed photographer or local tourism assets whose permissions actually cover commercial reuse. Don't hotlink/download arbitrary travel blog photos.
4. If source or rights are unclear, do **not** publish that image. Find another. No AI-generated substitute passed off as a real location.

## Mandatory per-image fields

`placeId, imageURL, sourceURL, photographer, licenseName, licenseURL, alt, cropPosition, captureDate (if known), status`

Example image markup (see starter):

```html
<figure class="fg-photo" style="--fg-image-position:55% 48%">
  <img src="https://.../real-place.jpg" alt="Forest-framed lake overlook"
       loading="lazy" decoding="async" width="960" height="640">
  <figcaption class="fg-credit">Photo:
    <a href="https://commons.wikimedia.org/wiki/File:...">Photographer</a> ·
    <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>
  </figcaption>
</figure>
```

A source citation doesn't grant reuse rights. Preserve original artist and required attribution fields; check license version and link. Label any adapted image as modified when applicable. Photographer credits should be legible and not cover faces/focal features.

## Selection rubric — score 0–5 each

1. **Place certainty:** unequivocally depicts the named destination, not similar scenery.
2. **Desire:** would make a traveler genuinely want to be there.
3. **Legibility:** focal point clear at the actual mobile/card size.
4. **Composition:** purposeful sky/horizon/shore/foreground; no accidental dead space.
5. **Sequence:** visual contrast with neighboring images: forest, rock, river, city, shore.
6. **Provenance:** author/license/source verified and link working.

Reject/research again if any dimension scores below **3**; target total **at least 25/30**. A high score is not permission to use a rights-unclear photo.

## Production check

- Verify URL returns image content (not an access-denied/HTML page), original exists, alt accurately describes it, and credited license matches the actual file.
- Test **every photo** on mobile after scrolling it into view. Below-fold `loading="lazy"` intentionally defers downloads: a screenshot at an arbitrary deep document Y coordinate may show a temporarily blank slot. Test with targeted card/element capture or real scrolling, then give images time to load.
- Keep user-observable fallbacks on image errors; if the CDN is unreliable, serve a rights-permitted derivative locally with the correct credit instead.
- Never call archival imagery “today,” "live" or "current conditions". Crop/caption differences are editorial adjustments, not evidence of conditions.
