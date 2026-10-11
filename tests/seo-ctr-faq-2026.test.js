import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const paths = [
  "northern-lights-michigan",
  "great-lakes-freighter-tracking",
  "mackinac-bridge-live",
  "michigan-border-wait-times",
];
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

for (const slug of paths) {
  test(`${slug}: valid honest FAQ structured data, snippets and freshness`, () => {
    const html = read(`public/${slug}/index.html`);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const desc = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(title && decode(title).length <= 60, "title <=60");
    assert.ok(desc && decode(desc).length <= 158, "description <=158");
    assert.ok(html.includes(`<link rel="canonical" href="https://chrisizworski.com/${slug}/">`));
    assert.ok(!/\b(?:guaranteed visibility|guaranteed crossing|zero wait now)\b/i.test(desc));
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map(m => JSON.parse(m[1]));
    assert.ok(ld.every(item => item["@context"] === "https://schema.org"), "valid schema contexts");
    const graph = ld.flatMap(item => item["@graph"] || [item]);
    const faq = graph.find(item => item["@type"] === "FAQPage");
    assert.ok(faq && faq.mainEntity.length >= 3, "FAQPage questions");
    const visible = decode(html.replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "));
    const matched = faq.mainEntity.filter(q => {
      assert.equal(q["@type"], "Question");
      assert.equal(q.acceptedAnswer?.["@type"], "Answer");
      assert.ok(q.acceptedAnswer?.text?.length >= 35, "answer text");
      return visible.includes(decode(q.name));
    });
    assert.ok(matched.length >= 3, "FAQ questions must appear visibly on the page");
    const siteMap = read("public/sitemap.xml");
    assert.ok(siteMap.includes(`<loc>https://chrisizworski.com/${slug}/</loc>\n    <lastmod>2026-10-11</lastmod>`),
      "sitemap URL and date");
    assert.ok(graph.some(item => item.dateModified === "2026-10-11"), "schema dateModified");
  });
}
