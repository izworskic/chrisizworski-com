'use strict';
const { timingSafeEqual } = require('node:crypto');
const { getCached511,refresh511 } = require('../lib/nyc-crossing/ny511');

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
  const snapshot=await getCached511();
  // A read-only diagnostic of the same distributed cache consumed by /api/nyc-crossing.
  // The normalized items intentionally contain no auth details or unrestricted feed payload.
  return res.status(200).json(snapshot);
};
module.exports.isAuthorized=isAuthorized;
