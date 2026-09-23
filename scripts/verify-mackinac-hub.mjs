import fs from "node:fs";
import {PRIMARY_NAV,PRIMARY_GENERATED_SURFACES,SECONDARY_GOVERNED_SURFACES} from "./mackinac-site-architecture.mjs";

let hardFail=false;
const failures=[];
const addFailure=(dimension,msg)=>{failures.push({dimension,msg});console.error(`[${dimension}] ${msg}`);};
const read=p=>fs.existsSync(p)?fs.readFileSync(p,"utf8"):"";
const unique=a=>new Set(a).size===a.length;

const paths=PRIMARY_NAV.map(x=>x.path);
if(PRIMARY_NAV.length>8)addFailure("ia","primary navigation exceeds eight items");
if(!unique(PRIMARY_NAV.map(x=>x.id)))addFailure("ia","duplicate primary navigation ids");
if(!unique(paths))addFailure("ia","duplicate primary navigation paths");

const main=read("public/mackinac-island/index.html");
if(!main)addFailure("ia","missing Mackinac root page");
for(const item of PRIMARY_NAV){
  if(!main.includes(`href="${item.path}"`))addFailure("ia",`root navigation missing ${item.id}`);
}
if(!main.includes('data-mackinac-surface="my-trip"'))addFailure("clarity","root is not identified as the My Trip workspace");
if(!main.includes("Build Your Mackinac Island Trip"))addFailure("clarity","root does not lead with trip creation");
if(main.includes('data-mackinac-nav="plan"'))addFailure("ia","root still exposes Plan as a competing primary workspace");
if(!main.includes('id="profileLogistics"')&&!main.includes('class="profile-logistics"'))addFailure("continuity","root intake does not collect practical trip logistics");
if(!main.includes("/assets/mackinac-hub.js"))addFailure("continuity","root is missing shared hub client");

const primaryPaths=[];
for(const slug of PRIMARY_GENERATED_SURFACES){
  const file=`public/mackinac-island/${slug}/index.html`;
  primaryPaths.push(file);
  const html=read(file);
  if(!html){addFailure("ia",`missing primary page ${slug}`);continue;}
  if(html.length<6000)addFailure("seo",`${slug} is too thin to be a primary destination page`);
  if(!html.includes(`rel="canonical" href="https://chrisizworski.com/mackinac-island/${slug}/"`))addFailure("seo",`${slug} canonical mismatch`);
  if(!html.includes('Truth boundary:'))addFailure("truth",`${slug} missing truth boundary`);
  if(!html.includes('data-trip-context'))addFailure("continuity",`${slug} missing saved-profile continuation surface`);
  if(!html.includes('/assets/mackinac-hub.js'))addFailure("continuity",`${slug} missing shared hub client`);
  if((slug==="where-to-stay"||slug==="dining"||slug==="around-the-straits")&&!html.includes("data-place-id="))addFailure("continuity",`${slug} catalog cannot be reordered by shared trip intelligence`);
  if(html.includes('/assets/mackinac-island.js')||html.includes("PROFILE_API='/api/mackinac-profile'"))addFailure("architecture",`${slug} duplicates live planner client logic`);
  if(html.includes("utm_source"))addFailure("seo",`${slug} contains polluted internal/permanent URL`);
  for(const item of PRIMARY_NAV)if(!html.includes(`href="${item.path}"`))addFailure("ia",`${slug} navigation missing ${item.id}`);
}

for(const slug of SECONDARY_GOVERNED_SURFACES){
  const file=`public/mackinac-island/${slug}/index.html`;
  const html=read(file);
  if(!html){addFailure("ia",`missing governed search surface ${slug}`);continue;}
  if(!html.includes('mackinac-destination-nav'))addFailure("ia",`${slug} is outside the hub navigation shell`);
  if(!html.includes('/assets/mackinac-hub.js'))addFailure("continuity",`${slug} lacks shared profile continuity`);
}

