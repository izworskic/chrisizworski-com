(function(){'use strict';
const root=document.querySelector('[data-ski-page]');if(!root)return;
const $=id=>document.getElementById(id);
const S={data:null,goal:'powder',day:'saturday',origin:'detroit',adults:2,kids:0,rentals:0,rentalCost:null,mpg:25,gas:3.5,miles:{},quotes:{},compare:[]};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const put=(p,...children)=>{children.forEach(c=>{if(c)p.append(c);});return p;};
const fmt=x=>Number.isFinite(x)?Number(x).toFixed(1).replace(/\.0$/,''):'–';
const money=x=>'$'+x.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
const published=r=>r.official?.status==='PUBLISHED_OFFICIAL_REPORT';
function activeRisk(r){return (r.weather?.alerts||[]).some(a=>/Warning/i.test(a.event));}
function dayInfo(r){return r.weather?.skiDays?.[S.day]||{};}
function chosenDayDate(){return S.data?.resorts?.[0]?.weather?.skiDays?.[S.day]?.date||null;}
function ticket(r){
 const special=['2026-12-27','2027-01-17','2027-02-14'].includes(chosenDayDate());
 const holidaySunday=special&&['shanty-creek','caberfae-peaks'].includes(r.slug);
 return r.adultDayPrice2026?.[S.day==='saturday'||holidaySunday?'sat':'sun']??null;
}
function childTicket(r){
 if(['shanty-creek','caberfae-peaks'].includes(r.slug))return 10;
 if(r.slug==='porcupine-mountains')return 40;
 return null;
}
function sessionRisk(r){const d=dayInfo(r),events=[];
 if(activeRisk(r))events.push('Winter warning: travel risk; excluded from shortlist');
 if(d.surfaceSignal==='THAW_FREEZE_RISK')events.push('Thaw/refreeze temperatures forecast: surface may firm up');
 else if(d.surfaceSignal==='WARM_WET_RISK'||d.surfaceSignal==='ABOVE_FREEZING')events.push('Above-freezing conditions forecast: check snow surface');
 if(Number.isFinite(d.maxWindMph)&&d.maxWindMph>=25)events.push('Forecast wind gust exposure unknown; sustained wind signal is elevated');
 if(!published(r))events.push('Lift and trail status not independently connected');
 else if(r.official.lifts.open===0)events.push('Official page currently reports zero operating lifts; future date not established');
 return events;
}
function points(r){const d=dayInfo(r),tags=r.planningTags||[],minutes=r.driveMinutes?.[S.origin],t=ticket(r);
 if(r.kind!=='downhill'||activeRisk(r)||!Number.isFinite(minutes))return -Infinity;
 if(S.goal==='family'&&tags.includes('expert')&&!tags.includes('family'))return -Infinity;
 let n=0;
 if(S.goal==='powder'){
   if(!Number.isFinite(d.snowInches)||d.snowInches<0.5)return -Infinity;
   n=Math.min(48,d.snowInches*7);
   const rpt=r.weather?.report24;
   if(rpt&&rpt.distanceMiles<=25)n+=Math.max(0,10-rpt.distanceMiles/3);
   if(r.weather?.lakeEffectWind?.status==='WIND_ALIGNED')n+=3;
   if(tags.includes('natural-snow'))n+=4;
   if(d.surfaceSignal==='THAW_FREEZE_RISK'||d.surfaceSignal==='WARM_WET_RISK')n-=16;
   n-=Math.min(32,minutes/23);
 }else if(S.goal==='family'){
   n=(tags.includes('family')?35:0)+(tags.includes('beginner')?20:0);
   n-=minutes/19;if(Number.isFinite(t))n+=Math.max(0,(130-t)/8);
 }else if(S.goal==='value'){
   n=Number.isFinite(t)?55-Math.min(45,t/2):-40;
   n-=minutes/18;
 }else{
   n=70-minutes/7;
   if(tags.includes('short-trip'))n+=10;
 }
 if(published(r)&&r.official.lifts.open>0)n+=4; // current-page evidence, not future guarantees
 return n;
}
function explain(r){const d=dayInfo(r),m=r.driveMinutes[S.origin],p=ticket(r),a=[];
 if(S.goal==='powder'){
  a.push(fmt(d.snowInches)+'″ NWS snow expected in selected window');
  if(r.weather?.lakeEffectWind?.status==='WIND_ALIGNED')a.push('Wind direction favors the broader snowbelt—not proof of a band');
 }else if(S.goal==='family')a.push((r.planningTags||[]).includes('family')?'Family-oriented planning fit':'General terrain candidate; validate beginner access');
 else if(S.goal==='value')a.push(Number.isFinite(p)?money(p)+' posted adult day-session reference':'Date-specific adult price not confirmed');
 else a.push('About '+Math.round(m/60*10)/10+' hours each way (baseline, not road conditions)');
 return a;
}
function candidates(){if(!S.data)return [];
 const a=S.data.resorts.filter(r=>r.kind==='downhill').map(r=>({r,score:points(r)}))
  .filter(x=>Number.isFinite(x.score)).sort((x,y)=>y.score-x.score||x.r.name.localeCompare(y.r.name));
 return a.map(x=>x.r);
}
function sourceLink(label,url){const a=el('a',null,label);a.href=url;a.rel='noopener noreferrer';a.target='_blank';return a;}
function label(n,text){const l=el('label',null,text);put(l,n);return l;}
function chooseNumber(name,value,max,callback,min=0){
 const inp=el('input');inp.type='number';inp.inputMode='decimal';inp.min=String(min);inp.max=String(max);inp.step='1';inp.value=String(value);
 inp.addEventListener('change',()=>{const n=Number(inp.value);if(Number.isFinite(n)&&n>=min&&n<=max){callback(n);render();}});
 return label(inp,name);
}
function recap(){
 const target=$('ski-decision-results');if(!target||!S.data)return;target.replaceChildren();
 const dt=chosenDayDate(),c=candidates(),seasonMonth=new Date(S.data.generatedAt).getUTCMonth()+1;
 const offSeason=![11,12,1,2,3,4].includes(seasonMonth);
 const title=el('h3',null,offSeason?'Planning mode · not an open-slope recommendation':S.goal==='powder'?'Where the NWS snow forecast leads':S.goal==='family'?'Family-friendly planning shortlist':S.goal==='value'?'Day-ticket and drive-value shortlist':'Closest useful slopes');
 const subtitle=el('p','note',dt?'Selected '+(S.day==='saturday'?'Saturday':'Sunday')+', '+dt+' · '+(S.origin==='detroit'?'Detroit metro':'Grand Rapids')+' departures · NWS forecasts may change.':'Upcoming date unavailable');
 put(target,title,subtitle);
 if(!c.length){
  const msg=S.goal==='powder'?'No monitored hill has ≥0.5″ of verified NWS grid snowfall in the selected window without a matched winter warning. That is NOT a statewide claim of no snow.':'No suitable hill can be ranked with current source evidence.';
  put(target,el('p','event',msg));return;
 }
 const group=el('div','decision-candidates');c.slice(0,3).forEach((r,i)=>{
   const d=dayInfo(r),item=el('article','decision-candidate');
   put(item,el('p','eyebrow',i===0?'01 / Leading fit':'0'+(i+1)+' / Alternative'),el('h4',null,r.name),
       el('p','small',r.location+' · '+Math.round(r.driveMinutes[S.origin]/60*10)/10+' h each way, estimated'));
   const metrics=el('div','decision-metrics');
   put(metrics,el('span',null,'Snow '+fmt(d.snowInches)+'″'),
       el('span',null,'Temp '+(Number.isFinite(d.lowF)?d.lowF+'–'+d.highF+'°F':'Unknown')),
       el('span',null,'Ticket '+(Number.isFinite(ticket(r))?money(ticket(r)):'Unverified')));
   put(item,metrics);
   for(const reason of explain(r))put(item,el('p','small',reason));
   const risk=sessionRisk(r);
   if(risk.length)put(item,el('p','risk-summary',risk.slice(0,2).join(' · ')));
   const row=el('div','source-links'),btn=el('button','outline-button','Compare trip cost');
   btn.type='button';btn.addEventListener('click',()=>{S.compare=[r.slug,...S.compare.filter(s=>s!==r.slug)].slice(0,2);cost();$('ski-trip-cost')?.scrollIntoView({behavior:'smooth',block:'nearest'});});
   put(row,btn,sourceLink('Full hill report ↗','/michigan-ski-hills/'+r.slug+'/'));put(item,row);put(group,item);
 });put(target,group,el('p','small',offSeason?'October forecast does not imply ski season has started. Resort opening dates and conditions remain unverified.':'These are comparative leads, not go/no-go statements. Check the current operating report, ticket checkout and road authorities before travel.'));
}
function summaryPrices(r){
 const adult=ticket(r),kid=childTicket(r),userQuote=S.quotes[r.slug],a=adult??userQuote??null;
 const quoted=adult===null&&Number.isFinite(userQuote),adultMissing=S.adults>0&&!Number.isFinite(a);
 const kidsMissing=S.kids>0&&!Number.isFinite(kid);
 const known=(Number.isFinite(a)?S.adults*a:0)+(Number.isFinite(kid)?S.kids*kid:0);
 const miles=S.miles[r.slug],fuel=Number.isFinite(miles)&&miles>0?miles/S.mpg*S.gas:null;
 const rents=S.rentals===0?0:Number.isFinite(S.rentalCost)?S.rentals*S.rentalCost:null;
 const complete=!adultMissing&&!kidsMissing&&fuel!==null&&rents!==null;
 return {adult,kid,known,fuel,rents,complete,quoted,adultMissing,kidsMissing};
}
function cost(){
 const target=$('ski-trip-cost');if(!target||!S.data)return;target.replaceChildren();
 const intro=el('p','note','Compare lift-ticket references and your own trip estimates. Enter round-trip miles and any rental quote; neither is assumed. Hotel, food, road tolls, passes and fees are excluded.');
 put(target,intro);
 const c=candidates();if(!S.compare.length)S.compare=c.slice(0,2).map(r=>r.slug);
 const controls=el('div','cost-controls');
 const gas=chooseNumber('Gasoline $/gal',Math.round(S.gas*100)/100,20,n=>S.gas=n,0.1);gas.lastChild.step='0.01';
 const mpg=chooseNumber('Vehicle MPG',S.mpg,100,n=>S.mpg=n,1);
 const rental=chooseNumber('Rental quote $ each (optional)',S.rentalCost??0,1000,n=>S.rentalCost=n,0);
 rental.lastChild.value=S.rentalCost===null?'':String(S.rentalCost);rental.lastChild.placeholder='Enter quote';
 rental.lastChild.addEventListener('change',()=>{if(rental.lastChild.value===''){S.rentalCost=null;render();}});
 put(controls,gas,mpg,rental);put(target,controls);
 const cards=el('div','decision-candidates');
 S.compare.forEach(slug=>{
  const r=S.data.resorts.find(x=>x.slug===slug);if(!r)return;
  const c=el('article','decision-candidate'),s=summaryPrices(r),link=el('h4',null,r.name);
  put(c,link,el('p','small','Based on '+(S.day==='saturday'?'Saturday':'Sunday')+' adult day-session rates. Holiday/session restrictions may apply.'));
  const miles=chooseNumber('Round-trip miles (enter your route estimate)',S.miles[slug]??0,1800,n=>{S.miles[slug]=n>0?n:null;},1);
  miles.lastChild.value=Number.isFinite(S.miles[slug])?String(S.miles[slug]):'';
  miles.lastChild.placeholder='e.g. 200';
  put(c,miles);
  if(s.adult===null){
   const q=chooseNumber('Your adult ticket quote $ (optional)',S.quotes[slug]??0,1000,n=>{S.quotes[slug]=n;},0);
   q.lastChild.value=Number.isFinite(S.quotes[slug])?String(S.quotes[slug]):'';q.lastChild.placeholder='Check official checkout';
   put(c,q);
  }
  const lines=el('div','price-lines');
  const row=(title,v)=>put(lines,el('p',null,title+': '+v));
  row('Adults · '+S.adults,s.adultMissing?'Rate needed':money(S.adults*(s.adult??S.quotes[slug]??0))+(s.quoted?' (your quote)':' (posted reference)'));
  row('Children ≤8 · '+S.kids,s.kidsMissing?'Rate needed':money(S.kids*(s.kid??0)));
  row('Vehicle fuel estimate',s.fuel===null?'Enter round-trip miles':money(s.fuel));
  row('Rentals · '+S.rentals,s.rents===null?'Enter a rental quote':money(s.rents));
  const total=s.known+(s.fuel??0)+(s.rents??0);
  put(c,lines,el('p','cost-total',s.complete?'Estimated subtotal '+money(total):'Known components '+money(total)+' · incomplete'));
  put(c,el('p','small','Rates as recorded Oct 2026; promotions, restrictions, taxes and equipment details are not confirmed. This is a budgeting worksheet, not a booking quote.'));
  const sources=el('div','source-links');
  put(sources,sourceLink('Confirm tickets ↗',r.tickets),sourceLink('Check lift/trail report ↗',r.official?.url||r.snow));put(c,sources,c);
  put(cards,c);
 });put(target,cards);
}
function render(){
 if(!S.data)return;
 const controls=['goal','day','adults','kids','rentals'];
 for(const name of controls){const n=$('ski-'+name);if(n)S[name]=['adults','kids','rentals'].includes(name)?Number(n.value):n.value;}
 S.origin=$('origin')?.value||S.origin;
 if(S.adults<0||S.kids<0||S.rentals<0)return;
 recap();cost();
}
document.addEventListener('michigan-ski:data',ev=>{S.data=ev.detail;render();});
for(const id of ['ski-goal','ski-day','ski-adults','ski-kids','ski-rentals','origin'])
 document.getElementById(id)?.addEventListener('change',render);
})();