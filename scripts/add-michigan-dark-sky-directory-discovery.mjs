import fs from 'node:fs';

const target=process.env.NATIONAL_TOOLS_DIRECTORY_FILE||'public/synced-national-tools/index.html';
let html=fs.readFileSync(target,'utf8');
const link='/national-tools/dark-sky/michigan/';
const cards=[...html.matchAll(/<article class="directory-card"[^>]*data-tool-id="aurora"[^>]*>[\s\S]*?<\/article>/g)];
if(cards.length!==1)throw new Error('Expected one canonical Aurora catalog card in synced National Tools directory');
let card=cards[0][0];
const existing=[...html.matchAll(/href="\/national-tools\/dark-sky\/michigan\/"/g)].length;
if(existing>1)throw new Error('Duplicate Michigan dark-sky directory links');
if(existing===0){
 const addition='<div class="tool-variants" data-dark-sky-bridge="michigan"><strong>Go from sky forecast to a real viewing park</strong><div class="variant-links"><a href="'+link+'">Michigan dark-sky parks, forecasts and arrival guidance</a></div></div>';
 if(!card.includes('</article>'))throw new Error('Aurora card closing tag missing');
 card=card.replace('</article>',addition+'</article>');
}
const tags=card.match(/data-tags="([^"]*)"/);
if(!tags)throw new Error('Aurora catalog search terms missing');
if(!tags[1].includes('stargazing'))card=card.replace('data-tags="'+tags[1]+'"','data-tags="'+tags[1]+' stargazing dark sky protected parks michigan access"');
html=html.replace(cards[0][0],card);
if(!html.includes('data-dark-sky-bridge="michigan"')||!html.includes('href="'+link+'"'))throw new Error('Michigan dark-sky guide not discoverable from Aurora card');
fs.writeFileSync(target,html);
console.log('National Tools Aurora-to-Michigan-dark-sky discovery linked');