const hubJs=read("public/assets/mackinac-hub.js");
if(!hubJs.includes("mackinac-trip-profile-v1"))addFailure("continuity","hub client does not read the shared Mackinac profile");
if(hubJs.length>18000)addFailure("performance","shared Mackinac intelligence client exceeds the compact cross-page budget");
if(!hubJs.includes("/api/mackinac-profile"))addFailure("continuity","hub client does not use the shared profile/surface intelligence API");
if(!hubJs.includes("mackinac_surface_personalized"))addFailure("clarity","hub client does not expose a personalized page decision");
if(!hubJs.includes("mackinac-trip-plan-v1"))addFailure("continuity","hub pages do not read the shared practical trip state");
if(!hubJs.includes("mackinac_trip_gate_shown"))addFailure("clarity","unplanned subpage visitors are not routed through the root trip builder");
if(!hubJs.includes("Using your saved Mackinac plan"))addFailure("continuity","downstream pages do not visibly acknowledge the inherited trip");
if(hubJs.includes("/api/mackinac-island"))addFailure("architecture","hub client must not duplicate the live ferry/weather planner API");
if(!hubJs.includes("profile-fit-badge"))addFailure("clarity","hub client does not visibly apply place-fit ranking");

const css=read("public/assets/mackinac-intent.css")+read("public/assets/mackinac-island.css");
if(!css.includes(".mackinac-destination-nav"))addFailure("mobile","destination navigation has no shared styling");
if(!css.includes("overflow-x:auto"))addFailure("mobile","destination navigation is not horizontally usable on narrow screens");
if(!css.includes(".platform-focus-card"))addFailure("mobile","shared trip focus has no integrated responsive styling");
// Progressive disclosure applies to the detailed planner controls, never to the answer.
// This check used to require the content stack itself to be hidden until intake, which
// withheld a complete zero-input decision (score, ferries out and back, last boat, weather,
// crowds, bike, itinerary) from every first-time visitor.
if(!css.includes("body:not(.mackinac-plan-ready) .trip-tuning"))addFailure("clarity","root does not progressively disclose the detailed planner");
for(const sel of [".decision-head",".decision-grid",".primary-rec",".content-stack",".planning-banner"]){
  if(css.includes(`body:not(.mackinac-plan-ready) ${sel}`))addFailure("clarity",`root withholds ${sel} until intake; the zero-input answer must render first`);
}
if(/body:not\(\.mackinac-plan-ready\) \.mackinac-destination-nav/.test(css))addFailure("clarity","destination navigation is hidden until intake");
if(!css.includes(".profile-logistics-grid"))addFailure("mobile","root trip logistics have no responsive layout");
if(!css.includes("@media(max-width:390px)"))addFailure("mobile","shared trip intelligence lacks 390px treatment");

const sitemap=read("public/sitemap.xml");
for(const item of PRIMARY_NAV){
  const loc=`https://chrisizworski.com${item.path}`;
  if(!sitemap.includes(`<loc>${loc}</loc>`))addFailure("seo",`sitemap missing primary surface ${item.id}`);
}

const governance=read("docs/mackinac-destination-hub-governance.md");
for(const phrase of ["One engine, many surfaces","JEV remains bounded","Fit is not availability","L ≤ 0.05","V ≥ 0.90"]){
  if(!governance.includes(phrase))addFailure("architecture",`governance missing required contract: ${phrase}`);
}

const dimensionFailure={
  ia:failures.some(x=>x.dimension==="ia")?1:0,
  clarity:failures.some(x=>x.dimension==="clarity")?1:0,
  continuity:failures.some(x=>x.dimension==="continuity")?1:0,
  truth:failures.some(x=>x.dimension==="truth"||x.dimension==="architecture")?1:0,
  seo:failures.some(x=>x.dimension==="seo")?1:0,
  mobile:failures.some(x=>x.dimension==="mobile")?1:0,
  performance:failures.some(x=>x.dimension==="performance")?1:0
};
const loss=.22*dimensionFailure.ia+.18*dimensionFailure.clarity+.16*dimensionFailure.continuity+.14*dimensionFailure.truth+.12*dimensionFailure.seo+.10*dimensionFailure.mobile+.08*dimensionFailure.performance;
const utility=1-Math.max(dimensionFailure.ia,dimensionFailure.clarity);
const trust=1-dimensionFailure.truth;
const continuity=1-dimensionFailure.continuity;
const discoverability=1-dimensionFailure.seo;
const mobile=1-dimensionFailure.mobile;
const value=utility*trust*continuity*discoverability*mobile;

if(loss>.05)addFailure("release",`hub loss ${loss.toFixed(2)} exceeds 0.05`);
if(value<.90)addFailure("release",`hub value product ${value.toFixed(2)} is below 0.90`);
hardFail=failures.length>0;
if(hardFail)process.exit(1);
console.log(`PASS: Mackinac destination hub architecture. loss=${loss.toFixed(2)} value=${value.toFixed(2)} primary_nav=${PRIMARY_NAV.length} generated_primary=${PRIMARY_GENERATED_SURFACES.length}`);
