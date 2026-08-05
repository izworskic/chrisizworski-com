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
  rss: require("../lib/fall-color/routes/rss.js"),
  sitemap: require("../lib/fall-color/routes/sitemap.js"),
  cron: require("../lib/fall-color/routes/cron.js"),
};

module.exports = async (req, res) => {
  res.setHeader("X-Robots-Tag", "noindex");
  const view = String((req.query && req.query.view) || "conditions");
  const handler = handlers[view];
  if (!handler) {
    res.status(404).json({ error: "unknown view", view: view });
    return;
  }
  return handler(req, res);
};
