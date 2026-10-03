const test = require("node:test");
const assert = require("node:assert/strict");

const { cbsaWaitHtmlToLegacyCsv, parseCbsaWaitHtml } = require("../lib/niagara-cbsa-html");
const { parseCbsaCsv } = require("../lib/border-crossings");
const { compareNiagaraCrossings, mergeNiagaraSources } = require("../lib/niagara-border-crossings");

const CURRENT_CBSA_HTML = `
<table id="bwttaf">
  <thead><tr><th>Port of entry</th><th>Commercial flow</th><th>Travellers flow</th><th>Updated</th></tr></thead>
  <tbody>
    <tr><th><b>Queenston Lewiston Bridge (Travellers and Commercial)</b><br>Niagara-on-the-Lake, ON/Lewiston, NY<br></th><td>1 minute</td><td>1 minute</td><td><time datetime="2026-10-03T08:20:38.953-04:00">2026-10-03 08:20 EDT</time></td></tr>
    <tr><th><b>Niagara Falls Rainbow Bridge(Travellers only)</b><br>Niagara Falls, ON/Niagara Falls, NY<br></th><td>Not Applicable</td><td>2 minutes</td><td><time datetime="2026-10-03T08:20:39.301-04:00">2026-10-03 08:20 EDT</time></td></tr>
    <tr><th><b>Fort Erie (Peace Bridge)</b><br>Fort Erie, ON/Buffalo, NY<br></th><td>2 minutes</td><td>1 minute</td><td><time datetime="2026-10-03T08:20:39.643-04:00">2026-10-03 08:20 EDT</time></td></tr>
  </tbody>
</table>`;

test("current CBSA HTML table preserves Niagara crossing names and waits", () => {
  const rows = parseCbsaWaitHtml(CURRENT_CBSA_HTML);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.name), [
    "Queenston Lewiston Bridge (Travellers and Commercial)",
    "Niagara Falls Rainbow Bridge(Travellers only)",
    "Fort Erie (Peace Bridge)",
  ]);
  assert.equal(rows[0].passenger, "1 minute");
  assert.equal(rows[1].passenger, "2 minutes");
  assert.equal(rows[2].commercial, "2 minutes");
  assert.equal(rows[2].updated, "2026-10-03 08:20 EDT");
});

test("CBSA HTML converts into the established normalized parser contract", () => {
  const csv = cbsaWaitHtmlToLegacyCsv(CURRENT_CBSA_HTML);
  const parsed = parseCbsaCsv(csv);
  assert.equal(parsed.get("Fort Erie (Peace Bridge)").passenger.wait_minutes, 1);
  assert.equal(parsed.get("Fort Erie (Peace Bridge)").commercial.wait_minutes, 2);
  assert.equal(parsed.get("Niagara Falls Rainbow Bridge(Travellers only)").passenger.wait_minutes, 2);
  assert.equal(parsed.get("Queenston Lewiston Bridge (Travellers and Commercial)").passenger.wait_minutes, 1);
});

test("Canada-bound Niagara decision receives fresh official CBSA waits from HTML fallback", () => {
  const csv = cbsaWaitHtmlToLegacyCsv(CURRENT_CBSA_HTML);
  const crossings = mergeNiagaraSources([], csv, {});
  const peace = crossings.find((crossing) => crossing.id === "peace");
  const rainbow = crossings.find((crossing) => crossing.id === "rainbow");
  const lewiston = crossings.find((crossing) => crossing.id === "lewiston-queenston");

  assert.equal(peace.waits.to_canada.passenger.standard.wait_minutes, 1);
  assert.equal(rainbow.waits.to_canada.passenger.standard.wait_minutes, 2);
  assert.equal(lewiston.waits.to_canada.passenger.standard.wait_minutes, 1);
  assert.equal(peace.waits.to_canada.source.available, true);
  assert.equal(rainbow.waits.to_canada.source.available, true);

  const decision = compareNiagaraCrossings(
    crossings,
    { direction: "to_canada", traveler: "passenger", preferred: "rainbow" },
    new Date("2026-10-03T12:32:00Z"),
  );
  assert.notEqual(decision.state, "INSUFFICIENT_DATA");
  assert.equal(decision.results.find((result) => result.id === "rainbow").wait_minutes, 2);
});
