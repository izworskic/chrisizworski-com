import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageRoot = path.join(root, 'node_modules', 'ontario-fishing-lake-finder');

const surfaces = [
  {
    name: 'Ontario Fishing Lake Finder',
    source: path.join(packageRoot, 'public', 'index.html'),
    targetDir: path.join(root, 'public', 'ontario-fishing-lake-finder'),
    required: ['Ontario Hydro Network', "const API='/api/lakes'"],
  },
  {
    name: 'Remote Trout Lake Finder',
    source: path.join(packageRoot, 'public', 'remote-trout-lake-finder', 'index.html'),
    targetDir: path.join(root, 'public', 'remote-trout-lake-finder'),
    required: [
      'Ontario trout intelligence · V2',
      'No hidden top-candidate sampling.',
      "Why isn't my lake here?",
      "const API='/api/lakes'",
    ],
  },
];

for (const surface of surfaces) {
  if (!fs.existsSync(surface.source)) {
    throw new Error(`${surface.name} package surface is missing; refusing to publish a stale mirror.`);
  }

  const html = fs.readFileSync(surface.source, 'utf8');
  for (const marker of surface.required) {
    if (!html.includes(marker)) {
      throw new Error(`${surface.name} release is missing required contract marker: ${marker}`);
    }
  }
  if (/replit\.app/i.test(html)) {
    throw new Error(`${surface.name} release contains a forbidden Replit dependency.`);
  }

  fs.mkdirSync(surface.targetDir, { recursive: true });
  fs.writeFileSync(path.join(surface.targetDir, 'index.html'), html);
  console.log(`Synced ${surface.name} frontend from pinned standalone release.`);
}
