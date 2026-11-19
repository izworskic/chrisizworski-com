/* Source-bound Rideau journey calculations. No navigation line or live lock status.
 * JS is the public no-dependency oracle. Rust and Python independently test the policy.
 */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RideauJourneyEngine = api;
})(typeof window === 'object' ? window : null, function() {
  'use strict';
  const ROUND = n => Math.round((n + Number.EPSILON) * 10) / 10;
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const modes = new Set(['main','tay']);
  const SPEEDS = Object.freeze([4,6,8]);

  function lookup(g, id) {
    if (!g || !id) return null;
    for (const p of g.mainline || []) if (p.id === id) return {id, branch:'main', km:p.km};
    for (const p of g.tay || []) if (p.id === id) return {id, branch:'tay', km:p.km};
    return null;
  }

  function corridor(g, a, b) {
    if (!a || !b || !modes.has(a.branch) || !modes.has(b.branch)) return null;
    const junction = g.tayJunctionKmFromOttawa;
    if (!finite(junction)) return null;
    if (a.branch === b.branch) {
      return {
        km:ROUND(Math.abs(a.km - b.km)), interpretation:'official-channel-reference',
        mainRanges:a.branch==='main' ? [[Math.min(a.km,b.km),Math.max(a.km,b.km)]] : [],
        tayRanges:a.branch==='tay' ? [[Math.min(a.km,b.km),Math.max(a.km,b.km)]] : []
      };
    }
    const main = a.branch === 'main' ? a : b;
    const tay = a.branch === 'tay' ? a : b;
    return {
      km:ROUND(Math.abs(main.km - junction) + tay.km),
      interpretation:'branch-connection-estimate',
      mainRanges:[[Math.min(main.km,junction),Math.max(main.km,junction)]],
      tayRanges:[[0,tay.km]]
    };
  }

  function inRanges(km, ranges) {return ranges.some(([lo,hi])=>km >= lo && km <= hi);}
  function classifyVessel(g, vessel) {
    if (!vessel) return {status:'not-assessed',warnings:['Vessel dimensions not entered. Check station-specific limits and current charts.']};
    const c=g.sizingAdvisory || {};
    const checks=[
      ['lengthM',c.generalLockLengthM,'length'],
      ['widthM',c.generalLockWidthM,'beam'],
      ['draftM',c.approxChannelDepthM,'loaded draft'],
      ['airDraftM',c.minMainFixedClearanceM,'height above water']
    ];
    const warnings=[], supplied=Object.values(vessel).some(v=>v!==null && v!==undefined && v!=='');
    if(!supplied) return {status:'not-assessed',warnings:['Vessel dimensions not entered. Check station-specific limits and current charts.']};
    for (const [key,threshold,name] of checks){
      const v=vessel[key];
      if (v===null || v===undefined || v==='') continue;
      if(!finite(v)||v<=0||v>200) return {status:'invalid-input',warnings:['Enter positive vessel dimensions in metres. No passage assessment is available.']};
      if(finite(threshold)&&v>=threshold){
        warnings.push('Your '+name+' meets or exceeds the published general '+threshold+' m reference. It may not fit every reach. Consult official charts and local staff.');
      }
    }
    return {status:warnings.length?'possible-restriction':'not-cleared',warnings:warnings.length?warnings:['General dimensions are not a clearance approval. Local bridge positions, depth, weather, lock dimensions and notices still govern passage.']};
  }
  function planCruise(graph, locations, request={}) {
    if(!graph||!Array.isArray(graph.mainline)||!Array.isArray(graph.tay))return {ok:false,reason:'Source inventory unavailable'};
    const a=lookup(graph,request.from),b=lookup(graph,request.to);
    if(!a||!b)return {ok:false,reason:'Choose two source-identified endpoints'};
    if(a.id===b.id)return {ok:false,reason:'Choose different endpoints'};
    if(!finite(a.km)||!finite(b.km))return {ok:false,reason:'Endpoint chainage not verified'};
    const path=corridor(graph,a,b);
    if(!path)return {ok:false,reason:'No verified connection'};
    const indexed=new Map((locations?.lockLocations||[]).map(r=>[r.id,r]));
    const touched=(graph.mainline||[]).filter(p=>inRanges(p.km,path.mainRanges)).map(p=>({...p,branch:'main'}))
      .concat((graph.tay||[]).filter(p=>inRanges(p.km,path.tayRanges)).map(p=>({...p,branch:'tay'})))
      .filter(p=>indexed.has(p.id));
    touched.sort((x,y)=>x.branch===y.branch?x.km-y.km:(x.branch==='main'?-1:1));
    const lockSites=touched.map(p=>({...p,name:indexed.get(p.id).name,chambers:indexed.get(p.id).chambers,sourceUrl:indexed.get(p.id).sourceUrl,guardIncluded:!!indexed.get(p.id).guardChamberIncluded}));
    if((a.branch===b.branch&&a.km>b.km)||(a.branch==='tay'&&b.branch==='main'))lockSites.reverse();
    const bridges=(graph.bridgeReference||[]).filter(p=>inRanges(p.km,p.branch==='tay'?path.tayRanges:path.mainRanges));
    const speed=SPEEDS.includes(request.speedKmh)?request.speedKmh:null;
    const vessel=classifyVessel(graph,request.vessel);
    return {
      ok:true,from:a,to:b,distanceKm:path.km,interpretation:path.interpretation,
      sourceUrl:graph.navigationSource,lockSites,bridges,
      visibleChambers:lockSites.reduce((sum,p)=>sum+p.chambers,0),
      assumedSpeedKmh:speed,underwayHours:speed?ROUND(path.km/speed):null,
      arrivalTime:null,lockageMinutes:null,
      scheduleState:'unverified-for-future-travel',
      seasonArchiveYear:graph.operationArchive.seasonYear,
      vessel,
      notices:[
        'The '+path.km.toFixed(1)+' km figure is a channel-chainage comparison, not a charted route or booked passage.',
        'Underway-hours, if selected, are an arithmetic scenario only. No lockage, bridge delay, wind, overnight stop, congestion or waiting time is included.',
        ...(path.interpretation==='branch-connection-estimate'?[graph.tayJunctionUncertainty]:[]),
        'Operating hours and last-lockage are not verified for 2027. Check Parks Canada and current Canadian Hydrographic Service charts 1512 and 1513.',
        'Named chambers in the corridor are physical inventory, not a guaranteed lockage count. The Hog\'s Back guard chamber may not be operated in ordinary passage.'
      ]
    };
  }
  function planPaddle(graph,routeId) {
    const route=(graph?.paddling||[]).find(p=>p.id===routeId);
    if(!route)return {ok:false,reason:'No officially curated paddling trip for this selection'};
    if(!finite(route.officialKm)||!Number.isInteger(route.officialDays))return {ok:false,reason:'Missing official route measurements'};
    return {
      ok:true,id:route.id,name:route.name,sourceUrl:route.sourceUrl,
      km:route.officialKm,days:route.officialDays,putIn:route.from,takeOut:route.to,
      note:route.note,hazards:route.hazards,highlights:route.highlights,overnight:route.overnight,
      geometry:null,travelTime:null,launchStatus:'verify-approach-before-travel',
      safetyNote:'Parks Canada published this itinerary, not a digital paddling track. No open/safe-water claim is made. Check dams, wind, wake, locks and current access.'
    };
  }
  function distance(km, units='km') {
    if(!finite(km)||km<0) return 'Not verified';
    return (units==='mi'?ROUND(km*0.621371).toFixed(1)+' mi':ROUND(km).toFixed(1)+' km');
  }
  return Object.freeze({lookup,corridor,planCruise,planPaddle,distance,classifyVessel});
});
