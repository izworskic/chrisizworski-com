/* Bed succession planning; existing PlantNow frost math and GardenHistory replay are authoritative. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GardenSuccession=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DAY=86400000,dateOK=d=>typeof d==='string'&&/^\d{4}-\d\d-\d\d$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const add=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*DAY).toISOString().slice(0,10),diff=(a,b)=>(Date.parse(b)-Date.parse(a))/DAY;
const stationIds={'bay-city':'bay-city',detroit:'detroit-city','grand-rapids':'grand-rapids',kalamazoo:'kalamazoo','traverse-city':'traverse-city',marquette:'marquette-wso',houghton:'houghton'};
const families={tomatoes:'nightshade',peppers:'nightshade',potatoes:'nightshade',eggplant:'nightshade',cucumbers:'cucurbit',squash:'cucurbit',melon:'cucurbit',melons:'cucurbit',pumpkin:'cucurbit',zucchini:'cucurbit','winter-squash':'cucurbit',watermelon:'cucurbit',beans:'legume',peas:'legume',brassicas:'brassica',broccoli:'brassica','brussels-sprouts':'brassica',cabbage:'brassica','chinese-cabbage':'brassica',cauliflower:'brassica',collards:'brassica',kale:'brassica',kohlrabi:'brassica',mustard:'brassica',radishes:'brassica',rutabaga:'brassica',turnips:'brassica',beets:'amaranth',spinach:'amaranth',chard:'amaranth',lettuce:'aster',carrots:'carrot',onions:'allium',garlic:'allium',corn:'grass','sweet-corn':'grass'};
const modelCrop={Tomato:'tomatoes','Sweet pepper':'peppers',Cucumber:'cucumbers','Snap bean':'beans',Broccoli:'broccoli'};
const rotationSource='https://hort.extension.wisc.edu/articles/using-crop-rotation-home-vegetable-garden-0/';
function evaluate({plantNow,kit,frost,harvest,history,archive,planting,availableDate,candidates,bufferDays=14,bedFree=false,previousCrop}={}){
 if(!planting||!dateOK(planting.date)||!dateOK(availableDate)||availableDate<planting.date||!Object.hasOwn(stationIds,planting.siteId)||!Number.isInteger(bufferDays)||bufferDays<0||bufferDays>60||!Array.isArray(candidates)||candidates.length<1||candidates.length>3)throw Error('Choose a valid bed date, up to three crops and a 0 to 60 day buffer');
 const st=frost.station(stationIds[planting.siteId]);if(!st)throw Error('Reference frost station unavailable');
 const year=Number(availableDate.slice(0,4)),fr=plantNow.frostOf(st),spring=kit.toISO(fr.cautious,year);
 const old=previousCrop||planting.productivity?.group||modelCrop[harvest.models[planting.modelId]?.crop]||null;
 const clear=bedFree===true&&(!planting.productivity?.closedOn||availableDate>planting.productivity.closedOn);
 const rows=candidates.map(c=>{
  const crop=plantNow.CROPS.find(x=>x.id===c.cropId);if(!crop)throw Error('Choose a supported crop');
  const ref=plantNow.fallReference(crop.id),packet=c.packetDays;
  if(packet!==null&&(!Number.isInteger(packet)||packet<1||packet>365))throw Error('Packet days must be 1 to 365 from the actual starting stage');
  if(c.modelId!==null&&(!Object.hasOwn(harvest.models,c.modelId)||modelCrop[harvest.models[c.modelId].crop]!==crop.id))throw Error('Choose a matching cultivar and starting stage');
  const plan=plantNow.fallPlan(st,{year,maturityDays:packet??1,bufferDays});
  const frostDate=plan.ok?plan.referenceDate:null,deadline=frostDate?add(frostDate,-bufferDays):null;
  const packetDate=packet===null?null:add(availableDate,packet),remaining=frostDate?diff(availableDate,frostDate):null;
  const same=!!(families[old]&&families[crop.id]&&families[old]===families[crop.id]);
  const rotation=!families[old]||!families[crop.id]?'UNKNOWN':same?'SAME_FAMILY':'DIFFERENT_FAMILY';
  const warm=crop.tender===true||['warmSow','transplant','corn','basil'].includes(crop.kind);
  const current=plantNow.cropStatus(crop,st,kit.fromISO(availableDate),{});
  const supported=!!ref||crop.id==='beans';
  let status='REFERENCE_ONLY';
  if(!clear)status='BED_NOT_CONFIRMED';
  else if(!frostDate)status='NO_FROST_REFERENCE';
  else if(availableDate>=frostDate)status='PAST_FROST_REFERENCE';
  else if(packet===null)status='PACKET_NEEDED';
  else if(warm&&availableDate<spring)status='BEFORE_SPRING_REFERENCE';
  else if(Number(availableDate.slice(5,7))<3)status='OUTSIDE_OUTDOOR_SEASON';
  else if(packetDate>deadline)status='SHORT_WINDOW';
  else if(!supported||(!ref&&current.code==='NEXT_SPRING'&&crop.id!=='beans')||['NEXT_SPRING','WAIT','WAIT_SOIL','DONE'].includes(current.code)&&crop.id!=='beans')status='CALENDAR_ONLY';
  else status='CALENDAR_FITS';
  let thermal=null;
  if(archive&&c.modelId!==null&&availableDate.slice(5)!=='02-29'&&frostDate&&availableDate<frostDate){
   const m=harvest.models[c.modelId],replay=history.replay(history.unpack(archive,planting.siteId),{modelId:m.id,biofix:m.biofix,monthDay:availableDate.slice(5),packetDays:packet});
   const limit=diff(availableDate,deadline);
   thermal={modelId:m.id,endpoint:m.endpoint,biofix:m.biofix,years:replay.seasons.map(s=>({year:s.year,elapsedDays:s.elapsedDays,byBuffer:s.elapsedDays!==null&&s.elapsedDays<=limit})),count:replay.seasons.filter(s=>s.elapsedDays!==null&&s.elapsedDays<=limit).length};
  }
  return {cropId:crop.id,name:crop.name,status,rotation,referenceDays:ref?.days??null,referenceBasis:ref?.basis??null,packetDate,remainingDays:remaining,slackDays:packetDate&&deadline?diff(packetDate,deadline):null,frostDate,deadline,latestPacketStart:packet!==null&&plan.ok?plan.planningDate:null,thermal,plantingGuidance:current.detail};
 });
 const rank={CALENDAR_FITS:0,CALENDAR_ONLY:1,PACKET_NEEDED:2,SHORT_WINDOW:3,BEFORE_SPRING_REFERENCE:4,OUTSIDE_OUTDOOR_SEASON:5,PAST_FROST_REFERENCE:5,NO_FROST_REFERENCE:6,BED_NOT_CONFIRMED:7,REFERENCE_ONLY:8};
 rows.sort((a,b)=>rank[a.status]-rank[b.status]||(a.rotation==='SAME_FAMILY')-(b.rotation==='SAME_FAMILY')||(b.slackDays??-Infinity)-(a.slackDays??-Infinity));
 return {station:st.n,stationId:st.s,availableDate,bufferDays,clear,previousCrop:old,rows,rotationSource,scope:'Calendar and historical heat scenarios, not a planting clearance or future harvest forecast'};
}
return {evaluate,stationIds,families,modelCrop,rotationSource};
});
