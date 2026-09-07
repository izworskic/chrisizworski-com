import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageRoot = path.join(root, 'node_modules', 'ontario-fishing-lake-finder');
const sourceHtml = path.join(packageRoot, 'public', 'index.html');
const targetDir = path.join(root, 'public', 'ontario-fishing-lake-finder');
const targetHtml = path.join(targetDir, 'index.html');

if (!fs.existsSync(sourceHtml)) {
  throw new Error('Ontario Fishing Lake Finder package is not installed; refusing to publish a stale mirror.');
}

const html = fs.readFileSync(sourceHtml, 'utf8');

if (!html.includes('Ontario Hydro Network')) {
  throw new Error('Ontario Fishing Lake Finder release does not contain the OHN all-lakes coverage contract.');
}
if (/replit\.app/i.test(html)) {
  throw new Error('Ontario Fishing Lake Finder release contains a forbidden Replit dependency.');
}
if (!html.includes("const API='/api/lakes'")) {
  throw new Error('Ontario Fishing Lake Finder frontend is not wired to the first-party /api/lakes endpoint.');
}

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(targetHtml, html);
console.log('Synced Ontario Fishing Lake Finder frontend from pinned standalone release.');
