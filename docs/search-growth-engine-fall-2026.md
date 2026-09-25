# Search Growth Engine — Fall 2026

## Current mode: protect the winners

Fall Color has moved out of broad expansion mode. The statewide hub and three destination pages now have enough measured search traction that the priority is to preserve ownership, concentrate contextual authority, and avoid diluting the cluster with additional fall-color canonicals.

This document supersedes the earlier "amplify the cluster" posture for Fall Color.

## September 25, 2026 Search Console evidence

Source: comparable 28-day Search Console exports supplied by the site owner on September 25, 2026.

### Statewide owner

- `/fall-color/`
- Impressions: **4,997 → 7,581** (**+76%**)
- Clicks: **114 → 190**
- Average position: **10.67 → 8.80**
- Action: **PROTECT**

### Proven destination owners

| Canonical | Impressions | Clicks | Average position | Action |
| --- | ---: | ---: | ---: | --- |
| `/fall-color/porcupine-mountains-fall-color/` | 2,003 | 67 | 6.20 | PROTECT |
| `/fall-color/tunnel-of-trees-fall-color/` | 2,012 | 64 | 6.03 | PROTECT |
| `/fall-color/mackinac-island-fall-color/` | 1,346 | 40 | 6.20 | PROTECT |

Mackinac Island alone increased from **279 → 1,346 impressions** since the prior 28-day export. That growth is now material enough that the page should be treated as a proven destination owner rather than an experimental support page.

## Search ownership

The canonical ownership model remains:

1. **Michigan statewide fall-color map / current statewide conditions / peak forecast** → `/fall-color/`
2. **Porcupine Mountains fall color** → `/fall-color/porcupine-mountains-fall-color/`
3. **Tunnel of Trees fall color** → `/fall-color/tunnel-of-trees-fall-color/`
4. **Mackinac Island fall color** → `/fall-color/mackinac-island-fall-color/`

The statewide map remains the single statewide canonical. Destination pages own their location-specific intent. Supporting pages may reinforce these owners but must not restate the same primary intent as a competing canonical.

## Operating rules

### 1. Freeze the proven search shells

For the four protected owners, do not casually change:

- `<title>`
- meta description
- H1
- canonical
- indexability
- the immediate search-intent answer

Reliability, factual, accessibility, data-quality, safety, and obvious UX fixes remain allowed. Search-facing rewrites require fresh evidence that the current treatment is failing.

### 2. Stop broad Fall Color page expansion

Do **not** create another Fall Color canonical merely because a related query exists.

A new page now requires all of the following:

- a clearly distinct user decision or location intent;
- recurring Search Console evidence that an existing owner cannot answer cleanly;
- an explicit owner/support relationship in the Tool Network Registry;
- a cannibalization check against the statewide owner and the three proven destination owners.

The default action for adjacent fall demand is now **strengthen an existing owner or add a contextual handoff**, not build another page.

### 3. Concentrate internal authority

When a Michigan travel, seasonal, outdoor, or Fall Color support surface has a genuinely useful reason to hand off, prioritize this set:

- statewide decision → `/fall-color/`
- western U.P. destination → `/fall-color/porcupine-mountains-fall-color/`
- northern Lower scenic-drive destination → `/fall-color/tunnel-of-trees-fall-color/`
- Straits / island destination → `/fall-color/mackinac-island-fall-color/`

Do not force all four links onto every page. Links must be contextual and useful to the visitor. The goal is concentrated authority, not template-wide link stuffing.

### 4. Let weaker Fall Color pages support rather than compete

Existing regional, planning, drive, weekend, aurora-overlap, and peak-date pages can remain useful when they answer a distinct question. Their job is to:

- answer that narrower question directly;
- hand statewide intent back to `/fall-color/`;
- hand location intent to the strongest matching destination owner;
- avoid title/H1/meta treatments that drift into the protected owner's primary query.

### 5. Protect the statewide hub from duplication

The statewide map is the only owner for broad queries such as:

- Michigan fall color
- Michigan fall color map
- Michigan fall color forecast
- Michigan peak fall color
- where are leaves peaking in Michigan

Supporting pages may mention these concepts, but should not be repositioned as alternate statewide hubs.

### 6. Measure preservation, not page count

The Fall Color cluster is now judged primarily by:

- impressions and clicks on the four protected owners;
- average position stability or improvement;
- CTR by page/query family;
- whether supporting pages send useful contextual traffic into the protected owners;
- cannibalization signals where multiple pages begin ranking for the same primary query family.

More indexed Fall Color URLs are **not** a success metric.

## Principal fall network

The preferred destination structure is now:

**Statewide Fall Color → Porcupine Mountains / Tunnel of Trees / Mackinac Island**

Other Fall Color pages are supporting decision surfaces unless their own Search Console evidence later proves independent ownership.

## Release / regression check

Run:

```bash
node scripts/benchmark-fall-color-winner-protection.mjs --check
```

The benchmark protects the four canonical owners and verifies that the statewide hub and relevant supporting surfaces continue to reinforce the proven destination pages.

## Stop-loss rules

- Do not merge a change that alters a protected canonical unintentionally.
- Do not launch a new statewide or near-statewide Fall Color page.
- Do not repurpose an existing support page into a competing owner without query evidence and an explicit registry decision.
- Do not bulk-inject links merely to manipulate internal PageRank; every handoff must make sense in the visitor journey.
- Preserve factual corrections and live-data reliability even when a page is protected; protection is not permission to keep a known error.

## Seasonal handoff

Fall Color no longer needs additional page-count pressure. New growth work should increasingly shift toward the next seasonal opportunity set while the fall winners are allowed to compound authority through October.