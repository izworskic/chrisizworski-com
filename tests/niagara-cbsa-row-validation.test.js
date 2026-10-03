const test = require("node:test");
const assert = require("node:assert/strict");

const niagaraHandler = require("../api/niagara-border-crossings");

const HEADER = "Customs Office;;Location;;Commercial Flow - Canada Bound;;Travellers Flow - Canada Bound;;Last Updated";
const unrelatedCsv = `${HEADER}\nSome Other Port;;Elsewhere;;1 minute;;2 minutes;;2026-10-03 08:20 EDT`;

const niagaraHtml = `
<table id="bwttaf"><tbody>
<tr><th><b>Queenston Lewiston Bridge (Travellers and Commercial)</b><br>Niagara-on-the-Lake, ON/Lewiston, NY</th><td>1 minute</td><td>1 minute</td><td>2026-10-03 08:20 EDT</td></tr>
<tr><th><b>Niagara Falls Rainbow Bridge(Travellers only)</b><br>Niagara Falls, ON/Niagara Falls, NY</th><td>Not Applicable</td><td>2 minutes</td><td>2026-10-03 08:20 EDT</td></tr>
<tr><th><b>Fort Erie (Peace Bridge)</b><br>Fort Erie, ON/Buffalo, NY</th><td>2 minutes</td><td>1 minute</td><td>2026-10-03 08:20 EDT</td></tr>
</tbody></table>`;

test("a parseable CBSA CSV is not accepted unless Niagara rows are present", () => {
  assert.equal(niagaraHandler.hasRequiredNiagaraCbsaRows(unrelatedCsv), false);
});

test("resolver falls through a parseable but irrelevant CSV to the official Niagara HTML table", () => {
  const resolved = niagaraHandler.resolveCbsaPayload(
    { status: "fulfilled", value: unrelatedCsv },
    { status: "fulfilled", value: niagaraHtml },
  );
  assert.equal(resolved.available, true);
  assert.equal(resolved.mode, "html-fallback");
  assert.match(resolved.text, /Fort Erie \(Peace Bridge\)/);
  assert.match(resolved.text, /Niagara Falls Rainbow Bridge\(Travellers only\)/);
  assert.match(resolved.text, /Queenston Lewiston Bridge \(Travellers and Commercial\)/);
});

test("all three Niagara CBSA names are explicitly required", () => {
  assert.deepEqual(niagaraHandler.REQUIRED_CBSA_NAMES, [
    "Fort Erie (Peace Bridge)",
    "Niagara Falls Rainbow Bridge(Travellers only)",
    "Queenston Lewiston Bridge (Travellers and Commercial)",
  ]);
});
