'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'docs/visual-pilots/rocket-launch-live/preview.html'),'utf8');
const svg=fs.readFileSync(path.join(root,'docs/visual-pilots/rocket-launch-live/mission-to-shore.penpot.svg'),'utf8');
const review=fs.readFileSync(path.join(root,'docs/visual-pilots/rocket-launch-live/REVIEW.md'),'utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/);

test('pilot is an isolated noindex page and does not invent a live launch',()=>{
 assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(html,/No live schedule or access verification/);
 assert.match(html,/This prototype is not showing an actual launch time or admission status/);
 assert.doesNotMatch(html,/<script\s+src=|<link[^>]+stylesheet|\bfetch\(|navigator\.geolocation|gtag\(|adsbygoogle|\/api\/rocket-launch-usa/);
 assert.match(review,/NOT a Penpot MCP edit/);
 assert.match(review,/NOT VERIFIED/);
});

test('pilot choices are source-eligible public place examples and no pad routing',()=>{
 for(const place of ['NASA Wallops Visitor Center','Robert Reed Waterfront Park','Curtis Merritt Harbor']){
  assert(html.includes(place));
  assert(svg.includes(place));
 }
 assert.equal((html.match(/class="option" type="button" data-site="/g)||[]).length,3);
 assert.equal((html.match(/aria-pressed="false"/g)||[]).length,3);
 assert.match(html,/www\.google\.com\/maps\/search\/\?api=1&query=/);
 assert.match(html,/https:\/\/www\.nasa\.gov\/wallops\/visitor-center\/view-a-launch-from-nasa-wallops-visitor-center\//);
 assert.match(html,/https:\/\/www\.chincoteague-va\.gov\//);
 assert.doesNotMatch(html,/maps\/dir\//);
});

test('static proto script parses and implements reversible source-specific selection',()=>{
 assert(inline,'inline prototype is missing');
 assert.doesNotThrow(()=>new Function(inline[1]));
 assert.match(inline[1],/function select\(key\)/);
 assert.match(inline[1],/b\.setAttribute\('aria-pressed',String\(b\.dataset\.site===key\)\)/);
 assert.match(inline[1],/maps\.href='https:\/\/www\.google\.com\/maps\/search\//);
 assert.match(inline[1],/rules\.href=place\.rules/);
 assert.match(inline[1],/b\.addEventListener\('click',\(\)=>select\(b\.dataset\.site\)\)/);
});

test('the design respects responsive focus, reduced-motion and readable source caution',()=>{
 assert.match(html,/@media\(max-width:760px\)/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/button:focus-visible,a:focus-visible/);
 assert.match(html,/aria-live="polite" aria-atomic="true"/);
 assert.match(html,/Recheck the launch time and public access notices/);
 assert.match(inline[1],/rules\.textContent=place\.ruleLabel/);
 assert.match(html,/Check town notices/);
 assert.match(html,/rel="noopener noreferrer" target="_blank"/);
});

test('Penpot SVG is editable vector/text source, not a false claim of native design editing',()=>{
 assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 assert.match(svg,/<title id="title">Rocket Launch Live/);
 assert.match(svg,/<desc id="description">Editable Penpot-importable design frames/);
 assert((svg.match(/<text /g)||[]).length>=35,'Need real editable text layers');
 assert((svg.match(/<rect /g)||[]).length>=15,'Need editable vector regions');
 assert.match(svg,/PHONE  ·  390 PX DESIGN FRAME/);
 assert.match(svg,/DESKTOP  ·  1440 PX DESIGN FRAME/);
 assert.match(svg,/Penpot-importable/);
 assert.match(review,/MCP tool invocation:[\s\S]*UNAVAILABLE/);
 assert.doesNotMatch(svg,/<image\b|<foreignObject\b|<script\b/);
});
