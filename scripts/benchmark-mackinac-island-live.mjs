import fs from 'node:fs';
const html=fs.readFileSync('public/mackinac-island/index.html','utf8');
const css=fs.readFileSync('public/assets/mackinac-island.css','utf8');
const js=fs.readFileSync('public/assets/mackinac-island.js','utf8');
const route=fs.readFileSync('lib/mackinac-island/route.js','utf8');
const all=html+'\n'+css+'\n'+js+'\n'+route;
const pass=(...checks)=>checks.every(Boolean);
const factors={
  decision_confusion: pass(/Mackinac Island Today/.test(html),/Best time to arrive/.test(html),/primaryRec/.test(js),/Why this plan fits today/.test(html))?0:1,
  recommendation_unreliability: pass(/Choose exactly one supplied plan id or NONE/.test(route),/recommended_return/.test(route),/last_scheduled_return/.test(route),/not guessing at a ferry time/i.test(js))?0:1,
  stale_or_unverified_data: pass(/freshness/.test(route),/published-unverified-this-request/.test(route),/source_failures|failures/.test(route),/What this plan is using/.test(html))?0:1,
  mobile_friction: pass(/max-width:390px/.test(css),/viewport-fit=cover/.test(html),/hero-actions/.test(css),/@container decision \(max-width:760px\)/.test(css),/orientation:landscape/.test(css))?0:1,
  generic_travel_content: pass(/This tool is trip-planning guidance/.test(html),/Which ferry gets you onto the Island best/.test(html),/Make it your Mackinac/.test(html))?0:1,
  unnecessary_clicks: pass(/Best time to arrive/.test(html),/Downtown crowds/.test(html),/Biking/.test(html),/Head back/.test(html))?0:1,
  page_load_cost: pass(/defer/.test(html),/IntersectionObserver/.test(js),/loadLeaflet/.test(js))?0:1,
  inaccessible_information: pass(/Skip to live decision/.test(html),/:focus-visible/.test(css),/aria-live/.test(html),/aria-pressed/.test(html))?0:1,
  visual_clutter: pass(!/glassmorphism/i.test(all),!/<svg[^>]*>[^<]{0,30}<\/svg>/i.test(html),/decision-grid/.test(html))?0:1
};
const weights={decision_confusion:25,recommendation_unreliability:20,stale_or_unverified_data:15,mobile_friction:10,generic_travel_content:10,unnecessary_clicks:8,page_load_cost:5,inaccessible_information:4,visual_clutter:3};
const loss=Object.entries(factors).reduce((n,[k,v])=>n+weights[k]*v,0)/100;
const value={decision_speed:/Best time to arrive/.test(html)?1:0,decision_confidence:/confidence/.test(route)?1:0,personalization:/persona/.test(route)&&/personaChips/.test(html)?1:0,live_relevance:/api\/mackinac-island/.test(js)?1:0,source_trust:/What this plan is using/.test(html)?1:0,actionability:/For an easy start, take the/.test(js)&&/Head back/.test(html)?1:0,return_visit_value:/fall color|events|crowd/i.test(all)?1:0};
const valueProduct=Object.values(value).reduce((a,b)=>a*b,1);
console.log(JSON.stringify({loss,factors,value,valueProduct},null,2));
if(process.argv.includes('--check')&&(loss>0||valueProduct<1)){console.error('Mackinac Island Live benchmark failed');process.exit(1)}
