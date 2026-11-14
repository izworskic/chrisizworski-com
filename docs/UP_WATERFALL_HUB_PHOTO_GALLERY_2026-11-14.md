# Source-verified waterfall photographs on the hub
Published change candidate: 2026-11-14.

## The problem
The U.P. waterfall explorer hub had zero photograph elements. All 33 verified waterfall pictures were confined to individual guide pages, leaving first-time visitors with a text-only introduction to an otherwise visual destination.

## The change
A compact, three-photograph gallery follows the main introduction and before the interactive map. Each image and label opens the actual named waterfall guide, not an unrelated website or a generic landing page. Bond, Miners and Spray Falls represent a cascading river waterfall, shaded sandstone gorge and Lake Superior cliff plunge.

- Image URLs, authors, licenses and exact source links are sourced from the existing `data/up-waterfall-photo-provenance.json` roster.
- In this gallery only, previews use responsive CSS cropping, identified honestly in the visible note; their original aspect-ratio images remain uncropped in the individual guides.
- Every image has correct name-specific alt, a visible photographer/source citation and license link.
- Mobile shows a horizontally scrollable, snap-to-photo strip rather than stacking three tall pictures and moving the trip-planning map far down the page.
- Miners Falls supplies an accurate Open Graph and large social-preview photograph for shared hub links.
- Hub JSON-LD dateModified and matching sitemap lastmod become 2026-11-14.

## Boundaries
No existing waterfall source evidence, verified visitor access, route, Rust engine, map, ad slot, ad script, monetization setting, canonical URL, title, meta description, filters or sitewide styles were changed. The gallery adds no unsafe location or parking assertion. These are historic photographs, not live conditions.

## Checks
Require all existing repository tests, Rust source/parity gate, responsive waterfall browser smoke, sitemap/SEO surface guard and Vercel preview success. Post-deploy verify the hero gallery appears above the map and every guide and source link loads.
