'use strict';
// Deployment-only adapter; the actual water data implementation is the
// immutable owner artifact in lib, verified by its Git blob hash.
module.exports = async function handler(req,res) {
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    res.setHeader('Cache-Control','no-store');
    return res.status(405).json({error:'GET only'});
  }
  if(req.query?.health!=='1'){
    const {lat,lon}=req.query||{};
    if(typeof lat!=='string'||typeof lon!=='string'||!lat.trim()||!lon.trim()||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))||Math.abs(Number(lat))>90||Math.abs(Number(lon))>180){
      res.setHeader('Cache-Control','no-store');
      return res.status(400).json({error:'Valid lat and lon are required.'});
    }
  }
  const owner=await import('../lib/garden-water-owner-api-c82dda3c.mjs');
  return owner.default(req,res);
};
