const { disclosureFor } = require("../report-provenance.js");
const { getJson } = require("../github-edition-store.js");
// RSS reads immutable GitHub editions, not Redis scans.
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
  const index = await getJson("mi/index.json");
  const dates = (Array.isArray(index?.dates) ? index.dates : []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0,20);
  const records = await Promise.all(dates.map(d => getJson("mi/" + d + ".json")));
  const items = records.filter(o => o?.body && o?.date).sort((a,b)=>b.date.localeCompare(a.date));

  const itemXml = items
    .map((o) => {
      const title = "Michigan fall color, " + new Date(o.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      return (
        "    <item>\n" +
        "      <title>" + esc(title) + "</title>\n" +
        "      <link>" + base + "/</link>\n" +
        "      <guid isPermaLink=\"false\">fallcolor-" + o.date + "</guid>\n" +
        "      <pubDate>" + rfc822(o.date) + "</pubDate>\n" +
        "      <description><![CDATA[" + (disclosureFor(o) + "\n\n" + o.body).replace(/\]\]>/g, "]]]]><![CDATA[>") + "]]></description>\n" +
        "    </item>"
      );
    })
    .join("\n");

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0"><channel>\n' +
    "  <title>Michigan Fall Color, daily note</title>\n" +
    "  <link>" + base + "/</link>\n" +
    "  <description>Automated daily summaries of Michigan fall-color model estimates and weather inputs, published by Chris Izworski.</description>\n" +
    "  <language>en-us</language>\n" +
    "  <lastBuildDate>" + new Date().toUTCString() + "</lastBuildDate>\n" +
    (itemXml ? itemXml + "\n" : "") +
    "</channel></rss>\n";
  res.status(200).send(body);
};
