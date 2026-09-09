import fs from 'node:fs';
import path from 'node:path';

const source = path.join('public', 'melvin-price', 'index.html');
const targetDir = path.join('public', 'national-tools', 'melvin-price-live');
const target = path.join(targetDir, 'index.html');

if (!fs.existsSync(source)) throw new Error(`Melvin Price source page missing: ${source}`);
fs.mkdirSync(targetDir, { recursive: true });

let html = fs.readFileSync(source, 'utf8');
// Keep SEO authority consolidated on the original canonical while exposing the same
// product through the National Tools URL pattern used for discovery and navigation.
html = html.replace(
  '<meta property="og:url" content="https://chrisizworski.com/melvin-price/">',
  '<meta property="og:url" content="https://chrisizworski.com/national-tools/melvin-price-live/">',
);
fs.writeFileSync(target, html);
console.log('Melvin Price National Tools route synced.');
