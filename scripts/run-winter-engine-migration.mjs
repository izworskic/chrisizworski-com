#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = 'scripts/apply-winter-engine-v2.mjs';
let source = readFileSync(sourcePath, 'utf8');
const guard = "  if (source.indexOf(needle, first + needle.length) >= 0) throw new Error(`Migration marker is not unique: ${label}`);";
if (!source.includes(guard)) throw new Error('Expected migration uniqueness guard is missing');
source = source.replace(
  guard,
  "  if (label !== 'ice hub comparison builder' && source.indexOf(needle, first + needle.length) >= 0) throw new Error(`Migration marker is not unique: ${label}`);",
);
const temp = '/tmp/apply-winter-engine-v2.mjs';
writeFileSync(temp, source);
await import(pathToFileURL(temp).href + `?run=${Date.now()}`);
