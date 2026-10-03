function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—");
}

function text(value) {
  return decodeEntities(String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function cells(rowHtml) {
  return [...String(rowHtml || "").matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => ({ tag: match[1].toLowerCase(), html: match[2], value: text(match[2]) }));
}

function firstCellParts(cellHtml) {
  const html = String(cellHtml || "");
  const bold = html.match(/<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>/i);
  const name = text(bold?.[1] || html.split(/<br\s*\/?\s*>/i)[0]);
  let remainder = html;
  if (bold) remainder = remainder.replace(bold[0], " ");
  const location = text(remainder.replace(/<br\s*\/?\s*>/gi, " "));
  return { name, location };
}

function findWaitTable(html) {
  const source = String(html || "");
  return source.match(/<table\b[^>]*\bid=["']bwttaf["'][^>]*>([\s\S]*?)<\/table>/i)?.[1] || null;
}

function parseCbsaWaitHtml(html) {
  const table = findWaitTable(html);
  if (!table) return [];

  const rows = [];
  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowCells = cells(rowMatch[1]);
    if (rowCells.length < 4) continue;
    if (!/<(?:b|strong)\b/i.test(rowCells[0].html)) continue;
    const { name, location } = firstCellParts(rowCells[0].html);
    if (!name) continue;
    rows.push({
      name,
      location: location || null,
      commercial: rowCells[1].value || null,
      passenger: rowCells[2].value || null,
      updated: rowCells[3].value || null,
    });
  }
  return rows;
}

function cbsaWaitHtmlToLegacyCsv(html) {
  const rows = parseCbsaWaitHtml(html);
  if (!rows.length) return "";
  const header = [
    "Customs Office",
    "Location",
    "Commercial Flow - Canada Bound",
    "Travellers Flow - Canada Bound",
    "Last Updated",
  ].join(";;");
  return [
    header,
    ...rows.map((row) => [row.name, row.location || "", row.commercial || "", row.passenger || "", row.updated || ""].join(";;")),
  ].join("\n");
}

module.exports = {
  cbsaWaitHtmlToLegacyCsv,
  parseCbsaWaitHtml,
};
