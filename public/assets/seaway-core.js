/* Shared Seaway display math. Observations, examples, and reference geometry stay separate. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SeawayCore=factory();})(typeof window==='object'?window:this,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function fresh(v,now=Date.now()) {const age=now-Date.parse(v.seen);return /^\d{9}$/.test(String(v.mmsi))&&Number.isFinite(age)&&age>=-60000&&age<=1800000&&Number.isFinite(v.lat)&&Number.isFinite(v.lon);}
  function visible(vessels,region,query='',kind='all',now=Date.now()) {
    const term=query.trim().toLowerCase();
    return vessels.filter(v=>fresh(v,now)&&(region==='all'||v.regionIds?.includes(region))&&(!term||(v.name||'').toLowerCase().includes(term)||v.mmsi.includes(term))&&(kind!=='cargo'||(v.shipType>=70&&v.shipType<90)));
  }
  function motion(v) {return !Number.isFinite(v.speedKnots)?'Speed unreported':v.speedKnots<0.5?'Slow or stopped':v.speedKnots.toFixed(1)+' kn reported';}
  function direction(v) {
    const bearing=Number.isFinite(v.heading)?v.heading:Number.isFinite(v.speedKnots)&&v.speedKnots>=.5&&Number.isFinite(v.course)?v.course:null;
    if(bearing===null)return 'Heading unreported';
    return ['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/45)%8]+' reported heading';
  }
  function distance(a,b) {
    const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r;
    return 6371*2*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2));
  }
  function fit(length,beam) {
    if(!Number.isFinite(length)||!Number.isFinite(beam)||length<=0||beam<=0||length>500||beam>100)return null;
    return {length,beam,remainingLength:233.5-length,remainingBeam:24.4-beam,withinReference:length<=233.5&&beam<=24.4};
  }
  function monthly(rows,year,field='vessel_transits') {
    return Array.from({length:12},(_,i)=>{
      const key=year+'-'+String(i+1).padStart(2,'0')+'-01';
      const r=rows.find(x=>x.month?.slice(0,10)===key),raw=r?.[field];
      const value=raw===undefined||raw===null||raw===''?null:Number(raw);
      return {month:i+1,value:Number.isFinite(value)?value:null};
    });
  }
  // Educational sequence, not elapsed real lockage time. Lower water is left,
  // upper water right. A downbound vessel reverses entry, water change and exit.
  function lockFrame(progress,lift=11.6,down=false) {
    const p=clamp(Number(progress)||0,0,100),high=200-clamp(lift,0,15)*7;
    const change=clamp((p-35)/35,0,1),start=down?high:200,end=down?200:high;
    const water=p<35?start:p>70?end:start+(end-start)*change;
    let x=p<25?(-110+(p/25)*465):p>80?355+((p-80)/20)*465:355;
    if(down)x=710-x;
    const stage=p<25?0:p<35?1:p<70?2:p<80?3:4;
    return {progress:p,stage,water,x,high,lowerOpen:down?p>=80:p<25,upperOpen:down?p<25:p>=80,changing:p>=35&&p<70};
  }
  return {fresh,visible,motion,direction,distance,fit,monthly,lockFrame,clamp};
});
