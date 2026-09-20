const SOURCE='https://gis.myfwc.com/mapping/rest/services/Projects_FWC/HAB_forDEP_Dashboard/MapServer/0/query';
const SOURCE_PAGE='https://gis.myfwc.com/mapping/rest/services/Projects_FWC/HAB_forDEP_Dashboard/MapServer/0';
const RANK={
  'not present/background (0-1,000)':0,
  'very low (>1,000-10,000)':1,
  'low (>10,000-100,000)':2,
  'medium (>100,000-1,000,000)':3,
  'high (>1,000,000)':4
};

function haversine(a,b,c,d){
  const r=3958.7613,toRad=x=>x*Math.PI/180;
  const dLat=toRad(c-a),dLon=toRad(d-b);
  const q=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.sqrt(q));
}
function abundanceRank(value=''){return RANK[String(value).trim().toLowerCase()]??-1;}
function labelFor(rank){return ['background / not present','very low','low','medium','high'][Math.max(0,rank)]||'unknown';}
function decision(samples){
  if(!samples.length)return {level:'insufficient',headline:'Insufficient recent sampling nearby',detail:'FWC has no sample in the latest eight-day feed within 25 miles of this point. That is not an all-clear.'};
  const top=Math.max(...samples.map(s=>s.rank));
  if(top<=0)return {level:'background',headline:'Recent nearby samples are background / not present',detail:'The recent FWC samples within 25 miles do not show elevated Karenia brevis. Conditions can vary between sample sites and after sampling.'};
  if(top===1)return {level:'very-low',headline:'Very low Karenia brevis detected nearby',detail:'At least one recent sample within 25 miles is above background, but remains in FWC’s very-low category.'};
  if(top===2)return {level:'low',headline:'Low Karenia brevis detected nearby',detail:'At least one recent sample within 25 miles is in FWC’s low category. Check the exact sample locations before choosing a beach.'};
  if(top===3)return {level:'medium',headline:'Medium Karenia brevis detected nearby',detail:'At least one recent sample within 25 miles is in FWC’s medium category. Local beach impacts may be meaningful and can vary with wind and currents.'};
  return {level:'high',headline:'High Karenia brevis detected nearby',detail:'At least one recent sample within 25 miles is in FWC’s high category. Use the sample map and local health/beach guidance before making plans.'};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  try{
    const params=new URLSearchParams({where:'1=1',outFields:'HAB_ID,SampleDate_t,LOCATION,LATITUDE,LONGITUDE,Abundance,ExportDate',returnGeometry:'false',f:'json'});
    const response=await fetch(`${SOURCE}?${params}`,{headers:{'User-Agent':'ChrisIzworskiOutdoorTools/1.0'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error(`FWC ${response.status}`);
    const data=await response.json();
    if(data.error)throw new Error(data.error.message||'FWC query error');
    const samples=(data.features||[]).map(f=>f.attributes||{}).map(a=>({
      id:a.HAB_ID||null,date:a.SampleDate_t||null,location:a.LOCATION||'Unnamed sampling location',
      lat:Number(a.LATITUDE),lon:Number(a.LONGITUDE),abundance:a.Abundance||'unknown',rank:abundanceRank(a.Abundance),
      exportDate:Number.isFinite(Number(a.ExportDate))?new Date(Number(a.ExportDate)).toISOString():null
    })).filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&s.rank>=0);
    const counts={background:0,veryLow:0,low:0,medium:0,high:0};
    for(const s of samples){if(s.rank===0)counts.background++;if(s.rank===1)counts.veryLow++;if(s.rank===2)counts.low++;if(s.rank===3)counts.medium++;if(s.rank===4)counts.high++;}
    const highest=samples.length?Math.max(...samples.map(s=>s.rank)):-1;
    const statewide={sampleCount:samples.length,highestCategory:highest>=0?labelFor(highest):null,counts};
    const lat=Number(req.query?.lat),lon=Number(req.query?.lon);
    let local=null;
    if(Number.isFinite(lat)&&Number.isFinite(lon)){
      const nearest=samples.map(s=>({...s,distanceMi:Number(haversine(lat,lon,s.lat,s.lon).toFixed(1))})).sort((a,b)=>a.distanceMi-b.distanceMi);
      const within25=nearest.filter(s=>s.distanceMi<=25);
      local={lat,lon,radiusMi:25,decision:decision(within25),samplesWithin25:within25.length,nearest:nearest.slice(0,10)};
    }
    res.status(200).json({ok:true,generatedAt:new Date().toISOString(),source:{name:'Florida Fish and Wildlife Conservation Commission (FWC-FWRI)',url:SOURCE_PAGE,coverage:'Most recent eight days; exported daily by FWC'},statewide,local,samples:samples.slice(0,500),limits:['Sample evidence is not a beach-safety guarantee.','No nearby sample does not mean no red tide.','Conditions can vary between sample sites and change after collection.']});
  }catch(error){
    res.status(502).json({ok:false,error:'FWC red tide sample feed is temporarily unavailable.',detail:String(error?.message||error),source:SOURCE_PAGE});
  }
};
