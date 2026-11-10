'use strict';
const { timingSafeEqual } = require('node:crypto');
const { getCached511,getPollHealth,refresh511 } = require('../lib/nyc-crossing/ny511');

function isAuthorized(req, env=process.env) {
  const secret=env.CRON_SECRET;
  const supplied=String(req.headers?.authorization||'');
  if(!secret||!supplied.startsWith('Bearer '))return false;
  const a=Buffer.from(supplied.slice(7)),b=Buffer.from(secret);
  return a.length===b.length&&timingSafeEqual(a,b);
}
module.exports = async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method&&req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  if(req.query?.action==='cron'){
    if(!isAuthorized(req))return res.status(401).json({error:'UNAUTHORIZED'});
    const refreshed=await refresh511();
    return res.status(200).json(refreshed);
  }
  const [snapshot,pollHealth]=await Promise.all([getCached511(),getPollHealth()]);
  // Public output contains only bounded per-source state, never credentials,
  // upstream URLs, raw provider errors or unfiltered incidents.
  return res.status(200).json({...snapshot,pollHealth});
};
module.exports.isAuthorized=isAuthorized;
