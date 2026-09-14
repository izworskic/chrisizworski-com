import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const governance = JSON.parse(
  await readFile(path.join(root, "benchmarks", "name-serp-governance.json"), "utf8"),
);
const role = governance.currentRole;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function jsonLd(source) {
  return [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap((match) => {
      const parsed = JSON.parse(match[1]);
      return parsed["@graph"] || [parsed];
    });
}

test("canonical Person role is consistent across every full definition", async () => {
  const pages = await walk(publicRoot);
  let titled = 0;
  let employed = 0;

  for (const file of pages) {
    const html = await readFile(file, "utf8");
    for (const node of jsonLd(html)) {
      if (node["@type"] !== "Person" || node["@id"] !== governance.canonicalPersonId) continue;
      if (node.jobTitle) {
        titled += 1;
        assert.equal(node.jobTitle, role.jobTitle, `stale jobTitle in ${path.relative(root, file)}`);
      }
      if (node.worksFor) {
        employed += 1;
        assert.equal(node.worksFor.name, role.employer.name, `stale employer in ${path.relative(root, file)}`);
        assert.equal(node.worksFor.url, role.employer.url, `missing employer URL in ${path.relative(root, file)}`);
      }
    }
  }

  assert.ok(titled >= 40, `expected broad job-title coverage, found ${titled}`);
  assert.ok(employed >= 25, `expected broad employer coverage, found ${employed}`);
});

test("Bing-facing identity pages preserve canonicals and expose the current role", async () => {
  const homepage = await readFile(path.join(publicRoot, "index.html"), "utf8");
  const profile = await readFile(path.join(publicRoot, "chris-izworski", "index.html"), "utf8");
  const title = (/<title>([^<]+)<\/title>/.exec(profile) || [])[1] || "";
  const description = (/<meta name="description" content="([^"]+)">/.exec(profile) || [])[1] || "";

  assert.equal(title, "Chris Izworski | Senior Sales Engineer at Axon");
  assert.ok(title.length <= 60);
  assert.ok(description.length <= 158);
  assert.match(homepage, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/">/);
  assert.match(profile, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/chris-izworski\/">/);
  assert.match(homepage, /href="\/chris-izworski\/">/);
  assert.match(profile, /Senior Sales Engineer at Axon/);
  assert.match(profile, /Michigan State 911 Committee Technology Forum agenda/);
  assert.doesNotMatch(profile, /currently (?:a )?Solutions Consultant at Prepared/i);
});
