'use strict';
// Versioned, read-only contract for Michigan-specific guidance used by other garden tools.
const E = require('../lib/plant-now');
module.exports = function handler(req,res) {
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, max-age=300, s-maxage=1800');
  if(req.method!=='GET') return res.status(405).json({version:'1.0',error:'method_not_allowed'});
  const query=req.query||{},place=typeof query.place==='string'?query.place.trim():'';
  if(!place||place.length>80) return res.status(400).json({version:'1.0',error:'invalid_place'});
  const loc=E.locate(place);
  if(!loc) return res.status(404).json({version:'1.0',error:'place_not_found'});
  const today=E.detroitToday();
  const plan=E.gardenPlan(loc.station,E.CROPS.map(c=>c.id),{dateISO:today.iso});
  return res.status(200).json({version:'1.0',asOf:today.iso,location:loc.label,station:loc.station.n,
    frost:{spring25:loc.station.p25,fallTypical:E.frostOf(loc.station).fallText},
    crops:plan.crops.map(x=>({id:x.cropId,name:x.crop.name,status:x.current.status,code:x.current.code,title:x.current.title,detail:x.current.detail,sourceRules:x.current.rules})),
    rules:E.RULES,sources:E.SOURCES,limitation:'Historical station frost references and regional growing guides are not a forecast or a measurement in your garden.'});
};
