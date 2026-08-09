// /api/sitemap -> /sitemap.xml (via rewrite). No Claude call.
const { inSeason } = require("../model.js");

module.exports = (req, res) => {
  // Hub convention: API routes are never indexed. The XML they emit is
  // referenced by rewrite, so the route itself should stay out of the index.
  res.setHeader("X-Robots-Tag", "noindex");
  const base = "https://chrisizworski.com/fall-color";
  // Season window comes from model.js so this route and the daily writer can never disagree.
  // The old local copy used server-local time and a different window.
  const seasonNow = inSeason();
  const regions = ["upper-peninsula-fall-color", "porcupine-mountains-fall-color", "keweenaw-peninsula-fall-color", "tahquamenon-falls-fall-color", "tunnel-of-trees-fall-color", "mackinac-island-fall-color", "sleeping-bear-dunes-fall-color", "au-sable-river-fall-color", "saginaw-bay-fall-color", "saugatuck-southwest-michigan-fall-color", "ann-arbor-irish-hills-fall-color"];
  const urls = [{ loc: base + "/", pri: "1.0", freq: seasonNow ? "daily" : "weekly" },
    { loc: base + "/when-do-leaves-peak-in-michigan/", pri: "0.9", freq: seasonNow ? "weekly" : "monthly" },
    { loc: base + "/michigan-leaf-peeping-planner/", pri: "0.9", freq: seasonNow ? "weekly" : "monthly" },
    { loc: base + "/michigan-fall-color-drives/", pri: "0.9", freq: seasonNow ? "weekly" : "monthly" }]
    .concat(regions.map((s) => ({ loc: base + "/" + s + "/", pri: "0.8", freq: seasonNow ? "weekly" : "monthly" })));
  // This dynamic route cannot know whether a page's crawlable HTML changed, so it
  // deliberately omits lastmod instead of claiming every URL changed today. The
  // root static sitemap carries reviewed, page-specific modification dates.
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => "  <url><loc>" + u.loc + "</loc><changefreq>" + u.freq +
        "</changefreq><priority>" + u.pri + "</priority></url>").join("\n") +
    "\n</urlset>\n";
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(body);
};
