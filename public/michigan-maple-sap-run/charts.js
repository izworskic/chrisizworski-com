/* Michigan maple sap chart: live points are exclusively derived from /api/maple-sap. */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const example=[
 {day:'Mon',low:24,high:42,score:null},{day:'Tue',low:27,high:45,score:null},
 {day:'Wed',low:36,high:49,score:null},{day:'Thu',low:22,high:40,score:null},
 {day:'Fri',low:29,high:47,score:null},{day:'Sat',low:38,high:52,score:null},
 {day:'Sun',low:26,high:43,score:null}
];
// These values are a purely illustrative teaching sketch, not 2027 forecasts or historical observations.
function seriesFromDaily(days,phase){
 if(phase!=='WEATHER_WINDOW')return {mode:'illustrative',entries:example};
 const entries=(Array.isArray(days)?days:[]).slice(0,7).map(row=>({
  day:row.date?new Date(row.date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'}):'—',
  date:row.date||null,low:Number.isFinite(row.low)?row.low:null,
  high:Number.isFinite(row.high)?row.high:null,
  score:Number.isFinite(row.score)?row.score:null,
  level:row.level||'INSUFFICIENT'
 }));
 return {mode:'live',entries};
}
function renderSvg(rows,phase,location){
 const state=seriesFromDaily(rows,phase), live=state.mode==='live';
 const entries=state.entries, W=900,H=342,left=58,right=854,top=36,bottom=219,scoreTop=255,scoreBottom=300;
 const scores=entries.filter(e=>e.score!==null).length;
 const validTemps=entries.flatMap(e=>[e.low,e.high].filter(Number.isFinite));
 const minT=validTemps.length?Math.min(0,Math.floor((Math.min(...validTemps)-5)/10)*10):0;
 const maxT=validTemps.length?Math.max(60,Math.ceil((Math.max(...validTemps)+5)/10)*10):60;
 const tempY=v=>top+(maxT-v)*(bottom-top)/(maxT-minT);
 const px=i=>left+(right-left)*(i+.5)/Math.max(7,entries.length);
 const chunks=(key)=>{let all=[],part=[];entries.forEach((d,i)=>{if(d[key]!==null){part.push([px(i),tempY(d[key])]);}else if(part.length){all.push(part);part=[];}});if(part.length)all.push(part);return all;};
 const path=seg=>seg.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const poly=(key,color)=>chunks(key).map(seg=>'<path d="'+path(seg)+'" fill="none" stroke="'+color+'" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>').join('');
 let parts=['<svg viewBox="0 0 '+W+' '+H+'" class="sap-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="sapGraphTitle sapGraphDesc">',
  '<title id="sapGraphTitle">'+(live?'Seven-day NWS sap-weather graph for '+esc(location||'Michigan'):'Example freeze and thaw temperatures — not current weather')+'</title>',
  '<desc id="sapGraphDesc">'+(live?'Blue dots are modeled overnight low temperatures, amber dots are daytime highs, and green bars are weather opportunity scores for complete forecast days.':'An educational example showing why cold nights followed by warm days can support maple sap flow. All numbers are hypothetical.')+'</desc>'];
 for(let y=Math.ceil(minT/10)*10;y<=maxT;y+=10){
  parts.push('<line x1="'+left+'" y1="'+tempY(y).toFixed(1)+'" x2="'+right+'" y2="'+tempY(y).toFixed(1)+'" stroke="#e7ede6" stroke-width="1"/><text class="chart-axis" x="'+(left-12)+'" y="'+(tempY(y)+4).toFixed(1)+'" text-anchor="end">'+y+'°</text>');
 }
 if(minT<=32&&maxT>=32)parts.push('<line x1="'+left+'" y1="'+tempY(32)+'" x2="'+right+'" y2="'+tempY(32)+'" stroke="#91633d" stroke-dasharray="5 6" stroke-width="1.4"/><text x="'+(right-4)+'" y="'+(tempY(32)-6)+'" text-anchor="end" class="chart-freeze">32°F freezing line</text>');
 parts.push('<rect x="'+left+'" y="'+scoreTop+'" width="'+(right-left)+'" height="'+(scoreBottom-scoreTop)+'" rx="8" fill="#f0f5ec"/>');
 entries.forEach((d,i)=>{
  const x=px(i),w=49;
  if(live&&d.score!==null){
   const h=d.score*(scoreBottom-scoreTop)/100;
   parts.push('<rect x="'+(x-w/2)+'" y="'+(scoreBottom-h)+'" width="'+w+'" height="'+h+'" rx="5" fill="'+(d.score>=75?'#31754b':d.score>=50?'#bd8a3a':'#96a69b')+'"/>'+
   '<text class="chart-score" x="'+x+'" y="'+(scoreBottom-h-6)+'" text-anchor="middle">'+d.score+'</text>');
  }else if(live)parts.push('<text class="chart-muted" x="'+x+'" y="'+(scoreTop+26)+'" text-anchor="middle">n/a</text>');
  parts.push('<text class="chart-day" x="'+x+'" y="326" text-anchor="middle">'+esc(d.day)+'</text>');
 });
 parts.push(poly('high','#c6812c'),poly('low','#26768b'));
 for(const [key,color] of [['high','#c6812c'],['low','#26768b']]){
 entries.forEach((d,i)=>{
 if(d[key]===null)return;
 const x=px(i),y=tempY(d[key]);
 parts.push('<circle cx="'+x+'" cy="'+y+'" r="5" fill="#fff" stroke="'+color+'" stroke-width="2.5"><title>'+esc(d.day)+(d.date?' '+esc(d.date):'')+': '+key+' '+d[key]+'°F'+(live?' forecast':' example')+'</title></circle>');
 });
 }
 parts.push('<text class="chart-axis-label" x="'+left+'" y="17">AIR TEMPERATURE °F</text>',
 '<text class="chart-axis-label" x="'+left+'" y="248">'+(live?'SAP WEATHER OPPORTUNITY INDEX · 0–100':'BELOW FREEZING OVERNIGHT / ABOVE FREEZING BY DAY')+'</text>',
 '</svg>');
 return {html:parts.join(''),mode:state.mode,scoredDays:scores,entries};
}
function update(days,phase,location){
 const host=document.getElementById('sapForecastChart');if(!host)return;
 const result=renderSvg(days,phase,location);host.innerHTML=result.html;
 const state=document.getElementById('chartState'),legend=document.getElementById('chartScoreLegend');
 if(state){
  if(result.mode==='illustrative')state.textContent=phase==='OFF_SEASON'?'Teaching example · not current weather or observed sap flow':'NWS forecast unavailable · teaching example only, not a current outlook';
  else state.textContent='Live NWS model input · '+result.scoredDays+' complete forecast days · not measured sap flow';
 }
 if(legend)legend.hidden=result.mode!=='live';
 const table=document.getElementById('chartTable');
 if(table){
  const title=result.mode==='live'?'NWS hourly-derived forecast values':'Hypothetical example values, not a forecast';
  table.innerHTML='<caption>'+esc(title)+'</caption><thead><tr><th scope="col">Day</th><th scope="col">Night low</th><th scope="col">Day high</th><th scope="col">Index</th></tr></thead><tbody>'+
  result.entries.map(x=>'<tr><th scope="row">'+esc(x.date||x.day)+'</th><td>'+esc(x.low===null?'—':x.low+'°F')+'</td><td>'+esc(x.high===null?'—':x.high+'°F')+'</td><td>'+esc(result.mode==='live'&&x.score!==null?x.score+'/100':'—')+'</td></tr>').join('')+'</tbody>';
 }
}
root.MapleSapCharts={render:update,renderSvg,seriesFromDaily};
if(typeof module!=='undefined'&&module.exports)module.exports={renderSvg,seriesFromDaily};
})(typeof window!=='undefined'?window:{});
