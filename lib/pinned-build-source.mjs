import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export function readPinnedSource(directory, manifest, label, expectedCommit) {
  const entry = manifest.files?.[label];
  if (manifest.commit !== expectedCommit || !entry || path.basename(entry.file) !== entry.file)
    throw new Error(`Pinned source: invalid manifest for ${label}`);
  const source = readFileSync(path.join(directory, entry.file));
  if (source.length !== entry.bytes || createHash('sha256').update(source).digest('hex') !== entry.sha256)
    throw new Error(`Pinned source: integrity failure for ${label}`);
  return source.toString('utf8');
}
