# Michigan & Great Lakes Field Guide Network — Master Operating System

You do **not** need to remember where each Field Guide is linked or manually rotate them as the seasons change. Everything is controlled from **one registry** and **automatic calendar badges**.

---

## 1. How It Works (Zero Manual Seasonal Juggling)

1. **Single Registry (`public/assets/field-guides-registry.json`):**
   - Lists every live Field Guide, its URL, stop count, `activeMonths` (e.g., `[10, 11, 12]` for *White Christmas Escapes* and *First Snow Adventures*, `[12, 1, 2, 3]` for *Frozen Michigan*), and the `connectedTools` it pairs with.
2. **Automatic Seasonal Highlighting on `/guides/` and `/tools/`:**
   - Every Field Guide card on `/guides/` and `/tools/` carries a `data-months="..."` attribute.
   - A lightweight script checks the current calendar month (`new Date().getMonth() + 1`), automatically badges guides that are **"In season now"**, and surfaces them first—while keeping all 8 links in static HTML for Google indexing.
3. **One Verification Command (`node scripts/verify-field-guides.mjs`):**
   - Run `node scripts/verify-field-guides.mjs` at any time to verify that every `"live"` guide in `public/assets/field-guides-registry.json` is:
     - Present on `/guides/` (`public/guides/index.html`)
     - Present on `/tools/` (`public/tools/index.html`)
     - Present in `/sitemap-winter.xml` (`public/sitemap-winter.xml`)
     - Built to the flagship `FIELD_GUIDE_V1` standard (100% real verified photos, 0 placeholder index boxes)

---

## 2. Live Field Guides Inventory (9 Live)

| # | Field Guide | URL | Stops | Peak Months | Primary Connected Live Tools |
|---|---|---|---|---|---|
| 1 | **Michigan Winter Weekend Getaways** | `/michigan-winter-weekends/` | 12 | Oct–Mar (`10,11,12,1,2,3`) | `/michigan-snow-depth/`, `/lake-effect-snow/`, `/michigan-ski-hills/`, `/michigan-cross-country-skiing/`, `/mackinac-bridge-live/` |
| 2 | **Michigan White Christmas Escapes** | `/michigan-white-christmas-escapes/` | 10 | Oct–Dec (`10,11,12`) | `/national-tools/white-christmas/`, `/national-tools/white-christmas/forecast/`, `/white-christmas-probability-map/`, `/white-christmas-michigan/` |
| 3 | **Michigan First Snow Adventures** | `/michigan-first-snow-adventures/` | 12 | Oct–Dec (`10,11,12`) | `/michigan-snow-depth/`, `/lake-effect-snow/`, `/michigan-snow-totals/`, `/michigan-cross-country-skiing/`, `/michigan-ski-hills/` |
| 4 | **Michigan Late-Fall & November Adventures** | `/michigan-late-fall-adventures/` | 12 | Oct–Dec (`10,11,12`) | `/upper-peninsula-waterfalls/`, `/michigan-rockhounding/`, `/waterfowl-freeze-line/`, `https://michigantroutreport.com/salmon-run/`, `/edmund-fitzgerald/` |
| 5 | **Great Lakes Winter Freighter & Harbor Guide** | `/great-lakes-winter-freighter-guide/` | 12 | Nov–Mar (`11,12,1,2,3`) | `/great-lakes-freighter-winter-layup/`, `/great-lakes-freighter-tracking/`, `/soo-locks/`, `/duluth-canal-park/`, `/freighters/` |
| 6 | **Michigan Winter Activities** | `/michigan-winter-activities/` | 18 | Nov–Mar (`11,12,1,2,3`) | `/michigan-snow-depth/`, `/michigan-cross-country-skiing/`, `/michigan-ski-hills/`, `/michigan-ice-caves/` |
| 7 | **Frozen Michigan** | `/frozen-michigan/` | 11 | Dec–Mar (`12,1,2,3`) | `/michigan-ice-caves/`, `/michigan-ice/`, `/mackinac-ice-bridge/`, `/tahquamenon-falls/` |
| 8 | **Michigan Winter Trails** | `/michigan-winter-trails/` | 15 | Nov–Mar (`11,12,1,2,3`) | `/michigan-cross-country-skiing/`, `/michigan-snow-depth/`, `/michigan-snow-totals/`, `/estivant-pines/` |
| 9 | **Northern Michigan Wine, Cider & Spirits** | `/michigan-wine-cider-spirits/` | 18 | Oct–Apr (`10,11,12,1,2,3,4`) | `/petoskey-wine/`, `https://tcwine.chrisizworski.com/` |

---

## 3. Where Field Guides Land Across the Site

1. **`/guides/` (`public/guides/index.html`) — The Permanent Editorial Library:**
   - Houses the full **Michigan Fall & Winter Field Guides** collection at the top of the page, with automatic `"In season this month"` badges.
2. **`/tools/` (`public/tools/index.html`) — Compact Seasonal Shelf + Decision Desk Links:**
   - Shows a compact **Michigan Seasonal Field Guides** grid (replacing the old 8 stacked banners), links inside the `#winter-task-router` persona cards, and includes the guides in the `#finder` search/chip directory.
3. **Live Decision Tools — Two-Way Companion Handoffs:**
   - Live tools (`/michigan-snow-depth/`, `/lake-effect-snow/`, `/freighters/`, `/great-lakes-freighter-winter-layup/`, `/michigan-destinations/`, and `/`) link directly back to their companion Field Guides.
