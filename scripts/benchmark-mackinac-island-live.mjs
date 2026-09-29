import fs from 'node:fs';
// Source-level release gate for /mackinac-island/. Rewritten 2026-09-29 for the one-screen
// day sheet: the factors and weights are unchanged, the evidence is the new page's.
const html=fs.readFileSync('public/mackinac-island/index.html','utf8');
const css=fs.readFileSync('public/assets/mackinac-island.css','utf8');
const js=fs.readFileSync('public/assets/mackinac-island.js','utf8');
const route=fs.readFileSync('lib/mackinac-island/route.js','utf8');
const sheet=fs.readFileSync('lib/mackinac-island/day-sheet.js','utf8');
const all=html+'\n'+css+'\n'+js+'\n'+route+'\n'+sheet;
const pass=(...checks)=>checks.every(Boolean);
const factors={
  // One sentence of choices, one answer; no questionnaire, profile or fine-tune form.
  decision_confusion: pass(/<h1 id="page-title">Mackinac Island Trip Planner<\/h1>/.test(html),/id="tripForm"/.test(html),/id="sheetHeadline"/.test(html),!/intakeQuestion|tripProfileCard|tunePanel/.test(html))?0:1,
  // The boat back and the last boat are separate facts, on the visitor's own ferry line.
  recommendation_unreliability: pass(/Choose exactly one supplied plan id or NONE/.test(route),/function lastOnLine/.test(sheet),/DOCK_BUFFER = 25/.test(sheet),/The planner didn’t load/.test(js))?0:1,
  stale_or_unverified_data: pass(/freshness/.test(route),/published-unverified-this-request/.test(route),/failures/.test(route),/published 2026 schedules/.test(sheet),/Updated \$\{esc\(data\.local_now\.time\)\} ET/.test(js))?0:1,
  mobile_friction: pass(/viewport-fit=cover/.test(html),/\.plan-shell\{width:min\(calc\(100% - 32px\)/.test(css),/\.pick select\{[^}]*font-size:16px/.test(css),/clamp\(/.test(css))?0:1,
  generic_travel_content: pass(/This tool is trip-planning guidance/.test(html),/Two ferry docks, two ferry lines, no cars and one last boat back\./.test(html),/Leave \$\{origin\.short\} by/.test(sheet))?0:1,
  // The plan loads with sensible defaults; every choice is one pick.
  unnecessary_clicks: pass(/plan\("load"\)/.test(js),(html.match(/<select id="pick\w+"/g)||[]).length===6,/<option value="06:00" selected>/.test(html))?0:1,
  page_load_cost: pass(/<script src="\/assets\/mackinac-island\.js\?v=[^"]+" defer>/.test(html),js.length<20000,!/leaflet/i.test(js))?0:1,
  inaccessible_information: pass(/Skip to trip planner/.test(html),/:focus-within/.test(css),/aria-live="polite"/.test(html),/class="sr-only"/.test(html))?0:1,
  visual_clutter: pass(!/glassmorphism/i.test(all),!/<svg[^>]*>[^<]{0,30}<\/svg>/i.test(html),!/<details/.test(html))?0:1
};
const weights={decision_confusion:25,recommendation_unreliability:20,stale_or_unverified_data:15,mobile_friction:10,generic_travel_content:10,unnecessary_clicks:8,page_load_cost:5,inaccessible_information:4,visual_clutter:3};
const loss=Object.entries(factors).reduce((n,[k,v])=>n+weights[k]*v,0)/100;
const value={
  decision_speed:/id="sheetHeadline"/.test(html)?1:0,
  decision_confidence:/confidence/.test(route)?1:0,
  personalization:/data-pick="who"/.test(html)&&/data-pick="go"/.test(html)&&/function blockLibrary/.test(sheet)?1:0,
  live_relevance:/api\/mackinac-island/.test(js)&&/format: "sheet"/.test(js)?1:0,
  source_trust:/Sources: /.test(js)&&/Drive times are estimates, not live traffic/.test(sheet)?1:0,
  actionability:/Be at the dock by/.test(sheet)&&/Boat back/.test(sheet)?1:0,
  return_visit_value:/fall color|events|crowd/i.test(all)?1:0
};
const valueProduct=Object.values(value).reduce((a,b)=>a*b,1);
console.log(JSON.stringify({loss,factors,value,valueProduct},null,2));
if(process.argv.includes('--check')&&(loss>0||valueProduct<1)){console.error('Mackinac Island Live benchmark failed');process.exit(1)}
