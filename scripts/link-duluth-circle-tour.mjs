import fs from 'node:fs';

const file = 'public/lake-superior-circle-tour/index.html';
const href = '/duluth-canal-park/';
let html = fs.readFileSync(file, 'utf8');

const before = '<p class="stop-sub">The classic starting point, Canal Park, Aerial Lift Bridge, Great Lakes Aquarium</p>';
const after = '<p class="stop-sub">The classic starting point, Canal Park, Aerial Lift Bridge, Great Lakes Aquarium. Planning to watch a freighter? Check the <a href="/duluth-canal-park/">Duluth ship schedule, live cams and Aerial Lift Bridge watch</a>.</p>';

if (!html.includes(after)) {
  if (!html.includes(before)) throw new Error('Duluth Circle Tour link patch: Duluth stop anchor not found');
  html = html.replace(before, after);
  fs.writeFileSync(file, html);
}

const finalHtml = fs.readFileSync(file, 'utf8');
if ((finalHtml.match(/href="\/duluth-canal-park\/"/g) || []).length < 1) {
  throw new Error('Duluth Circle Tour link patch: contextual inbound link missing');
}
if (!finalHtml.includes('Duluth ship schedule, live cams and Aerial Lift Bridge watch')) {
  throw new Error('Duluth Circle Tour link patch: descriptive anchor text missing');
}
console.log(`Duluth Circle Tour contextual link verified: ${href}`);
