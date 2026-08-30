# Main Tool Publisher Flywheel

Updated: 2026-08-29

## Purpose

Turn Chris Izworski's strongest Michigan and Great Lakes tools into publisher-ready utilities that can earn legitimate referral traffic, citations, repeat use, and authority without changing protected search treatments.

This is distribution infrastructure, not a new search-content family.

## Operating rules

- Keep the publisher kit and widget surfaces non-indexable.
- Do not change protected title, meta description, H1, canonical, or first-answer treatments merely to support outreach.
- Keep the fallback link in every embed clean and canonical. JavaScript may add referral tags after load for measurement.
- Do not collect geolocation, cookies, free-text visitor input, or personal information on a publisher host page.
- Do not use paid-link networks, reciprocal-link schemes, mass guest posting, or unrelated placements.
- Pitch utility first. Never ask a publisher to "give us a backlink."
- Preserve source provenance and safety boundaries from the canonical tool.
- Identify Chris Izworski truthfully as creator through the canonical profile.

## Initial publisher-ready tools

| Tool | Canonical | Publisher value | Live widget data |
| --- | --- | --- | --- |
| Northern Lights Michigan | https://chrisizworski.com/northern-lights-michigan/ | Tonight/next-night aurora planning | NOAA-derived current/peak Kp |
| Mackinac Bridge Live | https://chrisizworski.com/mackinac-bridge-live/ | Bridge status + wind planning | Official status + NOAA wind |
| Great Lakes Buoys | https://chrisizworski.com/great-lakes-buoys/ | Boating/fishing conditions entry point | Active NOAA/NDBC station count |
| Michigan Fall Color | https://chrisizworski.com/fall-color/ | Seasonal trip-planning utility | Publisher card + daily RSS |
| Soo Locks Live | https://chrisizworski.com/soo-locks/ | Ship-watching and visit planning | Publisher card |
| Great Lakes Ship Tracker | https://chrisizworski.com/great-lakes-freighter-tracking/ | Live freighter discovery | Publisher card |
| Michigan Beach Report | https://chrisizworski.com/great-lakes-beaches/ | Beach-condition planning | Publisher card |
| Michigan Boat Launch Finder | https://chrisizworski.com/michigan-boat-launches/ | Access planning | Publisher card |
| Manistee River Guide | https://chrisizworski.com/michigan-paddling/manistee-river/ | River trip planning | Publisher card |
| Au Sable Field Map | https://ausable.chrisizworski.com/ | River access, paddling and fishing | Publisher card |

## Embed contract

A publisher adds a small fallback block plus the shared script:

```html
<div
  data-chris-tool-widget
  data-tool="aurora"
  data-source="PUBLISHER_NAME"
>
  <a href="https://chrisizworski.com/northern-lights-michigan/">Northern Lights Michigan</a>
  by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a>
</div>
<script async src="https://chrisizworski.com/publisher-widget.js"></script>
```

The fallback anchors remain useful and crawlable if JavaScript is disabled. The script enhances the block in place and adds privacy-safe referral tags to click destinations.

## Fall Color feed

Publishers and newsletters may consume the existing daily feed:

https://chrisizworski.com/fall-color/rss.xml

The feed points readers back to the canonical Fall Color tool.

## Flywheel

Publisher placement -> useful referral -> tool use -> share/return behavior -> publisher proof -> more placements -> stronger independent citations and authority -> more search visibility.

## 30-day operating targets

These are goals, not ranking guarantees.

- 12 legitimate publisher conversations outside Bay/Saginaw.
- 5 live placements across at least 4 independent domains.
- 2 different tools represented among live placements.
- 250 publisher-referred landings.
- 40 qualified downstream tool actions.
- 3 external pages that visibly name Chris Izworski as creator.
- 2 publishers consuming the Fall Color RSS feed or another machine-readable resource.

## Current exclusions

Do not conduct outreach to:

- Bay City-area organizations.
- Saginaw-area organizations.
- Go Great Lakes Bay.
- Pure Michigan.

## Next expansion

After the first placements establish proof, add publisher modules for river conditions, trout, winter ice, cross-country skiing, border waits, and Great Lakes levels where the underlying data contract is stable and the host-page utility is clear.
