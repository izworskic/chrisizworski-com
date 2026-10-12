'use strict';
const {plan}=require('../lib/niagara-falls/planner.js');
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
  res.statusCode=200;res.end(JSON.stringify(result));
 }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message||'Could not make itinerary.'}));}
};
