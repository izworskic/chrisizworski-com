// /api/rss -> /rss.xml (via rewrite). RSS 2.0 of the daily color notes from Redis.
async function redis(cmd) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "https://winning-dogfish-39241.upstash.io";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!token) return null;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  return j ? j.result : null;
}
function rfc822(dateStr) {
  const d = dateStr ? new Date(dateStr + "T12:00:00-04:00") : new Date();
  return d.toUTCString();
}
function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

module.exports = async (req, res) => {
  // Hub convention: API routes are never indexed. The XML they emit is
  // referenced by rewrite, so the route itself should stay out of the index.
  res.setHeader("X-Robots-Tag", "noindex");
  const base = "https://chrisizworski.com/fall-color";
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  let items = [];
  try {
    const scan = await redis(["SCAN", "0", "MATCH", "fallcolor:report:*", "COUNT", "200"]);
    let keys = (scan && scan[1]) || [];
    keys = keys.filter((k) => /fallcolor:report:\d{4}-\d{2}-\d{2}$/.test(k));
    keys.sort().reverse();
    keys = keys.slice(0, 20);
    if (keys.length) {
      const vals = await redis(["MGET", ...keys]);
      (vals || []).forEach((raw) => {
        if (!raw) return;
        try {
          const o = JSON.parse(raw);
          if (o && o.body && o.date) items.push(o);
        } catch (e) {}
      });
      items.sort((a, b) => (a.date < b.date ? 1 : -1));
    }
  } catch (e) {}

  const itemXml = items
    .map((o) => {
      const title = "Michigan fall color, " + new Date(o.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      return (
        "    <item>\n" +
        "      <title>" + esc(title) + "</title>\n" +
        "      <link>" + base + "/</link>\n" +
        "      <guid isPermaLink=\"false\">fallcolor-" + o.date + "</guid>\n" +
        "      <pubDate>" + rfc822(o.date) + "</pubDate>\n" +
        "      <description><![CDATA[" + o.body + "]]></description>\n" +
        "    </item>"
      );
    })
    .join("\n");

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0"><channel>\n' +
    "  <title>Michigan Fall Color, daily note</title>\n" +
    "  <link>" + base + "/</link>\n" +
    "  <description>A short daily note on where Michigan's fall color is turning, from live satellite and weather data.</description>\n" +
    "  <language>en-us</language>\n" +
    "  <lastBuildDate>" + new Date().toUTCString() + "</lastBuildDate>\n" +
    (itemXml ? itemXml + "\n" : "") +
    "</channel></rss>\n";
  res.status(200).send(body);
};
