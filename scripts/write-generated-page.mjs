// Writes a generated page without rolling its freshness date backward.
//
// Generators carry a baseline "dateModified" in their templates. Later commits
// (freshness reconciliation, stamp-freshness) can move a committed page's date
// forward without touching the generator. Rewriting that page from the stale
// baseline would silently move dateModified backward and put it out of step
// with the sitemap lastmod. So: if the page already on disk carries a later
// date, keep it. Never move a date backward.
//
// The file is only written when the result differs from what is on disk, so a
// regeneration run that changes nothing leaves the working tree clean.
import fs from "node:fs";

const DATE_RE = /"dateModified":"(\d{4}-\d{2}-\d{2})"/g;

export function keepNewerDate(html, existing) {
  const existingDates = [...(existing || "").matchAll(DATE_RE)].map(m => m[1]);
  if (!existingDates.length) return html;
  const newest = existingDates.sort().at(-1);
  return html.replace(DATE_RE, (whole, date) => (date < newest ? `"dateModified":"${newest}"` : whole));
}

export function writeGeneratedPage(file, html) {
  let existing = null;
  try { existing = fs.readFileSync(file, "utf8"); } catch {}
  const out = keepNewerDate(html, existing);
  if (out === existing) return false;
  fs.writeFileSync(file, out);
  return true;
}
