'use strict';
/*
 * Foundry source-contract replay. Executes identically against the captured
 * pre-change baseline and current scoped source. It tests the new visitor
 * handoff wiring and retained HTML safeguards, not visual viewport geometry.
 * Actual pixel bounds, keyboard and map tiles require separate browser QA.
 */
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),idx=args.indexOf('--source-root');
if(idx<0||!args[idx+1])throw Error('Foundry source root is required');
const root=args[idx+1],read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('public/michigan-winter-trails/index.html');
const css=read('public/assets/michigan-winter-trails.css');
const desk=read('public/assets/michigan-winter-trail-desk.js');
const weather=read('public/assets/michigan-winter-trail-weather.js');
const result=[];
const add=(id,passed,observed)=>result.push({id,passed:Boolean(passed),observed});
const deskIntro=(html.match(/<div class="trl-desk-intro">([\s\S]*?)<\/div>/)||[])[1]||'';
const visibleIntro=(deskIntro.match(/<p>([\s\S]*?)<\/p>/)||[])[1]||'';
const dossierBlocks=[...html.matchAll(/<article class="wf-story" id="stop-\d+"/g)];
add('first-phone-decision',
 !deskIntro.includes('trl-desk-evidence')&&visibleIntro.length>20&&visibleIntro.length<160&&
  /@media\(max-width:610px\)[\s\S]*?\.trl \.trl-desk-intro h1\{font-size:clamp\(2\.05rem/.test(css),
 'Intro characters: '+visibleIntro.length+'; oversized caution before selector: '+deskIntro.includes('trl-desk-evidence')+
 '; compact-mobile heading: '+css.includes('font-size:clamp(2.05rem'));
add('compared-trail-weather',
 /article\.dataset\.routeId\s*=\s*route\.id/.test(desk)&&
 /weather\.dataset\.weatherFor\s*=\s*route\.id/.test(desk)&&
 /new CustomEvent\('winter-trails:check-weather',\{detail:\{id:route\.id\}\}\)/.test(desk)&&
 /winter-trails:check-weather/.test(weather),
 'Comparison cards have route-bound weather action and existing weather handler: '+
 (/weather\.dataset\.weatherFor/.test(desk)&&/winter-trails:check-weather/.test(weather)));
add('return-to-same-choice',
 html.includes('id="trl-weather-return"')&&
 /back\.addEventListener\('click'/.test(weather)&&
 /x\.dataset\.routeId===select\.value/.test(weather)&&
 /target\.focus\(\{preventScroll:true\}\)/.test(weather),
 'Explicit return-to-comparison control and route-matched focus: '+html.includes('id="trl-weather-return"'));
add('winter-source-preservation',
 dossierBlocks.length===15&&
 html.includes('15 featured systems')&&
 html.includes('https://www.nohrsc.noaa.gov/nsa/')&&
 html.includes('href="https://www.weather.gov/documentation/services-web-api"')&&
 html.includes('not live reports that the snow is ready'),
 'Source-linked 15 dossiers: '+dossierBlocks.length+'; original weather/safety qualifiers retained');
add('canonical-ads-preservation',
 html.includes('rel="canonical" href="https://chrisizworski.com/michigan-winter-trails/"')&&
 html.includes('https://chrisizworski.com/#person')&&
 html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')&&
 html.includes('<noscript>'),
 'Canonical, Person, existing Auto ads and no-script guide remain in HTML');
add('map-and-weather-fallback',
 html.includes('id="wf-map-message"')&&
 html.includes('Map optional. Every trail system')&&
 html.includes('Weather at this trail area')&&
 html.includes('If the feeds are unavailable, the weather remains unknown.')&&
 /report\.replaceChildren/.test(weather),
 'Map and weather unavailable explanations remain visible in source');
process.stdout.write(JSON.stringify({cases:result})+'\n');
