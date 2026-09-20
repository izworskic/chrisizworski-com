import fs from "node:fs/promises";

const root = new URL("../", import.meta.url);
const toolsPath = new URL("public/tools/index.html", root);
const sitemapPath = new URL("public/sitemap.xml", root);

let tools = await fs.readFile(toolsPath,"utf8");
if (!tools.includes('href="/snowmobile/"')) {
  const needle = '<a href="/michigan-cross-country-skiing/">Michigan Cross-Country Skiing, Trails and Live Conditions</a>';
  if (!tools.includes(needle)) throw new Error("XC catalog anchor not found; refusing unsafe snowmobile insertion");
  const snowmobile = '<a href="/snowmobile/">Michigan Snowmobile Conditions, Grayling to Gaylord Trail 7</a>';
  tools = tools.replace(needle, `${snowmobile}\n${needle}`);
  await fs.writeFile(toolsPath,tools);
}

let sitemap = await fs.readFile(sitemapPath,"utf8");
if (!sitemap.includes("<loc>https://chrisizworski.com/snowmobile/</loc>")) {
  const block = `  <url>
    <loc>https://chrisizworski.com/snowmobile/</loc>
    <lastmod>2026-09-19</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;
  if (!sitemap.includes("</urlset>")) throw new Error("sitemap urlset close missing");
  sitemap = sitemap.replace("</urlset>", block + "</urlset>");
  await fs.writeFile(sitemapPath,sitemap);
}
