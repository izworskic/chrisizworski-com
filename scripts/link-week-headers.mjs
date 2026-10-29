import fs from 'node:fs';

const htmlFile = 'public/tools/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const replacements = [
  ['<h3>Shed antlers</h3>', '<h3><a href="/michigan-shed-antlers/">Shed antlers</a></h3>'],
  ['<h3>Maple sap weather</h3>', '<h3><a href="/michigan-maple-sap-run/">Maple sap weather</a></h3>'],
  ['<h3>Rockhounding</h3>', '<h3><a href="/michigan-rockhounding/">Rockhounding</a></h3>'],
  ['<h3>Waterfowl freeze-line</h3>', '<h3><a href="/waterfowl-freeze-line/">Waterfowl freeze-line</a></h3>'],
  ['<h3>Winter eagle watching</h3>', '<h3><a href="/winter-eagle-watching/">Winter eagle watching</a></h3>']
];

for (const [from, to] of replacements) {
  if (html.includes(from)) {
    html = html.replace(from, to);
    console.log(`Replaced: ${from} -> ${to}`);
  } else {
    console.warn(`Not found: ${from}`);
  }
}

fs.writeFileSync(htmlFile, html, 'utf8');
