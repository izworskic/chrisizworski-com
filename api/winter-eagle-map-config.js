'use strict';
// One-read, non-sensitive public map configuration for the eagle finder.
// Mapbox 'pk.' browser tokens are public by design; never expose 'sk.' secrets.
module.exports = function handler(req,res) {
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control','public, max-age=300, s-maxage=600');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET')return res.status(405).json({enabled:false,error:'Method not allowed'});
  const token=String(process.env.MAPBOX_KEY||'').trim();
  if(!/^pk\.[a-zA-Z0-9._-]{12,}$/.test(token)){
    return res.status(200).json({enabled:false,provider:'openstreetmap',detail:'Mapbox public browser token unavailable; open basemap fallback active.'});
  }
  return res.status(200).json({enabled:true,provider:'mapbox',style:'light-v11',token});
};
