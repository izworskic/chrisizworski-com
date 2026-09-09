import fs from 'node:fs';

const pagePath = 'public/melvin-price/index.html';
const html = fs.readFileSync(pagePath, 'utf8');
const block = /\n\s*<section class="panel" aria-labelledby="whatKnow"><h3 id="whatKnow">What we know — and what we don't<\/h3>[\s\S]*?<\/section>/;

if (!block.test(html)) {
  throw new Error('Melvin Price explainer block not found; refusing silent build drift.');
}

fs.writeFileSync(pagePath, html.replace(block, ''), 'utf8');
console.log('Removed Melvin Price source explainer block.');
