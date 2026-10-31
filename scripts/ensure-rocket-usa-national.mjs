#!/usr/bin/env node
import fs from 'node:fs';

// The National Tools hub still owns parts of this directory. The main site
// owns the cross-coast launch engine; restore its one discovery card after any
// pinned hub sync, including the ItemList schema, without creating duplicates.
const file='public/synced-national-tools/index.html';
let html=fs.readFileSync(file,'utf8');
const id='rocket-launch-usa';
const href='/national-tools/rocket-launch-live/';
const canonical='https://chrisizworski.com'+href;
const marker='<section class="catalog-group national-utilities" data-catalog-group aria-labelledby="national-tools-title">';
const grid='<div class="catalog-grid">';
const card='<article class="directory-card" data-search-card data-tool-id="rocket-launch-usa" data-personas="trip event conditions" data-tags="rocket launch nasa spacex usa national atlas west coast east coast gulf pacific california vandenberg florida cape canaveral kennedy texas starbase wallops virginia kodiak alaska hawaii barking sands viewing schedule cloud closure" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="card-top"><span class="kind">National rocket launch decision engine</span><span class="season-label" hidden>Useful now</span></div><h3>Rocket Launch Live USA</h3><p class="place">Six launch regions · Atlantic, Pacific &amp; Gulf</p><p class="description">Choose the coast and a real mission. Compare schedule certainty, official range access, launch viewing places, and forecast sky cover when the timing is precise enough.</p><p class="signals"><strong>Signals:</strong> Launch Library 2 + NASA + Space Force + Starbase + NWS</p><div class="card-actions"><a class="primary-action" href="/national-tools/rocket-launch-live/">Find a U.S. launch viewing window &rarr;</a></div></article>';

const actual=(html.match(/data-tool-id="rocket-launch-usa"/g)||[]).length;
if(actual>1)throw new Error('Duplicate national rocket launch directory cards');
if(!actual){
  const start=html.indexOf(marker);
  const pos=html.indexOf(grid,start);
  if(start<0||pos<0)throw new Error('National utilities directory target unavailable');
  html=html.slice(0,pos+grid.length)+'\n'+card+'\n'+html.slice(pos+grid.length);
}
const ld=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if(!ld)throw new Error('National directory schema missing');
const schema=JSON.parse(ld[1]);
const list=schema['@graph']?.find(n=>n['@type']==='ItemList' &&
  n['@id']==='https://chrisizworski.com/national-tools/#toollist');
if(!list||!Array.isArray(list.itemListElement))throw new Error('National directory ItemList missing');
let entries=list.itemListElement.filter(e=>e.url===canonical);
if(entries.length>1)throw new Error('Duplicate national rocket ItemList entries');
if(!entries.length){
  list.itemListElement.push({
    '@type':'ListItem',position:list.itemListElement.length+1,url:canonical,
    name:'Rocket Launch Live USA — All U.S. Coasts'
  });
}
list.numberOfItems=list.itemListElement.length;
html=html.replace(ld[0],'<script type="application/ld+json">'+JSON.stringify(schema)+'</script>');
const visible=(html.match(/data-search-card/g)||[]).length;
if(visible!==list.numberOfItems)throw new Error('National directory visible/schema count mismatch');
html=html.replace(/<p class="finder-count" id="finder-count" aria-live="polite">\d+ tools shown<\/p>/,
  '<p class="finder-count" id="finder-count" aria-live="polite">'+visible+' tools shown</p>');
if(!html.includes('data-tool-id="'+id+'"')||!html.includes('href="'+href+'"'))
  throw new Error('Rocket Launch USA discovery card not fully linked');
fs.writeFileSync(file,html);
console.log('National rocket launch discovery reconciled; '+visible+' tools and one canonical ItemList entry.');
