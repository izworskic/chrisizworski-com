import test from "node:test";
import assert from "node:assert/strict";
import { REPOSITORIES, ENTRYPOINTS, OS_URL, INVESTMENT_URL, classifyAdoption, optionsFrom, adoptionInstruction } from "../scripts/audit-agent-adoption.mjs";

test("the audit covers independently owned canonical repositories", () => {
  assert.ok(REPOSITORIES.includes("izworskic/national-rivers"));
  assert.ok(REPOSITORIES.includes("izworskic/national-white-christmas"));
  assert.ok(REPOSITORIES.includes("izworskic/national-outdoor-core"));
  assert.ok(ENTRYPOINTS.includes("AGENTS.md"));
  assert.equal(new Set(REPOSITORIES).size, REPOSITORIES.length);
});

test("adoption requires both real checked-in entrypoint pointers", () => {
  const both = "EXPERIENCE_OS_V1 " + OS_URL + "\nExperience Investment: " + INVESTMENT_URL;
  assert.deepEqual(classifyAdoption([{ status: "present", content: both }]), { status: "adopted", os: true, investment: true });
  assert.equal(classifyAdoption([{ status: "present", content: "EXPERIENCE_OS_V1 only" }]).status, "missing");
  assert.equal(classifyAdoption([{ status: "present", content: both.split("\n")[0] }]).status, "partial");
  assert.equal(classifyAdoption([{ status: "missing" }]).status, "missing");
});

test("unknown repository access is never counted as successful adoption", () => {
  const both = "EXPERIENCE_OS_V1 " + OS_URL + " experience-investment " + INVESTMENT_URL;
  assert.equal(classifyAdoption([{ status: "present", content: both }, { status: "unknown" }]).status, "unknown");
  assert.equal(classifyAdoption(null).status, "unknown");
});

test("audit is allowlisted and has opt-in enforcement only", () => {
  assert.equal(optionsFrom([]).strict, false);
  assert.deepEqual(optionsFrom(["--strict", "--repo=izworskic/national-rivers"]).repos, ["izworskic/national-rivers"]);
  assert.throws(() => optionsFrom(["--repo=other/private"]), /outside reviewed ownership/);
  assert.throws(() => optionsFrom(["--execute"]), /Unsupported argument/);
  assert.match(adoptionInstruction(), /Never auto-merge/);
});
