'use strict';
// Niagara's release quality is multi-objective: independently inspect
// each domain; critical errors are VETOES, not tradeable for pretty imagery.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'../..');
const manifest=require('./quality-loss-manifest.json');
const {plan,validate,assess,options}=require('./planner.js');
const {items}=require('./catalog.js');
const {wayfinding}=require('./wayfinding.js');
const {compareArrival}=require('./arrival-compare.js');
function read(file,overrides){return overrides&&Object.prototype.hasOwnProperty.call(overrides,file)?overrides[file]:fs.readFileSync(path.join(base,file),'utf8');}
function has(text,pattern){return pattern.test(text);}
function matches(s,re){return (s.match(re)||[]).length;}
function willThrow(fn){try{fn();return false;}catch(_){return true;}}
function all(list,test){return list.length>0&&list.every(test);}
function parseMap(mapjs){try{new vm.Script(mapjs,{filename:'niagara-visit-map.js'});return true;}catch(_){return false;}}
function loadMap(mapjs){
 const sandbox={window:{},document:{getElementById:()=>null},setTimeout:()=>{}};
 vm.runInNewContext(mapjs,sandbox,{timeout:1000});
 return sandbox.window.NiagaraVisitMap;
}
function evaluate(options_={}){
 const overrides=options_.overrides||{};
 const html=read('public/niagara-falls-today/index.html',overrides);
 const css=read('public/assets/niagara-falls-today.css',overrides);
 const js=read('public/assets/niagara-falls-today.js',overrides);
 const map=read('public/assets/niagara-visit-map.js',overrides);
 const films=read('public/assets/niagara-visit-films.js',overrides);
 const mapHtml=html.slice(html.indexOf('id="wayfinding"'),html.indexOf('id="falls-films"'));
 const api=read('api/niagara-falls-today.js',overrides);
 const way=read('lib/niagara-falls/wayfinding.js',overrides);
 const catalog=read('lib/niagara-falls/catalog.js',overrides);
 const pkg=JSON.parse(read('package.json',overrides));
 const common={visit_date:'2026-10-13',arrival_local:'11:00',duration_minutes:240,starting_side:'US',adults:2,youth:0,priority:'boat'};
 const p=plan({...common});
 const late=plan({...common,arrival_local:'20:00'});
 const scenic=plan({...common,priority:'views',trip_style:'short',duration_minutes:120});
 const family=plan({...common,priority:'kids',trip_style:'family',duration_minutes:360,youth:1});
 const canada=plan({...common,starting_side:'CA',priority:'views',trip_style:'short',duration_minutes:120});
 const broke=plan({...common,budget:0});
 const closed=plan({...common,visit_date:'2026-11-10'});
 const w=wayfinding(p,'drive',{adults:2,children:0});
 const caw=wayfinding(canada,'transit',{origin:'rapidsview',adults:2,children:1});
 const travel=compareArrival(canada,{adults:2,children:1});
 const journey=items.find(x=>x.id==='journey');
 const caInput={...common,starting_side:'CA'};
 const parksHours={status:'VERIFIED',venues:{journey:{date:'2026-10-13',status:'PUBLISHED_SCHEDULE',open:'09:00',close:'18:00',checked_at:'2026-10-12T12:00:00Z',basis:'calendar'}}};
 const faqMatch=/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/.exec(html);
 let schema=null;try{schema=JSON.parse(faqMatch&&faqMatch[1]);}catch(_){}
 const declaredFAQ=schema&&schema['@graph']&&schema['@graph'].find(x=>x['@type']==='FAQPage');
 let mapApi=null;if(parseMap(map))try{mapApi=loadMap(map);}catch(_){}
 let mapFallbackWorks=false;
 if(mapApi&&typeof mapApi.render==='function'){
  const ids=['wayfinding-status','arrival-decision','wayfinding-stop-list','niagara-travel-choices','niagara-route-map','open-route-map','open-first-stop'];
  const nodes=Object.fromEntries(ids.map(id=>[id,{id,innerHTML:'',textContent:'',href:'',querySelectorAll:()=>[],addEventListener:()=>{}}]));
  const stub={window:{},document:{getElementById:id=>nodes[id]||null},setTimeout:()=>{}};
  try{
   vm.runInNewContext(map,stub,{timeout:1000});
   stub.window.NiagaraVisitMap.render({wayfinding:w,side:'US',status:'PLANNED'});
   mapFallbackWorks=nodes['niagara-route-map'].innerHTML.includes('Interactive map is unavailable')&&nodes['wayfinding-stop-list'].innerHTML.includes('Prospect')&&nodes['open-route-map'].href.includes('maps/dir/');
  }catch(_){}
 }
 const check={
 bad_date_rejected:willThrow(()=>validate({...common,visit_date:'2026-02-30'})),
 bad_time_rejected:willThrow(()=>validate({...common,arrival_local:'25:91'})),
 same_side:all([p,late,scenic,family],x=>x.stops.every(s=>s.currency==='USD'))&&canada.stops.every(s=>s.currency==='CAD'),
 boat_fits:p.boat_resolution&&p.boat_resolution.included&&p.stops.some(s=>s.id==='maid'),
 boat_veto:late.status==='BOAT_NOT_FEASIBLE'&&!late.boat_resolution.included&&late.stops.every(s=>s.id!=='maid'),
 short_scenic:scenic.visit_style==='short'&&scenic.stops.length===2&&scenic.stops.every(s=>s.type==='view'),
 family_constraints:family.stops[0]?.type==='view'&&family.stops.filter(s=>s.type==='paid').length<=1&&family.timeline.estimated_walking_m<=1800,
 budget_honored:!broke.boat_resolution.included&&broke.costs[0].known_admission_total<=0,
 published_hours:closed.boat_resolution.reason_code==='PUBLISHED_CLOSED'&&!closed.boat_resolution.included,
 time_buffer:all([p,late,scenic,family,canada],x=>x.timeline.contingency_minutes>=15),
 unknown_price:assess(journey,validate(caInput),parksHours).cost===null,
 unknown_hours:options(validate(caInput)).excluded.some(x=>x.id==='journey'&&x.reason==='HOURS_NOT_VERIFIED'),
 severe_hold:has(api,/WEATHER_SAFETY_HOLD/)&&has(api,/severe/)&&has(api,/result\.stops=\[\]/),
 scenic_fallback:late.verdict.includes('scenic alternative')&&late.boat_resolution.reason_code!=='BOAT_INCLUDED',
 source_trace:p.source_health.length>=4&&p.source_health.every(x=>x.source&&x.basis),
 dated_hours:options(validate({...caInput,visit_date:'2026-10-14'}),parksHours).excluded.some(x=>x.id==='journey'&&x.reason==='HOURS_NOT_VERIFIED'),
 no_border:all([p,canada,family],x=>x.cross_border_auto_planned===false),
 form_present:has(html,/id="plan-form"/)&&has(html,/id="go"/),
 form_order:html.indexOf('name="starting_side"')>0&&html.indexOf('name="starting_side"')<html.indexOf('data-niagara-preset="boat"')&&html.indexOf('data-niagara-preset="boat"')<html.indexOf('Fine-tune your plan'),
 goals_present:matches(html,/data-niagara-preset="(boat|short|family)"/g)===3&&has(js,/activePreset=id/),
 no_auto_submit:!has(js,/emit\('niagara_planner_view'\);submit\(\)/)&&has(js,/if\(hasPlanned\)submit\(\)/),
 time_default:has(js,/suggestedVisitEastern/)&&has(js,/minutes>=14\*60/)&&has(js,/Suggested: next morning/),
 first_action:has(js,/YOUR FIRST ACTION/)&&has(js,/Open directions/)&&has(html,/id="open-first-stop"/),
 timed_stops:has(js,/s\.arrival/)&&has(js,/s\.departure/)&&has(js,/compact-stop/),
 parking_first:has(js,/start-parking/)&&has(js,/wayfinding\.parking\.address/),
 accessible_feedback:has(html,/id="quick-start-note"[^>]*role="status"/)&&has(js,/quick-loading/)&&has(js,/catch\(e\)/),
 advanced_collapsed:has(html,/<details class="details">/)&&has(html,/<details class="travel-details">/),
 map_before_video:html.indexOf('id="wayfinding"')<html.indexOf('id="falls-films"'),
 map_syntax:parseMap(map),
 map_exports:!!mapApi&&typeof mapApi.render==='function'&&typeof mapApi.walkingUrl==='function',
 map_stop_parity:w.route_stops.length===p.stops.length&&w.route_stops.every((x,i)=>x.id===p.stops[i].id&&Number.isFinite(x.lat)&&Number.isFinite(x.lng)),
 no_fake_route:has(map,/dashArray/)&&has(map,/not a walking path/i)&&has(html,/not walking paths/),
 walking_directions:!!mapApi&&mapApi.walkingUrl(w).includes('maps/dir/')&&mapApi.walkingUrl(w).includes('travelmode=walking'),
 map_fallback:mapFallbackWorks,
 parking_address:!!w.parking&&w.parking.address.includes('Prospect Street')&&has(way,/niagarafallsstatepark.com/),
 no_remote_walk:!!mapApi&&!mapApi.walkingUrl(caw).includes('Upper%20Rapids')&&!mapApi.walkingUrl(caw).includes('4555'),
 no_paid_map:!has(map,/mapbox|MAPBOX_TOKEN|api\.mapbox/i)&&has(map,/cartocdn/),
 transport_unknowns:travel.choices.find(x=>x.id==='park').known_total===null&&travel.choices.find(x=>x.id==='rapidsview').known_total===54,
 video_count:matches(html,/data-niagara-clip="/g)===3,
 video_id_match:['F1D0AUIfKJk','hmQwm0drhGU','l6fu2huqWNE'].every(id=>html.includes('data-niagara-clip="'+id+'"')&&html.includes('i.ytimg.com/vi/'+id+'/')&&films.includes(id)),
 single_player:matches(html,/id="niagara-film-stage"/g)===1&&has(films,/stage\.replaceChildren\(iframe\)/),
 video_privacy:has(films,/youtube-nocookie\.com\/embed/),
 no_autoplay:!has(html,/<iframe/)&&has(films,/document\.addEventListener\('click'/),
 video_fallback_links:matches(html,/https:\/\/www\.youtube\.com\/watch\?v=/g)>=3,
 video_poster_fallback:has(films,/is-missing/)&&has(css,/film-thumb-play/),
 hero_count:matches(html,/<img src="\/assets\/niagara-falls\/photos\/horseshoe-2026\.jpg"/g)===1,
 poster_count:matches(html,/class="film-thumb"/g)===3,
 image_license:has(html,/CC BY-SA 4\.0/)&&has(html,/Chicken4War/)&&has(html,/Creative Commons|creativecommons\.org/),
 hero_alt:has(html,/<img src="\/assets\/niagara-falls\/photos\/horseshoe-2026\.jpg"[^>]*alt="Horseshoe Falls[^"]+"/),
 hero_bytes:(()=>{try{const b=fs.statSync(path.join(base,'public/assets/niagara-falls/photos/horseshoe-2026.jpg')).size;return b>=45000&&b<=1600000;}catch(_){return false;}})(),
 poster_optimization:matches(html,/loading="lazy" decoding="async" alt=""/g)===3&&has(css,/width:104px/),
 ticket_caveat:has(js,/Bookings, tickets and queues are not confirmed/)&&has(js,/Check official boat tickets/),
 source_caveat:has(html,/not live admission guarantees/i)&&has(js,/Bookings, tickets and queues are not confirmed/),
 reason_copy:has(js,/Boat ride could not fit this visit/)&&has(js,/br\.reason/),
 plain_start:has(js,/Start at /)&&has(js,/YOUR FIRST ACTION/),
 direction_disclaimer:has(html,/not walking paths/)&&has(map,/not a walking path/i),
 source_disclosure:has(js,/trip-verification/)&&has(js,/r\.source_health/),
 human_heading:has(js,/A gentler day at the Falls/)&&has(js,/Boat not possible for this selected window/),
 canonical:matches(html,/rel="canonical"/g)===1&&has(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/niagara-falls-today\/"/),
 person_identity:matches(html,/"@type":"Person"/g)===1&&has(html,/chrisizworski\.com\/#person/),
 faq_schema:!!declaredFAQ&&declaredFAQ.mainEntity.every(q=>html.includes('<summary>'+q.name+'</summary>')),
 serp_length:(()=>{const m=/<meta name="description" content="([^"]+)"/.exec(html),t=/<title>([^<]+)<\/title>/.exec(html);return !!m&&!!t&&m[1].length<=158&&t[1].length<=72;})(),
 network_links:has(read('public/niagara-border-crossing/index.html',overrides),/href="\/niagara-falls-today\/"/)&&has(read('public/national-tools/niagara-rainbow/index.html',overrides),/href="\/niagara-falls-today\/"/),
 ci_map_syntax:has(read('tests/niagara-quality-loss.test.js',overrides),/map_syntax/)&&has(read('tests/niagara-quality-loss.test.js',overrides),/quality-loss-evaluate/),
 quality_ci:!!pkg.scripts['benchmark:niagara-quality']&&has(pkg.scripts.test?String(pkg.scripts.test):'',/tests\/\*\.test\.js/)
 };
 const unknown=manifest.metrics.filter(x=>x.kind==='binary'&&!Object.prototype.hasOwnProperty.call(check,x.check));
 if(unknown.length)throw Error('Unimplemented quality measurements: '+unknown.map(x=>x.id+':'+x.check).join(','));
 const metrics=manifest.metrics.map(m=>m.kind==='human'?{...m,status:'REVIEW_REQUIRED',loss:null,evidence:'Human or rendered-browser review outstanding'}:{...m,status:check[m.check]?'PASS':'FAIL',loss:check[m.check]?0:1,evidence:'Deterministic fixture, source check or JS smoke test'});
 const measured=metrics.filter(x=>x.loss!==null),human=metrics.filter(x=>x.loss===null),fail=measured.filter(x=>x.loss>0);
 const weight=measured.reduce((s,x)=>s+x.weight,0);
 const weightedLoss=weight?measured.reduce((s,x)=>s+x.weight*x.loss,0)/weight:1;
 return {product:manifest.product,manifest_version:manifest.version,automated_release_gate:fail.length?'FAIL':'PASS',human_review_state:human.length?'REVIEW_REQUIRED':'COMPLETE',loss_score:Number(weightedLoss.toFixed(4)),measured:measured.length,unreviewed:human.length,failures:fail.map(x=>({id:x.id,component:x.component,domain:x.domain,severity:x.severity})),domains:[...new Set(metrics.map(x=>x.domain))].map(domain=>({domain,total:metrics.filter(x=>x.domain===domain).length,pass:metrics.filter(x=>x.domain===domain&&x.status==='PASS').length,fail:metrics.filter(x=>x.domain===domain&&x.status==='FAIL').length,review_required:metrics.filter(x=>x.domain===domain&&x.status==='REVIEW_REQUIRED').length})),metrics};
}
module.exports={evaluate,manifest};
