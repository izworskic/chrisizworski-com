"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("public/lake-effect-snow/index.html","utf8");
const hero=html.slice(html.indexOf('<section class="hero"'),html.indexOf('</div></section>\n<div class="main shell">'));
test("hero uses real, credited lake-effect weather photography—not dark satellite imagery",()=>{
 assert.match(html,/Snowfall_descending_on_the_Buffalo_Southtowns_%2827940598775%29\.jpg/);
 assert.match(hero,/Photo: Shawn Smith \/ NOAA Weather in Focus/);
 assert.match(hero,/CC BY 2\.0 credit/);
 assert.match(hero,/Not a current radar or satellite image/);
 assert.doesNotMatch(hero,/Historic satellite imagery: NASA|A few degrees of wind shift can move/);
 assert.doesNotMatch(hero,/<img[^>]+loading="lazy"/);
 assert.match(html,/<meta property="og:image" content="https:\/\/upload\.wikimedia\.org\//);
});
test("compact hero puts the snowbelt selector next, preserves H1 and app IDs",()=>{
 assert.equal((hero.match(/<h1\b/g)||[]).length,1);
 assert.ok(hero.length<2700,"Hero and controls must remain in one compact content group");
 assert.match(html,/\.hero\{[^}]*padding:26px 0 21px/);
 assert.match(html,/@media\(max-width:760px\)[^\n]*\.hero\{padding:16px 0 17px/);
 assert.match(html,/\.main\{padding:13px 0 48px\}/);
 assert.ok(html.indexOf('<main id="lake-effect-main">')>0);
 assert.ok(html.indexOf('<div class="panel hero-chooser"')>html.indexOf('<section class="hero"'));
 assert.ok(html.indexOf('<div class="panel hero-chooser"')<html.indexOf('</div></section>\n<div class="main shell">'));
 assert.equal((html.match(/id="choose-title"/g)||[]).length,1,"one selector title, not duplicated");
 assert.ok(html.indexOf('id="check"')<html.indexOf('</div></section>\n<div class="main shell">'),"select-and-check action occurs before any hero/main ad gap");
 for(const id of ["state","region","check","locate","dashboard","headline","forecast-explainer","radar-explorer"])
 assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/national-snowpack-melt\.vercel\.app\/assets\/lake-effect\.js/);
 assert.match(html,/national-snowpack-melt\.vercel\.app\/assets\/lake-effect-radar\.js/);
 assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/lake-effect-snow\/"/);
 assert.match(html,/chrisizworski\.com\/#person/);
});
