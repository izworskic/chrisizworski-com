'use strict';
const {plan,validate}=require('../lib/niagara-falls/planner.js');
const {getCanadianHours}=require('../lib/niagara-falls/parks-hours.js');
const {weatherForVisit}=require('../lib/niagara-falls/weather.js');
const {wayfinding}=require('../lib/niagara-falls/wayfinding.js');
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Allow','POST, OPTIONS');
 if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
 if(req.method!=='POST'){res.statusCode=405;res.end(JSON.stringify({error:'Use POST to create an itinerary.'}));return;}
 try{
  if(Number(req.headers['content-length']||0)>8192)throw Error('Planner request too large.');
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const input=validate(body);
  const caHours=input.side==='CA'?await getCanadianHours(input.date):null;
  const result=plan(body,new Date(),caHours);
  result.weather=await weatherForVisit(result.side,result.visit_local_date);
  const severe=(result.weather.alerts||[]).some(a=>/\b(tornado warning|severe thunderstorm warning|flash flood warning|blizzard warning)\b/i.test(a.headline));
  if(severe){
   result.status='WEATHER_SAFETY_HOLD';
   result.verdict='A severe regional weather warning applies. Check official instructions before attempting outdoor stops.';
   result.confidence='LIMITED';
   result.stops=[];result.first_action=null;
   result.costs[0].known_admission_total=0;
   result.timeline.contingency_minutes=result.duration_minutes;
   result.unknowns.push('Suggested outdoor itinerary suspended while severe weather warning is active.');
  }
  if(result.weather.status==='SOURCE_UNAVAILABLE'){
   result.confidence='LIMITED';
   result.unknowns.push('Official regional weather alerts unavailable.');
  }
  // The boat is an explicit visitor goal. If arrival is too late, suggest a
  // confirmed published operating window on a later date, never invent a
  // same-day boat slot or substitute scenic stops without disclosure.
  const boat=result.boat_resolution;
  if(boat?.status==='UNAVAILABLE'&&result.status!=='WEATHER_SAFETY_HOLD'&&!['PRICE_NOT_VERIFIED','OVER_BUDGET','ACCESS_ROUTE_UNVERIFIED','BOAT_NOT_ENOUGH_TIME'].includes(boat.reason_code)){
   for(let offset=1;offset<=2&&!boat.next_option;offset++){
    const date=new Date(input.date+'T12:00:00Z');
    date.setUTCDate(date.getUTCDate()+offset);
    const dateString=date.toISOString().slice(0,10);
    const nextHours=input.side==='CA'?await getCanadianHours(dateString):null;
    // Three sensible next-morning starts, all tested with the full feasibility
    // engine, so this is a planning opportunity rather than ticket inventory.
    for(const arrival_local of ['09:00','09:30','10:00','11:00']){
     const proposed=plan({...body,visit_date:dateString,arrival_local},new Date(),nextHours);
     if(proposed.boat_resolution?.included){
      boat.next_option={visit_date:dateString,arrival_local,boat_name:proposed.boat_resolution.boat_name,
       scheduled_close:proposed.boat_resolution.published_hours?.close||null,
       source_url:proposed.boat_resolution.operator_url,verification:'PUBLISHED_HOURS_NOT_TICKET_AVAILABILITY'};
      break;
     }
    }
   }
  }
  // Build arrival guidance from the same selected stops, after severe weather veto.
  result.wayfinding=result.status==='WEATHER_SAFETY_HOLD'?null:wayfinding(result,body.arrival_mode,{adults:input.adults,children:input.youth,wegoIncluded:body.wego_included===true,rapidsviewIncluded:body.rapidsview_included===true});
  res.statusCode=200;res.end(JSON.stringify(result));
 }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message||'Could not make itinerary.'}));}
};
