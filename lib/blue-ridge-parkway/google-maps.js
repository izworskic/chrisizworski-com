"use strict";

const GOOGLE_MAPS_MAX_WAYPOINTS=9;
const TARGET_GAP_MILES=65;

function finite(n){return Number.isFinite(Number(n));}
function key(point){return finite(point?.lat)&&finite(point?.lon)?`${Number(point.lat).toFixed(5)},${Number(point.lon).toFixed(5)}`:"";}
function coord(point){return`${Number(point.lat).toFixed(5)},${Number(point.lon).toFixed(5)}`;}
function uniquePoints(points){const seen=new Set();return(points||[]).filter(point=>{const k=key(point);if(!k||seen.has(k))return false;seen.add(k);return true;});}
function ordered(points,startMile,endMile){const southbound=Number(endMile)>Number(startMile);return points.slice().sort((a,b)=>southbound?Number(a.milepost)-Number(b.milepost):Number(b.milepost)-Number(a.milepost));}
function maxGap(points,startMile,endMile){const values=[Number(startMile),Number(endMile),...(points||[]).map(p=>Number(p.milepost)).filter(Number.isFinite)].sort((a,b)=>a-b);let gap=0;for(let i=1;i<values.length;i++)gap=Math.max(gap,values[i]-values[i-1]);return gap;}
function chooseRoutingPoints({stops=[],anchors=[],startMile,endMile,maxUnique=GOOGLE_MAPS_MAX_WAYPOINTS,forceTurn=false}){
  const planned=uniquePoints(stops).filter(p=>finite(p.milepost));
  const candidates=uniquePoints(anchors).filter(p=>finite(p.milepost)&&!planned.some(s=>key(s)===key(p)));
  const chosen=planned.slice(0,maxUnique);
  let plannedComplete=chosen.length===planned.length;
  if(forceTurn&&chosen.length<maxUnique&&candidates.length){
    const turn=candidates.slice().sort((a,b)=>Math.abs(Number(a.milepost)-Number(endMile))-Math.abs(Number(b.milepost)-Number(endMile)))[0];
    if(turn&&!chosen.some(p=>key(p)===key(turn)))chosen.push(turn);
  }
  while(chosen.length<maxUnique&&candidates.length&&maxGap(chosen,startMile,endMile)>TARGET_GAP_MILES){
    let bestIndex=-1,bestGain=-1;
    const before=maxGap(chosen,startMile,endMile);
    for(let i=0;i<candidates.length;i++){
      const candidate=candidates[i];if(chosen.some(p=>key(p)===key(candidate)))continue;
      const after=maxGap([...chosen,candidate],startMile,endMile),gain=before-after;
      if(gain>bestGain){bestGain=gain;bestIndex=i;}
    }
    if(bestIndex<0||bestGain<=0)break;
    chosen.push(candidates.splice(bestIndex,1)[0]);
  }
  return{points:ordered(uniquePoints(chosen),startMile,endMile),plannedComplete};
}
function buildGoogleMapsHandoff({start,destination,stops=[],anchors=[],startMile,endMile,roundTrip=false}){
  if(!start||!destination||!finite(start.lat)||!finite(start.lon)||!finite(destination.lat)||!finite(destination.lon))return{url:"",complete:false,plannedStopCount:stops.length,routeAnchorCount:0,waypointCount:0};
  const planned=uniquePoints(stops);
  const maxUnique=roundTrip?Math.min(5,Math.floor((GOOGLE_MAPS_MAX_WAYPOINTS+1)/2)):GOOGLE_MAPS_MAX_WAYPOINTS;
  const selected=chooseRoutingPoints({stops:planned,anchors,startMile,endMile,maxUnique,forceTurn:roundTrip});
  let waypointPoints=selected.points;
  let returnConstrained=true;
  if(roundTrip){
    if(waypointPoints.length<=5&&waypointPoints.length){waypointPoints=[...waypointPoints,...waypointPoints.slice(0,-1).reverse()];}
    else returnConstrained=false;
  }
  waypointPoints=waypointPoints.slice(0,GOOGLE_MAPS_MAX_WAYPOINTS);
  const p=new URLSearchParams({api:"1",origin:coord(start),destination:coord(destination),travelmode:"driving"});
  if(waypointPoints.length)p.set("waypoints",waypointPoints.map(coord).join("|"));
  const selectedKeys=new Set(selected.points.map(key)),plannedComplete=selected.plannedComplete&&planned.every(stop=>selectedKeys.has(key(stop)));
  const routeAnchorCount=selected.points.filter(point=>!planned.some(stop=>key(stop)===key(point))).length;
  return{
    url:`https://www.google.com/maps/dir/?${p.toString()}`,
    complete:plannedComplete,
    plannedStopCount:planned.length,
    routeAnchorCount,
    waypointCount:waypointPoints.length,
    returnConstrained,
    mobileBrowserMayLimit:waypointPoints.length>3
  };
}

module.exports={GOOGLE_MAPS_MAX_WAYPOINTS,TARGET_GAP_MILES,chooseRoutingPoints,buildGoogleMapsHandoff};
