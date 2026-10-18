'use strict';
// CARTO Basemaps are browser-facing and require a domain-restricted public key.
// This endpoint intentionally NEVER serves Mapbox, CARTO platform API access,
// or any other server-side credential. A missing basemap key selects an openly
// licensed vector fallback instead of loading watermarked CARTO raster tiles.
module.exports = function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=300, s-maxage=600');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET')return res.status(405).json({enabled:false,error:'Method not allowed'});
  const key=String(process.env.CARTO_BASEMAP_PUBLIC_KEY||'').trim();
  // Reject whitespace / query injection. Keys stay URL-encoded on the client.
  if(key && /^[A-Za-z0-9._~+-]{10,512}$/.test(key)){
    return res.status(200).json({
      enabled:true,
      provider:'carto',
      styleUrl:'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      key
    });
  }
  return res.status(200).json({
    enabled:false,
    provider:'openfreemap',
    styleUrl:'https://tiles.openfreemap.org/styles/liberty',
    message:'CARTO public basemap key not configured; using interactive vector map.'
  });
};
