import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const json = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));

test('explicit API function overrides precede the catch-all so Vercel can use them', async () => {
  const { functions } = await json('vercel.json');
  const patterns = Object.keys(functions);
  const fallback = patterns.indexOf('api/**/*.js');
  assert.ok(fallback >= 0, 'retain the default API timeout');
  for (const [index, pattern] of patterns.entries()) {
    if (/^api\/[\w/-]+\.js$/.test(pattern)) {
      assert.ok(index < fallback, `${pattern} is shadowed by api/**/*.js; Vercel uses the first match`);
      await readFile(path.join(root, pattern));
    }
  }
  assert.equal(functions['api/waterfowl-freeze-line.js'].maxDuration, 40);
});

test('the site build is explicit and cannot become a per-function Vercel build hook', async () => {
  const config = await json('vercel.json');
  const pkg = await json('package.json');
  assert.equal(config.buildCommand, 'npm run build:site');
  assert.ok(pkg.scripts['build:site'], 'the configured site build must exist');
  assert.equal(config.outputDirectory, 'public');

  // The Node API builder uses the nearest package.json, including parent files.
  // A reserved hook here repeats the whole site pipeline for each API function.
  const packages = ['package.json'];
  async function collect(directory) {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(file);
      else if (entry.name === 'package.json') packages.push(file);
    }
  }
  await collect('api');
  for (const file of packages) {
    const { scripts = {} } = await json(file);
    for (const hook of ['vercel-build', 'now-build']) {
      assert.equal(Object.hasOwn(scripts, hook), false, `${file}: reserved ${hook} repeats builds per function`);
    }
  }
});
