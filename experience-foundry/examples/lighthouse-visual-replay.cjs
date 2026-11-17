'use strict';
// Pure, bounded source replay: the same checks run against the captured baseline
// and the candidate tree. Photographic loading and actual interaction are proven
// separately in browser QA, not by this static scan.
const fs=require('node:fs');
const path=require('node:path');
const root=process.argv[process.argv.indexOf('--source-root')+1];
if(!root||root.startsWith('--'))throw Error('Missing --source-root');
function file(p){const full=path.resolve(root,p);if(!full.startsWith(path.resolve(root)+path.sep))throw Error('Bad source path');return fs.existsSync(full)?fs.readFileSync(full,'utf8'):''}
const page=file('public/frozen-lighthouses-michigan/index.html');
const desk=file('public/assets/frozen-lighthouse-desk.js');
const css=file('public/assets/frozen-lighthouse-field-guide.css');
const api=file('api/lighthouse-ice.js');
const media=file('data/frozen-lighthouse-photography.json');
let photos=[];
try{photos=JSON.parse(media).photos||[]}catch{}
const char=(str,s)=>str.includes(s);
const lum=hex=>[0,2,4].map(n=>parseInt(hex.slice(n,n+2),16)/255).reduce((a,c,i)=>
 a+(c<=.04045?c/12.92:((c+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0);
const ratio=(x,y)=>{const a=lum(x),b=lum(y);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
const palette=css.includes('color-scheme:light')&&css.includes('--bg:#f7f6f2')&&
 css.includes('--ink:#172c36')&&ratio('172c36','f7f6f2')>=7&&
 ratio('475c66','f7f6f2')>=4.5&&ratio('ffffff','204d60')>=4.5;
const license=photos.length===3&&photos.every(photo=>photo.sourcePage.startsWith('https://commons.wikimedia.org/wiki/File:')&&
 photo.licenseUrl.startsWith('https://creativecommons.org/licenses/')&&
 page.includes(photo.sourcePage)&&page.includes(photo.licenseUrl));
const photoHero=char(page,'class="hero-photo"')&&
 char(page,'st-joseph-winter-1280.webp')&&char(page,'Historical, not live.')&&
 char(page,'Don Ashley');
const linkIDs=['st-joseph-outer','grand-haven','holland'];
const wired=linkIDs.every(id=>char(page,'data-select-lighthouse="'+id+'"'))&&
 char(desk,'link.dataset.selectLighthouse')&&char(desk,'render(true)')&&license&&
 char(page,'id="winter-gallery"');
const keepSource=char(page,'rel="canonical" href="https://chrisizworski.com/frozen-lighthouses-michigan/"')&&
 char(page,'https://chrisizworski.com/#person')&&
 char(page,'class="warning"')&&char(page,'<section class="faq">')&&
 char(page,'https://api.weather.gov/')&&char(api,'nwsForecast');
const singleAds=(page.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)||[]).length===1&&
 char(page,'id="current-verdict"')&&char(page,'id="lighthouse-results"')&&
 char(desk,'frozen-lighthouse-ready')&&char(api,"'/api/ice'");
const cases=[
 {id:'historic-photo',passed:photoHero&&license,observed:photoHero&&license?'St. Joseph licensed historical hero photo and attribution present.':'No licensed historical St. Joseph hero and visible credit in source.'},
 {id:'place-connected',passed:wired,observed:wired?'Three distinct photo choices connect to native lighthouse site selection.':'Photo gallery was absent or not wired to all three named pier IDs.'},
 {id:'light-palette',passed:palette,observed:palette?'Snow, stone, dark ink and key-action contrast ratios meet checked static targets.':'Light field-guide stylesheet or principal text/action contrast checks are absent.'},
 {id:'original-source-truth',passed:keepSource,observed:keepSource?'Canonical Person, official weather source and warnings remain available in static HTML.':'An original source, identity, canonical or warning invariant is missing.'},
 {id:'single-source-ad-policy',passed:singleAds,observed:singleAds?'Single AdSense loader and original forecast source/selector contracts remain.':'Original source or single-ad-loader contract is broken.'}
];
process.stdout.write(JSON.stringify({cases})+'\n');
