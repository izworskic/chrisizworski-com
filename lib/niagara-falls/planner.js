'use strict';
const {items,edges,operating,minutes,REVIEWED}=require('./catalog.js');
const PRIORITIES=['views','boat','mist','kids','easy','value','photos'];
function localNow(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now).split('/').join('-');}
function time(m){return String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function validate(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid planner input');
 const date=v.visit_date;
 if(typeof date!=='string'||!/^20\d\d-\d\d-\d\d$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Choose a valid visit date.');
 const start=minutes(v.arrival_local);if(!Number.isFinite(start))throw Error('Choose a valid Eastern arrival time.');
 const duration=Number(v.duration_minutes);if(!Number.isInteger(duration)||duration<60||duration>720)throw Error('Choose 1–12 hours.');
 const side=v.starting_side==='CA'?'CA':'US';
 const priority=PRIORITIES.includes(v.priority)?v.priority:'views';
 const adults=Math.max(1,Math.min(20,Number.isInteger(v.adults)?v.adults:2));
 const youth=Math.max(0,Math.min(20,Number.isInteger(v.youth)?v.youth:0));
 const budget=v.budget==null||v.budget===''?null:Number(v.budget);
 if(budget!==null&&(!Number.isFinite(budget)||budget<0||budget>100000))throw Error('Enter a valid budget.');
 return {date,start,duration,side,priority,adults,youth,budget,stepFree:v.step_free===true,lowWalking:v.low_walking===true,wantsBorder:v.cross_border===true,documents:v.documentation_confirmed===true};
}
function money(item,v){return item.cost===null?null:Math.round((item.cost*v.adults+(item.youth??item.cost)*v.youth)*100)/100;}
function assess(item,v){
 const hours=operating(item,v.date);
 if(item.side!==v.side)return {ok:false,code:'BORDER_NOT_PLANNED',hours};
 if(item.type==='paid'&&v.stepFree&&!item.level)return {ok:false,code:'ACCESS_ROUTE_UNVERIFIED',hours};
 if(hours.status==='CLOSED')return {ok:false,code:'PUBLISHED_CLOSED',hours};
 if(hours.status==='UNKNOWN')return {ok:false,code:'HOURS_NOT_VERIFIED',hours};
 const cost=money(item,v);
 if(item.type==='paid'&&v.budget!==null&&cost===null)return {ok:false,code:'PRICE_NOT_VERIFIED',hours};
 if(item.type==='paid'&&v.budget!==null&&cost>v.budget)return {ok:false,code:'OVER_BUDGET',hours};
 return {ok:true,hours,cost};
}
function movement(from,to,side){return edges[side]?.[from]?.[to]??null;}
function options(v){
 const offered=items.filter(i=>i.side===v.side);
 const checked=offered.map(item=>({item,assess:assess(item,v)}));
 return {ok:checked.filter(x=>x.assess.ok),excluded:checked.filter(x=>!x.assess.ok).map(x=>({id:x.item.id,name:x.item.name,reason:x.assess.code,source:x.assess.hours.source,details:x.assess.hours.basis}))};
}
function simulate(order,v){
 const stops=[];let clock=v.start;let cost=0;let walk=0;let prior=v.side==='US'?'prospect':'table';
 for(const {item,assess:a} of order){
   const transfer=movement(prior,item.id,v.side);if(transfer===null)return null;
   const moving=v.lowWalking?Math.ceil(transfer*1.3):transfer;
   // Wait/boarding allowance is baked into conservative dwell; entryBuffer prevents missing ticket cutoff.
   const entry=clock+moving+(item.entryBuffer||0);
   if(a.hours.open&&entry<minutes(a.hours.open))return null;
   if(a.hours.lastAdmission&&entry>minutes(a.hours.lastAdmission))return null;
   const finish=clock+moving+item.conservative;
   if(finish>v.start+v.duration-15)return null; // hard contingency floor
   const stepMeters=Math.ceil(transfer*65);
   walk+=stepMeters;
   if(v.lowWalking&&walk>1250)return null;
   if(v.stepFree&&walk>2000)return null;
   cost+=a.cost||0;if(v.budget!==null&&cost>v.budget)return null;
   stops.push({id:item.id,name:item.name,type:item.type,description:item.description,arrival:time(clock+moving),departure:time(finish),transfer_minutes:moving,dwell_minutes:item.conservative,entry_allowance_minutes:item.entryBuffer||0,estimated_walking_m:stepMeters,official_url:item.official,location:item.location,cost:a.cost,currency:v.side==='US'?'USD':'CAD',schedule:a.hours});
   prior=item.id;clock=finish;
 }
 if(!stops.length)return null;
 const tags=new Set(order.flatMap(x=>x.item.tags));
 const match=tags.has(v.priority)?100:20;
 const iconic=tags.has('views')?100:45;
 const used=clock-v.start;
 const transfer=stops.reduce((s,x)=>s+x.transfer_minutes,0);
 const travel=Math.max(0,100-Math.round(transfer/Math.max(1,used)*170));
 const budgetFit=cost===0?100:v.budget===null?80:Math.max(0,Math.round(100*(1-cost/Math.max(1,v.budget))));
 const confidence=order.every(x=>x.item.type==='view')?70:60; // manual published hours, not current live closure
 const variety=Math.min(12,6*(tags.has('views')&&tags.has('boat')?1:0)+6*(tags.has('views')&&tags.has('mist')?1:0));
 const utility=.35*match+.2*iconic+.15*travel+.1*budgetFit+.2*confidence+variety-Math.max(0,order.length-3)*3;
 return {stops,score:Math.round(utility*10)/10,cost,walking_m:walk,travel_minutes:transfer,ends:time(clock),buffer_minutes:v.duration-used,unknowns:['Queue, timed-entry inventory and temporary closures are not monitored live.','Transfer times are planning estimates, not live route guidance.']};
}
function permutations(values,max=4){
 const out=[];function walk(seq,rest){if(seq.length)out.push([...seq]);if(seq.length===max)return;for(let i=0;i<rest.length;i++)walk([...seq,rest[i]],rest.filter((_,j)=>j!==i));}
 walk([],values);return out;
}
function plan(raw,now=new Date()){
 const v=validate(raw);const {ok,excluded}=options(v);
 const possible=permutations(ok).map(s=>simulate(s,v)).filter(Boolean);
 possible.sort((a,b)=>b.score-a.score||b.stops.length-a.stops.length||b.buffer_minutes-a.buffer_minutes||a.walking_m-b.walking_m||a.cost-b.cost||a.stops.map(s=>s.id).join(',').localeCompare(b.stops.map(s=>s.id).join(',')));
 const winning=possible[0]||null;
 const scenic=items.filter(i=>i.side===v.side&&i.type==='view');
 const fallback=winning||simulate([{item:scenic[0],assess:assess(scenic[0],v)}],v);
 const selected=fallback||{stops:[],cost:0,ends:time(v.start),buffer_minutes:v.duration,walking_m:0,score:0,unknowns:[]};
 const picked=new Set(selected.stops.map(x=>x.id));
 const skipped=[...excluded,...ok.filter(x=>!picked.has(x.item.id)).map(x=>({id:x.item.id,name:x.item.name,reason:'LOWER_FIT_OR_TIME',source:x.item.official}))].slice(0,6);
 const type=selected.stops.some(x=>x.type==='paid')?'PUBLISHED_HOURS_NOT_LIVE':'SCENIC_PLAN';
 return {engine_version:'1.0.0',plan_id:'nia-'+v.date+'-'+v.side+'-'+selected.stops.map(s=>s.id).join('-'),generated_at:now.toISOString(),visit_local_date:v.date,arrival_local:time(v.start),duration_minutes:v.duration,side:v.side,priority:v.priority,status:selected.stops.length?(selected.stops.some(s=>s.type==='paid')?'PLANNED_WITH_VERIFICATION':'SCENIC_FALLBACK'):'NO_FEASIBLE_STOP',verdict:selected.stops.length?'Start at '+selected.stops[0].name+' — '+selected.stops.length+' feasible stops on the '+(v.side==='US'?'New York':'Ontario')+' side.':'No verified attraction itinerary fits this window.',first_action:selected.stops[0]||null,stops:selected.stops,timeline:{ends_local:selected.ends,contingency_minutes:selected.buffer_minutes,estimated_walking_m:selected.walking_m},costs:[{currency:v.side==='US'?'USD':'CAD',known_admission_total:selected.cost,excludes:'Parking, taxes where applicable, undisclosed child pricing and any additional admissions'}],excluded:skipped,alternatives:possible.slice(1,4).filter(p=>p.stops.map(s=>s.id).join(',')!==selected.stops.map(s=>s.id).join(',')).map(p=>({label:p.stops.map(s=>s.name).join(' → '),stop_ids:p.stops.map(s=>s.id),walking_m:p.walking_m,known_cost:p.cost})),confidence:type==='PUBLISHED_HOURS_NOT_LIVE'?'MODERATE':'LIMITED',unknowns:[...selected.unknowns,...(v.wantsBorder?['Cross-border itineraries are not auto-recommended: documentation and official wait data must be checked separately.']:[]),...(v.stepFree?['The route geometry has not been independently accessibility audited; verify step-free paths with operators.']:[])],source_health:ok.map(x=>({entity_id:x.item.id,status:x.assess.hours.status,basis:x.assess.hours.basis,source:x.assess.hours.source,reviewed:x.assess.hours.reviewed})),links_to_official:{us:'https://www.niagarafallsstatepark.com/',ca:'https://www.niagaraparks.com/hours-of-operations/',border:'https://chrisizworski.com/niagara-border-crossing/',rainbow:'https://chrisizworski.com/national-tools/niagara-rainbow/'},what_changed:'Static official schedule snapshot reviewed '+REVIEWED+'; no live ticket inventory, closures, weather or wait monitoring. Date-specific published rules, not live opening confirmation.',cross_border_auto_planned:false};
}
module.exports={plan,validate,assess,simulate,options,localNow};
