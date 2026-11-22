import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('public/michigan-winter-trails/index.html','utf8');
const css=readFileSync('public/assets/michigan-winter-trails.css','utf8');
const desk=readFileSync('public/assets/michigan-winter-trail-desk.js','utf8');
const weather=readFileSync('public/assets/michigan-winter-trail-weather.js','utf8');

test('mobile first answer is not preceded by a duplicated large caution callout',()=>{
 const intro=html.match(/<div class="trl-desk-intro">([\s\S]*?)<\/div>/)?.[1]||'';
 const lead=intro.match(/<p>([^<]*)<\/p>/)?.[1]||'';
 assert.ok(lead.length>40&&lead.length<160,'Intro must be concise and purposeful');
 assert.doesNotMatch(intro,/trl-desk-evidence|not live reports/);
 assert.match(css,/@media\(max-width:610px\)[\s\S]*?\.trl \.trl-desk-intro h1\{font-size:clamp\(2\.05rem/);
 assert.match(html,/id="trl-desk-results"/);
 assert.ok(html.indexOf('id="trl-desk-results"')<html.indexOf('id="explore"'));
});

test('compared options can inspect weather for their own stable trail ID',()=>{
 assert.match(desk,/article\.dataset\.routeId = route\.id/);
 assert.match(desk,/weather\.dataset\.weatherFor = route\.id/);
 assert.match(desk,/document\.dispatchEvent\(new CustomEvent\('winter-trails:check-weather',\{detail:\{id:route\.id\}\}\)\)/);
 assert.match(weather,/document\.addEventListener\('winter-trails:check-weather'/);
 assert.match(weather,/select\.value=id;root\.open=true/);
 assert.match(weather,/Math\.abs\(Number\(data\.referencePoint\.lat\)-Number\(card\.dataset\.lat\)\)/);
 assert.doesNotMatch(desk,/\/api\/winter-hike-lab/,'The comparison should reuse the existing weather lens, not duplicate API calls');
});

test('weather inspector provides keyboard return to the same compared trail',()=>{
 assert.match(html,/id="trl-weather-return" class="trl-weather-return" hidden/);
 assert.match(weather,/back\.hidden=false/);
 assert.match(weather,/back\.addEventListener\('click'/);
 assert.match(weather,/x\.dataset\.routeId===select\.value/);
 assert.match(weather,/target\.focus\(\{preventScroll:true\}\)/);
 assert.match(weather,/summary\.focus\(\{preventScroll:true\}\)/);
 assert.match(css,/\.trl \.trl-weather-return:focus-visible/);
});

test('winter safety, source links, 15 original dossiers, no JS and SEO/ads survive',()=>{
 assert.equal((html.match(/class="wf-story"/g)||[]).length,15);
 assert.match(html,/not live reports that the snow is ready, the trail is groomed, or the parking lot is plowed/);
 assert.match(html,/Snow depth is not plowed parking/);
 assert.match(html,/Lantern Loop/);
 assert.match(html,/Hartwick Pines State Park/);
 assert.match(html,/id="trl-winter-access"/);
 assert.match(html,/id="trl-weather-lens"/);
 assert.match(html,/href="https:\/\/www.nohrsc.noaa.gov\/nsa\/"/);
 assert.match(html,/<noscript>/);
 assert.match(html,/href="#stop-1"/);
 assert.match(html,/href="#stop-2"/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/michigan-winter-trails\/"/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 assert.equal((html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)||[]).length,1);
});
