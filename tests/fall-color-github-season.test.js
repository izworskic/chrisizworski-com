const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { seasonEligibility } = require("../lib/fall-color/routes/github-publish.js")._test;
test("Michigan and national publication windows retain independent season boundaries", () => {
  for (const [date, mi, national] of [
    ["2026-07-31",false,false], ["2026-08-01",false,true],
    ["2026-08-19",false,true], ["2026-08-20",true,true],
    ["2026-11-15",true,true], ["2026-11-16",false,true],
    ["2026-11-25",false,true], ["2026-11-30",false,true],
    ["2026-12-01",false,false], ["2027-01-01",false,false]
  ]) assert.deepEqual(seasonEligibility(date), {mi,national}, date);
});
test("archive requires authenticated dated eligibility before reserving attempts and before requiring readback", () => {
  const yaml = fs.readFileSync(path.join(__dirname,"../.github/workflows/fall-color-writer-test.yml"),"utf8");
  const section = yaml.slice(yaml.indexOf("- name: Archive daily Michigan"));
  const validation = section.indexOf('(.eligible.mi | type == "boolean")');
  const skip = section.indexOf("outside the publishing season; no attempt reserved");
  const reserve = section.indexOf("Reserve one daily");
  const call = section.indexOf('${WRITER_URL}&kind=${kind}');
  assert.ok(validation >= 0 && validation < skip && skip < reserve && reserve < call);
  const readback = section.slice(section.indexOf("# Read-back"));
  assert.ok(readback.indexOf(".eligible[$kind]") >= 0);
  assert.ok(readback.indexOf(".eligible[$kind]") < readback.indexOf("Missing $kind daily edition"));
  const recovery = section.indexOf('if [[ "$RECOVERY_ONLY" == "true" || -f "$sentinel" ]]; then');
  const noSpend = section.indexOf('recovery="&recovery=1"', recovery);
  const otherwise = section.indexOf("else", noSpend);
  assert.ok(recovery >= 0 && recovery < noSpend && noSpend < otherwise && otherwise < reserve);
  assert.ok(section.includes('! request_edition "&recovery=1"'));
  assert.ok(section.includes('.ok == true and .kind == $kind and .date == $date and .edition.date == $date'));
});
