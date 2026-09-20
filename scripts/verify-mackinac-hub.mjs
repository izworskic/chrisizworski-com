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
if(!main.includes('data-mackinac-surface="today"'))addFailure("clarity","root is not identified as the Today surface");
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
  if(html.includes('/assets/mackinac-island.js')||html.includes("PROFILE_API='/api/mackinac-profile'"))addFailure("architecture",`${slug} duplicates live planner client logic`);
  if(html.includes("utm_source"))addFailure("seo",`${slug} contains polluted internal/permanent URL`);
  for(const item of PRIMARY_NAV)if(!html.includes(`href="${item.path}"`))addFailure("ia",`${slug} navigation missing ${item.id}`);
}

for(const slug of SECONDARY_GOVERNED_SURFACES.filter(x=>x!=="fall")){
  const file=`public/mackinac-island/${slug}/index.html`;
  const html=read(file);
  if(!html){addFailure("ia",`missing governed search surface ${slug}`);continue;}
  if(!html.includes('mackinac-destination-nav'))addFailure("ia",`${slug} is outside the hub navigation shell`);
  if(!html.includes('/assets/mackinac-hub.js'))addFailure("continuity",`${slug} lacks shared profile continuity`);
}

const hubJs=read("public/assets/mackinac-hub.js");
if(!hubJs.includes("mackinac-trip-profile-v1"))addFailure("continuity","hub client does not read the shared Mackinac profile");
if(hubJs.length>6500)addFailure("performance","hub client grew beyond lightweight navigation/profile scope");
if(/ferry|weather|marine|availability/.test(hubJs)&&/fetch\(/.test(hubJs))addFailure("architecture","hub client appears to fetch or duplicate live decision data");

const css=read("public/assets/mackinac-intent.css")+read("public/assets/mackinac-island.css");
if(!css.includes(".mackinac-destination-nav"))addFailure("mobile","destination navigation has no shared styling");
if(!css.includes("overflow-x:auto"))addFailure("mobile","destination navigation is not horizontally usable on narrow screens");

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
