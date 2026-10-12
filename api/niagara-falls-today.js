'use strict';
const {plan}=require('../lib/niagara-falls/planner.js');
const {weatherForVisit}=require('../lib/niagara-falls/weather.js');
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
  const result=plan(body);
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
  res.statusCode=200;res.end(JSON.stringify(result));
 }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message||'Could not make itinerary.'}));}
};
