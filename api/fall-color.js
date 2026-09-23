// /api/fall-color -- single entry point for the whole fall color tool.
//
// This is one Serverless Function on purpose. The Vercel Hobby plan caps a
// deployment at 12 Serverless Functions, and the hub was already at 11 before this
// property moved in. Five separate routes would have been 16 and the build fails
// outright. So the five handlers live in lib/fall-color/routes/ (outside api/, where
// they do not each become a function) and this dispatcher picks one by ?view=.
// Public paths are preserved by rewrites in vercel.json, so nothing user facing or
// SEO facing depends on this shape.
//
// If the hub ever moves to Pro, these can be split back out with no URL change.
const handlers = {
  conditions: require("../lib/fall-color/routes/conditions.js"),
  report: require("../lib/fall-color/routes/report.js"),
  snapshot: require("../lib/fall-color/routes/snapshot.js"),
  rss: require("../lib/fall-color/routes/rss.js"),
  sitemap: require("../lib/fall-color/routes/sitemap.js"),
  cron: require("../lib/fall-color/routes/cron.js"),
  "old-sow-live": require("../lib/old-sow/route.js"),
  "mackinac-island": require("../lib/mackinac-island/route.js"),
  "detroit-outdoors": require("../lib/detroit-outdoors/route.js"),
};

const DETROIT_FREIGHTER_SAFE_CACHE = "public, s-maxage=60, must-revalidate";
const DETROIT_FOCUSED_CACHE = "public, s-maxage=300, must-revalidate";
function detroitCachePolicy(req) {
  const query = new URL(req.url || "/", "https://chrisizworski.com").searchParams;
  const intent = String((req.query && req.query.intent) || query.get("intent") || "");
  // Broad board/image/editorial responses can contain AIS, so they get the same
  // short hard-expiry policy as the focused freighter surface. Explicitly
  // non-freighter focused pages can use the longer shared cache.
  return intent && intent !== "freighter" ? DETROIT_FOCUSED_CACHE : DETROIT_FREIGHTER_SAFE_CACHE;
}

module.exports = async (req, res) => {
  res.setHeader("X-Robots-Tag", "noindex");
  const view = String((req.query && req.query.view) || "conditions");
  const handler = handlers[view];
  if (!handler) {
    res.status(404).json({ error: "unknown view", view: view });
    return;
  }

  if (view === "detroit-outdoors") {
    const cachePolicy = detroitCachePolicy(req);
    const setHeader = res.setHeader.bind(res);
    res.setHeader = (name, value) => {
      if (String(name).toLowerCase() === "cache-control" && /s-maxage/i.test(String(value || ""))) {
        return setHeader(name, cachePolicy);
      }
      return setHeader(name, value);
    };
  }
  return handler(req, res);
};