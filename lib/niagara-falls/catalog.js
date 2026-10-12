'use strict';
// Operator-published schedule snapshot reviewed 2026-10-12.
// Not a live admissions, temporary closure, or inventory feed.
const REVIEWED = '2026-10-12';
const US_CAVE = 'https://www.niagarafallsstatepark.com/attractions/cave-of-the-winds/';
const US_BOAT = 'https://www.niagarafallsstatepark.com/attractions/maid-of-the-mist/';
const CA_HOURS = 'https://www.niagaraparks.com/hours-of-operations/';
const items = Object.freeze([
  {id:'prospect',name:'Prospect Point',side:'US',type:'view',duration:25,conservative:30,walk_m:0,level:true,tags:['views','photos','kids','value','easy'],cost:0,official:'https://www.niagarafallsstatepark.com/attractions/overlooks-and-vistas/',description:'Start with the American Falls overlook and orient yourself.',location:'Niagara Falls State Park, Prospect Point'},
  {id:'goat',name:'Goat Island overlooks',side:'US',type:'view',duration:35,conservative:45,level:true,tags:['views','photos','value','kids'],cost:0,official:'https://www.niagarafallsstatepark.com/attractions/overlooks-and-vistas/',description:'See the brink of Horseshoe Falls from Terrapin Point.',location:'Terrapin Point, Goat Island'},
  {id:'maid',name:'Maid of the Mist',side:'US',type:'paid',duration:60,conservative:90,level:true,tags:['boat','mist','kids','views'],cost:30.25,youth:19.75,official:US_BOAT,description:'Take the boat close to the American and Horseshoe Falls.',location:'Maid of the Mist, Observation Tower',entryBuffer:15},
  {id:'cave',name:'Cave of the Winds',side:'US',type:'paid',duration:60,conservative:85,level:false,tags:['mist','kids','views'],cost:23,youth:19,official:US_CAVE,description:'Get close to the falling water at Hurricane Deck; timed ticket required.',location:'Cave of the Winds, Goat Island',entryBuffer:20},
  {id:'table',name:'Table Rock viewpoints',side:'CA',type:'view',duration:30,conservative:35,level:true,tags:['views','photos','kids','easy','value'],cost:0,official:'https://www.niagaraparks.com/',description:'Stand beside the Canadian Horseshoe Falls brink.',location:'Table Rock Welcome Centre, Niagara Falls ON'},
  {id:'victoria',name:'Queen Victoria Park',side:'CA',type:'view',duration:30,conservative:40,level:true,tags:['views','photos','kids','easy','value'],cost:0,official:'https://www.niagaraparks.com/',description:'Panoramic look back toward both waterfalls.',location:'Queen Victoria Park, Niagara Falls ON'},
  {id:'journey',name:'Journey Behind the Falls',side:'CA',type:'paid',duration:60,conservative:85,level:true,tags:['mist','views','kids'],cost:null,official:'https://www.niagaraparks.com/visit/attractions/journey-behind-the-falls/',description:'Descend into the rock tunnels and viewing portals.',location:'Journey Behind the Falls, Niagara Falls ON'},
  {id:'cruise',name:'Niagara City Cruises',side:'CA',type:'paid',duration:60,conservative:95,level:true,tags:['boat','mist','views'],cost:null,official:'https://www.niagaraparks.com/visit/attractions/niagara-city-cruises/',description:'Canadian-side boat close to the falls.',location:'Niagara City Cruises, Niagara Falls ON'}
]);
// All transfer figures are deliberately conservative planning assumptions in minutes.
// They are not verified wheelchair routes, real-time travel, queue observations or directions.
const edges = {
  US: {prospect:{prospect:0,maid:10,goat:24,cave:30},maid:{prospect:10,maid:0,goat:28,cave:30},goat:{prospect:24,maid:28,goat:0,cave:10},cave:{prospect:30,maid:30,goat:10,cave:0}},
  CA: {table:{table:0,victoria:18,journey:8,cruise:30},victoria:{table:18,victoria:0,journey:25,cruise:18},journey:{table:8,victoria:25,journey:0,cruise:35},cruise:{table:30,victoria:18,journey:35,cruise:0}}
};
function dateBetween(d,a,b){return d>=a && d<=b;}
function minutes(t){const x=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(t||'');return x?Number(x[1])*60+Number(x[2]):NaN;}
function operating(item,date){
 const base={id:item.id,date,source:item.official,reviewed:REVIEWED,timezone:item.side==='US'?'America/New_York':'America/Toronto',open:null,lastAdmission:null,close:null,status:'UNKNOWN',basis:'Operator verification required'};
 if(item.type==='view') return {...base,status:'PUBLIC_VIEWPOINT',basis:'Public viewpoint; access may be affected by park notices, weather and daylight'};
 if(item.id==='journey'||item.id==='cruise'){
   // Date-specific, manually reviewed official Niagara Parks calendar. No inference to adjacent days.
   if(date==='2026-10-12')return {...base,status:'PUBLISHED_SCHEDULE',open:'09:00',close:item.id==='journey'?'19:00':'20:00',lastAdmission:null,basis:'Niagara Parks dated hours for October 12, 2026. Last admission and tickets are unverified; confirm with operator.',source:CA_HOURS};
   return {...base,status:'UNKNOWN',basis:'Canadian hours for this specific date have not been reviewed; do not extrapolate October 12',source:CA_HOURS};
 }
 if(item.id==='cave'){
   if(date==='2026-10-19'||date==='2026-10-20'||date==='2026-11-26'||date==='2026-12-25'||date==='2027-01-01')
     return {...base,status:'CLOSED',basis:'Published closure date'};
   let last=null;
   if(dateBetween(date,'2026-09-07','2026-10-11'))last='18:15';
   else if(dateBetween(date,'2026-10-12','2026-10-18'))last='16:15';
   else if(dateBetween(date,'2026-10-21','2026-11-25')||dateBetween(date,'2026-11-27','2026-12-23')||dateBetween(date,'2026-12-26','2026-12-31')||dateBetween(date,'2027-01-02','2027-03-31'))last='16:00';
   else if(date==='2026-12-24')last='14:15';
   return last?{...base,status:'PUBLISHED_SCHEDULE',open:'09:00',lastAdmission:last,close:null,basis:'Published last-ticket cutoff, NOT attraction closing time; timed tickets'}:base;
 }
 if(item.id==='maid'){
   if(dateBetween(date,'2026-11-09','2026-12-31'))return {...base,status:'CLOSED',basis:'Published off-season 2026 closure'};
   if(dateBetween(date,'2026-10-01','2026-11-08'))return {...base,status:'PUBLISHED_SCHEDULE',open:'09:00',lastAdmission:null,close:'17:00',basis:'Published 9am–5pm operating window; operator does not publish a last-ticket cutoff here. Boarding is first come, first served. Planner requires conservative finish before closing'};
 }
 return base;
}
module.exports={items,edges,operating,minutes,REVIEWED,CA_HOURS};
