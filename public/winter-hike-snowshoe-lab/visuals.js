/* Pure HTML/SVG weather interpretation for the winter hike research preview.
 * Browser: window.WinterHikeVisuals. Tests: CommonJS module.
 * No charting CDN, paid API, synthetic weather history or scroll-coupled popups.
 */
(function(root,factory){
 const v=factory();
 if(typeof module==='object'&&module.exports)module.exports=v;
 if(root)root.WinterHikeVisuals=v;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=(x,fallback='—')=>Number.isFinite(x)?String(x):fallback;
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const dateLabel=d=>{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d||'')))return 'Unknown';
   const t=new Date(d+'T12:00:00Z');
   return Number.isNaN(t.getTime())?'Unknown':t.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
 };
 const hours=(r)=>Array.isArray(r)?r.filter(x=>Number.isFinite(x?.temperatureF)&&
   Number.isFinite(x?.windMph)&&typeof x?.hourLocal==='string').slice(0,7):[];
 const unit=(x,suffix)=>Number.isFinite(x)?num(x)+suffix:'Unknown';
 function trendAnalysis(trend){
   if(trend?.status!=='forecast'||!Array.isArray(trend.days))return 'Seven-day forecast unavailable. This is not an observed weather history.';
   const available=trend.days.filter(d=>d.status==='complete'&&Number.isFinite(d.highF));
   if(available.length<2)return 'Not enough complete daytime forecasts to describe a temperature direction.';
   const change=available[available.length-1].highF-available[0].highF;
   const suffix=' between the first and last complete NWS daytime windows; snow depth is NOT projected from this.';
   return change>=5?'Warming signal: daytime forecast peaks rise about '+change+'°F'+suffix:
     change<=-5?'Cooling signal: daytime forecast peaks fall about '+Math.abs(change)+'°F'+suffix:
       'Relatively steady forecast peaks ('+(change>0?'+':'')+change+'°F change)'+suffix;
 }
 function weekChart(trend,selectedDate){
   if(trend?.status!=='forecast'||!trend.days?.length)
     return '<div class="wx-no-data">Seven-day outlook unavailable. No values have been interpolated.</div>';
   const data=trend.days.slice(0,7);
   const valid=data.filter(d=>Number.isFinite(d.lowF)&&Number.isFinite(d.highF));
   const floor=valid.length?Math.floor((Math.min(...valid.map(d=>d.lowF),32)-5)/10)*10:20;
   const ceil=valid.length?Math.ceil((Math.max(...valid.map(d=>d.highF),32)+5)/10)*10:50;
   const range=Math.max(20,ceil-floor);
   const pct=v=>clamp((v-floor)/range*100,0,100);
   const freeze=pct(32);
   const cards=data.map(d=>{
    const active=d.date===selectedDate?' is-active':'';
    const available=Number.isFinite(d.lowF)&&Number.isFinite(d.highF);
    const low=available?d.lowF+'°':'—',high=available?d.highF+'°':'—';
    const left=available?pct(d.lowF):0,width=available?Math.max(1,pct(d.highF)-left):0;
    const caution=d.status==='partial'?'Partial window':d.status==='unavailable'?'Missing hours':'10–4 local';
    const rain=Number.isInteger(d.rainHours)&&d.rainHours>0?' · '+d.rainHours+' rain-indicated h':'';
    return '<button type="button" class="wx-day'+active+'" data-wx-day="'+esc(d.date)+'"'+
     ' aria-pressed="'+(d.date===selectedDate?'true':'false')+'" aria-label="'+esc(dateLabel(d.date)+
       ', '+(available?d.lowF+' to '+d.highF+' degrees Fahrenheit':'no complete forecast')+
       ', '+caution+', select this day')+'">'+
      '<span class="wx-day-name">'+esc(dateLabel(d.date))+'</span>'+
      '<span class="wx-range-chart" style="--freeze:'+freeze.toFixed(2)+'%;--left:'+left.toFixed(2)+'%;--width:'+width.toFixed(2)+'%">'+
      '<span class="wx-freeze-line"></span>'+(available?'<span class="wx-range-line"></span>':'<span class="wx-range-empty">?</span>')+
      '</span><span class="wx-day-temps">'+esc(low)+' <span aria-hidden="true">→</span> '+esc(high)+'</span>'+
      '<span class="wx-day-note">'+esc(caution+rain)+'</span></button>';
   }).join('');
   return '<div class="wx-week-chart"><div class="wx-scale">NWS daytime temperatures (°F): '+
    '<strong>'+esc(String(floor))+'°</strong><span>32°F freezing threshold</span><strong>'+esc(String(ceil))+'°</strong></div>'+
    '<div class="wx-week-days" role="group" aria-label="Select an NWS forecast date">'+cards+'</div></div>';
 }
 function hourlyChart(timeline){
   const rows=hours(timeline);
   if(rows.length<5)return '<div class="wx-no-data">Hourly weather chart unavailable; fewer than five valid forecast hours were supplied.</div>';
   const W=520,H=180,left=34,right=16,top=18,bottom=35;
   const vals=rows.map(r=>r.temperatureF),lo=Math.floor((Math.min(...vals,32)-5)/5)*5,
     hi=Math.ceil((Math.max(...vals,32)+5)/5)*5;
   const span=Math.max(10,hi-lo);
   const x=i=>left+(W-left-right)*(rows.length===1?.5:i/(rows.length-1));
   const y=t=>top+(hi-t)/span*(H-top-bottom);
   const line=rows.map((r,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(r.temperatureF).toFixed(1)).join(' ');
   const grid=[lo,32,hi].filter((v,i,a)=>a.indexOf(v)===i).map(v=>'<line x1="'+left+
    '" y1="'+y(v).toFixed(1)+'" x2="'+(W-right)+'" y2="'+y(v).toFixed(1)+
    '" stroke="'+(v===32?'#ae7a33':'#cadcd1')+'" stroke-width="1"'+
    (v===32?' stroke-dasharray="6 5"':'')+'/>'+
    '<text x="27" y="'+(y(v)-4).toFixed(1)+'" fill="#52665b" text-anchor="end" font-size="11">'+v+'°</text>').join('');
   const dots=rows.map((r,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(r.temperatureF).toFixed(1)+
    '" r="4.5" fill="#206b56" stroke="#fff" stroke-width="1.5"/>'+
    '<text x="'+x(i).toFixed(1)+'" y="'+(y(r.temperatureF)-12).toFixed(1)+
    '" text-anchor="middle" font-size="12" fill="#164a3d">'+r.temperatureF+'°</text>'+
    '<text x="'+x(i).toFixed(1)+'" y="170" text-anchor="middle" font-size="11" fill="#52665b">'+
    esc(r.hourLocal.slice(0,2))+'</text>').join('');
   const winds=rows.map((r,i)=>'<button type="button" class="wx-wind-hour" data-wx-hour="'+i+
    '" aria-label="'+esc(r.hourLocal+', wind '+r.windMph+' miles per hour, temperature '+
      r.temperatureF+' degrees, '+r.shortForecast)+'">'+
    '<span class="wx-wind-bar" style="height:'+Math.max(6,Math.min(100,r.windMph/35*100))+'%"></span>'+
    '<strong>'+esc(num(r.windMph))+'</strong><small>'+esc(r.hourLocal.slice(0,2))+'</small></button>').join('');
   return '<div class="wx-hourly-stack"><div class="wx-graph-scroll"><svg viewBox="0 0 '+W+' '+H+
    '" role="img" aria-label="NWS hourly temperature line with dashed 32-degree freezing threshold">' +
    grid+'<path d="'+line+'" fill="none" stroke="#146f54" stroke-width="3.5" stroke-linejoin="round"/>'+
    dots+'</svg></div>'+
    '<div class="wx-wind-heading"><strong>Wind by the hour</strong><span>mph · select a bar for conditions</span></div>'+
    '<div class="wx-wind-chart" role="group" aria-label="Select hourly wind and forecast information">'+winds+'</div>'+
    '<div class="wx-hour-detail" id="wx-hour-detail" aria-live="polite">'+esc(rows[0].hourLocal)+
    ': '+esc(rows[0].temperatureF)+'°F, wind '+esc(rows[0].windMph)+' mph. '+esc(rows[0].shortForecast)+'.</div></div>';
 }
 function snowGauge(snow){
   const ok=snow?.kind==='modeled'&&Number.isFinite(snow.depthInches);
   if(!ok)return '<div class="wx-no-data">NOAA grid snow depth unavailable. Not equivalent to zero snow.</div>';
   const depth=snow.depthInches,pos=clamp(depth/12*100,0,100);
   const description=depth<2?'Very little modeled snow: hiking may be worth investigating.':
     depth<6?'Intermediate modeled cover: check whether the route is packed, icy or suitable for snowshoes.':
       'Substantial modeled cover: snowshoes may help, but this is not measured trail snow.';
   return '<div class="wx-snow-figure"><div class="wx-snow-value"><strong>'+esc(num(depth))+
    ' in</strong><span>NOAA modeled snow depth · '+esc(snow.validDate||'date missing')+'</span></div>'+
    '<div class="wx-snow-scale" role="img" aria-label="'+esc('Modeled snow '+depth+
    ' inches on a zero-to-twelve-plus-inch reference scale; not a measured trail depth')+'">'+
     '<span class="wx-snow-zone wx-snow-low" style="width:16.6667%"></span>'+
     '<span class="wx-snow-zone wx-snow-mid" style="width:33.3333%"></span>'+
     '<span class="wx-snow-zone wx-snow-high" style="width:50%"></span>'+
     '<span class="wx-snow-marker" style="left:'+pos.toFixed(2)+'%"></span></div>'+
     '<div class="wx-snow-ticks"><span>0″</span><span>2″</span><span>6″</span><span>12″+</span></div>'+
     '<p class="wx-interpretation">'+esc(description)+'</p>'+
     '<p class="wx-footnote">Thresholds are planning heuristics, not a trail measurement, historical snow trend, or guaranteed snowshoe suitability.</p></div>';
 }
 function hazards({forecast,alerts}){
   const f=forecast||{},a=alerts||{};
   const risks=[
    ['Freeze/thaw',f.targetCovered===false?'Unknown':f.freezeThaw?'Forecast crossing 32°F':'Not indicated in selected daytime hours',f.targetCovered===false?'unknown':f.freezeThaw?'caution':'neutral'],
    ['Rain / glaze',f.targetCovered===false?'Unknown':f.freezingRain?'Freezing precipitation indicated':f.rainOrFreezingRain?'Rain indicated':'Not indicated in selected hours',f.targetCovered===false?'unknown':f.rainOrFreezingRain?'caution':'neutral'],
    ['Feels-like low',f.targetCovered===false?'Unknown':unit(f.windChillF,'°F')+' (wind chill screening)',f.targetCovered===false?'unknown':Number.isFinite(f.windChillF)&&f.windChillF<=-15?'caution':'neutral'],
    ['Current NWS alerts',a.status==='verified'?(a.events?.length?String(a.events.length)+' overlapping warning(s)':'No active alerts at query time'):'Alert feed unavailable',a.status!=='verified'?'unknown':a.events?.length?'caution':'neutral']
   ];
   return '<div class="wx-risk-grid">'+risks.map(([title,label,tone])=>'<div class="wx-risk '+tone+
    '"><strong>'+esc(title)+'</strong><p>'+esc(label)+'</p></div>').join('')+'</div>';
 }
 function accessChecks(){
   return '<div class="wx-access-flow" role="group" aria-label="Three required manager confirmations pending">'+
    ['Trail/route open','Winter road maintained','Lot plowed + entrance verified'].map(x=>
      '<div class="wx-access-item"><span aria-hidden="true">?</span><strong>'+esc(x)+
      '</strong><small>Pending</small></div>').join('')+'</div>';
 }
 function render(input={}){
   const {snow={},forecast={},alerts={},selectedDate=''}=input;
   const trend=forecast.weekTrend||{};
   const week=weekChart(trend,selectedDate),hour=hourlyChart(forecast.timeline);
   const summary=trendAnalysis(trend);
   return '<div class="wx-viz" data-wx-viz="1">'+
    '<section class="wx-panel wx-panel-large" aria-labelledby="wx-week-title">'+
    '<div class="wx-panel-head"><div><p class="wx-eyebrow">What is changing?</p><h3 id="wx-week-title">Next seven days: NWS temperature outlook</h3></div>'+
    '<span class="wx-source-pill">FORECAST · NOT HISTORY</span></div>'+
    '<p class="wx-panel-desc">Each bar spans the available <strong>10 AM–4 PM local hours</strong>, not overnight temperatures. Select a day to check that outing.</p>'+
    week+'<p class="wx-ranger-read">'+esc(summary)+'</p>'+
    '<p class="wx-footnote">Missing days are left blank. A gray/partial day is based on fewer than seven valid hours. No snowmelt forecast is derived from these temperatures.</p></section>'+
    '<section class="wx-panel" aria-labelledby="wx-hour-title"><div class="wx-panel-head"><div>'+
    '<p class="wx-eyebrow">What will the day feel like?</p><h3 id="wx-hour-title">Hour by hour</h3></div>'+
    '<span class="wx-source-pill">NWS HOURLY</span></div>'+
    '<p class="wx-panel-desc">The dashed line marks 32°F. Bars below show wind speed; tap an hour to read its conditions.</p>'+
    hour+'</section>'+
    '<section class="wx-panel" aria-labelledby="wx-snow-title"><div class="wx-panel-head"><div>'+
    '<p class="wx-eyebrow">What is on the ground?</p><h3 id="wx-snow-title">Snow-depth context</h3></div>'+
    '<span class="wx-source-pill">NOAA MODEL SNAPSHOT</span></div>'+snowGauge(snow)+'</section>'+
    '<section class="wx-panel" aria-labelledby="wx-risk-title"><div class="wx-panel-head"><div>'+
    '<p class="wx-eyebrow">What could change your decision?</p><h3 id="wx-risk-title">Weather risk signals</h3></div></div>'+
    hazards({forecast,alerts})+'<p class="wx-footnote">No active alert at query time does not mean no warning later. Wind chill is calculated from NWS forecast values, not measured on the trail.</p></section>'+
    '<section class="wx-panel" aria-labelledby="wx-access-title"><div class="wx-panel-head"><div>'+
    '<p class="wx-eyebrow">The missing evidence</p><h3 id="wx-access-title">Before you drive: 3 access checks</h3></div>'+
    '<span class="wx-source-pill wx-pending">ALL UNVERIFIED</span></div>'+accessChecks()+
    '<p class="wx-footnote">Neither a NOAA model grid cell nor an NWS forecast establishes road plowing, a passable bridge, or accessible winter parking. The route remains a research candidate.</p></section>'+
    '</div>';
 }
 function bind(root,{onDayChange}={}){
   if(!root||typeof root.addEventListener!=='function')return;
   root.addEventListener('click',event=>{
     const day=event.target.closest?.('[data-wx-day]');
     if(day&&root.contains(day)){
       const value=day.getAttribute('data-wx-day');
       if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&typeof onDayChange==='function')onDayChange(value);
       return;
     }
     const hour=event.target.closest?.('[data-wx-hour]');
     if(!hour||!root.contains(hour))return;
     const index=Number(hour.getAttribute('data-wx-hour'));
     const timeline=root.__winterTimeline||[];
     const row=timeline[index];
     if(!row)return;
     const target=root.querySelector('#wx-hour-detail');
     if(target){
       const feels=Number.isFinite(row.windChillF)?' Estimated feels-like '+row.windChillF+'°F.':'';
       target.textContent=row.hourLocal+': '+row.temperatureF+'°F, wind '+row.windMph+
         ' mph. '+String(row.shortForecast||'Conditions not detailed')+'.'+feels;
     }
     root.querySelectorAll('[data-wx-hour]').forEach(el=>
       el.setAttribute('aria-pressed',el===hour?'true':'false'));
   });
 }
 function rememberTimeline(root,forecast){if(root)root.__winterTimeline=hours(forecast?.timeline)}
 return {render,bind,rememberTimeline,trendAnalysis,dateLabel,weekChart,hourlyChart,snowGauge};
});
