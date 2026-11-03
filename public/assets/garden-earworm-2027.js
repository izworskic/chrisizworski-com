(function () {
 'use strict';
 const panel=document.getElementById('earworm-2027-evidence');
 const summary=document.getElementById('earworm-2027-summary');
 const area=document.getElementById('earworm-2027-observations');
 if(!panel||!summary||!area)return;
 const source=window.GardenEarwormTrap2027Data;
 const now=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'})
  .formatToParts(new Date());
 const parts=Object.fromEntries(now.map(p=>[p.type,p.value]));
 const today=parts.year+'-'+parts.month+'-'+parts.day;
 const dateOK=d=>typeof d==='string'&&/^2027-\d\d-\d\d$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&
    new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
 function valid(candidate) {
   if(!candidate||candidate.schema!=='garden-earworm-trap-archive-v1'||
      candidate.season!==2027||candidate.seasonState!=='SOURCE_REPORTED_NOT_OUTBREAK_FORECAST'||
      candidate.species!=='Helicoverpa zea'||!Array.isArray(candidate.reviewFlags)||
      candidate.reviewFlags.length||!Array.isArray(candidate.counties)||
      candidate.counties.length<3||candidate.counties.length>20)return false;
   const meta=candidate.source;
   if(!meta||meta.publisher!=='Michigan State University Extension'||
      meta.dataType!=='INDEPENDENT_REGIONAL_PHEROMONE_TRAPS'||
      !/^https:\/\/www\.canr\.msu\.edu\/news\/michigan-vegetable-crop-report-[a-z0-9-]+-2027$/.test(meta.url)||
      !dateOK(meta.publishedDate)||!dateOK(meta.latestCollectionWeek)||
      meta.latestCollectionWeek>meta.publishedDate||meta.publishedDate>today||
      !/^[0-9a-f]{64}$/.test(meta.sourceTableSha256||''))return false;
   const base=candidate.counties[0]?.samples;
   if(!Array.isArray(base)||base.length<1||base.length>23)return false;
   const weeks=base.map(x=>x.week);
   if(weeks.some(w=>!dateOK(w)||w>meta.latestCollectionWeek)||
      weeks.at(-1)!==meta.latestCollectionWeek||
      new Set(weeks).size!==weeks.length||weeks.some((w,i)=>i&&w<=weeks[i-1]))return false;
   const seen=new Set();
   for(const county of candidate.counties){
     if(typeof county.id!=='string'||!/^[a-z]+(?:-[a-z]+)*$/.test(county.id)||
        !/^[A-Za-z ]+ County$/.test(county.name||'')||seen.has(county.id)||
        !['WIRE_HARTSTACK','CLOTH_HELIOTHIS','TYPE_NOT_SPECIFIED'].includes(county.trapType)||
        !Array.isArray(county.samples)||county.samples.length!==weeks.length)return false;
     seen.add(county.id);
     for(let i=0;i<weeks.length;i++){
       const s=county.samples[i];
       if(!s||s.week!==weeks[i]||!['REPORTED','NOT_REPORTED','MISSING_UNSPECIFIED'].includes(s.status))return false;
       if(s.status==='REPORTED'){
         if(!Number.isInteger(s.total)||s.total<0||s.total>9999||
            (s.total===0&&s.avgPerNight!==null)||
            (s.total>0&&!/^\d{1,5}(?:\.\d{1,2})?$/.test(s.avgPerNight||''))||
            s.publishedCell!==String(s.total)+(s.avgPerNight===null?'':' ('+s.avgPerNight+')')+
                (s.twoWeekTotal?'*':''))return false;
       } else if(s.total!==null||s.avgPerNight!==null||
          s.publishedCell!==(s.status==='NOT_REPORTED'?'-':''))return false;
       if(typeof s.twoWeekTotal!=='boolean')return false;
     }
   }
   return true;
 }
 function node(tag,cls,text){
   const el=document.createElement(tag);
   if(cls)el.className=cls;
   if(text!==undefined)el.textContent=String(text);
   return el;
 }
 function link(text,url){
   const a=node('a','',text);a.href=url;a.rel='noopener noreferrer';a.target='_blank';return a;
 }
 const year=Number(parts.year);
 if(!valid(source)){
   summary.textContent=year<2027?
     '2027 monitoring is not underway yet. No 2027 records have been verified or published in this tool. The independently audited 2026 archive remains below.':
     '2027 MSU earworm trap records are not currently source-verified for this tool. No monitoring counts, zero-catch claim, or outbreak forecast is being shown. The audited 2026 archive remains below.';
   area.replaceChildren();
   area.hidden=true;
   return;
 }
 const meta=source.source;
 const when=s=>new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'});
 const age=Math.floor((Date.parse(today+'T12:00:00Z')-Date.parse(meta.publishedDate+'T12:00:00Z'))/86400000);
 summary.textContent=(age>14?'DATED OFFICIAL REPORT / CHECK COLLECTION DATE':'LATEST REVIEWED MSU TABLE / NOT A LIVE TRAP FEED')+
   ' — MSU published '+when(meta.publishedDate)+', latest reported collection '+when(meta.latestCollectionWeek)+
   '. These are measured trap captures, not a garden forecast or infestation alert.';
 area.hidden=false;
 area.replaceChildren();
 const intro=node('p','earworm-next-guidance',
   'Select a reporting county. All catches belong to cooperating traps, not an entire county or your ZIP. Different trap designs are not comparable. Missing readings never mean zero moths.');
 const picker=node('div','earworm-counties earworm-next-picker');
 picker.setAttribute('role','group');
 picker.setAttribute('aria-label','2027 verified MSU earworm reporting counties');
 const result=node('div','earworm-next-readout');
 const chart=node('div','earworm-graph');
 chart.setAttribute('role','img');
 const wrap=node('div','earworm-table-wrap');
 const table=node('table','earworm-table');
 wrap.append(table);
 const cite=node('div','earworm-source');
 cite.append(node('strong','','MSU publication and measurement limits'));
 cite.append(link('Open the original dated MSU Extension report',meta.url));
 cite.append(node('p','','Measurements may be days or weeks old. Zero captures only means zero at a reporting trap during that collection. A blank or dash is not a negative survey. No pesticide interval is generated from this dataset.'));
 area.append(intro,picker,result,chart,wrap,cite);
 const urlSelection=new URL(location.href).searchParams.get('trapCounty2027');
 let selected=source.counties.some(c=>c.id===urlSelection)?urlSelection:source.counties[0].id;
 function show(){
   picker.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.county===selected)));
   const county=source.counties.find(c=>c.id===selected);
   const notes=county.samples.filter(s=>s.status==='REPORTED');
   const latest=notes.at(-1);
   const trapType={WIRE_HARTSTACK:'Wire Hartstack',CLOTH_HELIOTHIS:'Cloth Heliothis',TYPE_NOT_SPECIFIED:'Not specified in source'}[county.trapType];
   result.replaceChildren(
     node('strong','earworm-next-county',county.name),
     node('p','','Last published catch at this reporting trap: '+
       (latest?latest.total+' moth'+(latest.total===1?'':'s')+' collected for '+when(latest.week):'no reported check in this table')+
       '. Trap type: '+trapType+'. '+
       county.samples.filter(s=>s.status!=='REPORTED').length+' missing/unspecified week(s) in the table.')
   );
   const n=county.samples;
   const scores=n.map(s=>s.status==='REPORTED'?Number(s.avgPerNight??'0'):null);
   const peak=Math.max(0,...scores.filter(v=>v!==null));
   const bars=node('div','earworm-bars');
   bars.style.gridTemplateColumns='repeat('+n.length+',minmax(55px,1fr))';
   bars.style.minWidth=(n.length*60)+'px';
   n.forEach((s,i)=>{
     const cell=node('div','earworm-column');
     const value=node('div','earworm-bar-value',s.status!=='REPORTED'?'N/R':s.avgPerNight??'0');
     const holder=node('div','earworm-bar-holder');
     const bar=node('div','earworm-bar'+(s.status!=='REPORTED'?' is-missing':''));
     if(s.status!=='REPORTED')bar.textContent='–';
     else if(scores[i]===0)bar.classList.add('is-zero');
     else bar.style.height=Math.max(3,scores[i]/(peak||1)*100)+'%';
     if(s.twoWeekTotal)bar.classList.add('is-two-week');
     holder.append(bar);
     cell.append(value,holder,node('div','earworm-bar-week',when(s.week).replace(', 2027','')));
     bars.append(cell);
   });
   chart.replaceChildren(bars);
   chart.setAttribute('aria-label',county.name+' 2027 published average corn earworm moth captures per night. Exact readings and missing reports in the following table.');
   table.replaceChildren();
   table.append(node('caption','',county.name+' 2027 MSU trap measurements'));
   const thead=node('thead');const headrow=node('tr');
   for(const h of ['Collection week','Total moths','Avg/night','Sampling note'])headrow.append(node('th','',h));
   thead.append(headrow);
   const tbody=node('tbody');
   for(const s of [...n].reverse()){
     const tr=node('tr',s.status!=='REPORTED'?'earworm-not-reported':'');
     tr.append(
       node('td','',when(s.week)),
       node('td','',s.status==='REPORTED'?s.total:'Not reported'),
       node('td','',s.status==='REPORTED'?s.avgPerNight??'Not published':'Not reported'),
       node('td','',s.twoWeekTotal?'Two-week collection (published avg/night)':
         s.status!=='REPORTED'?'Missing is not zero':s.total===0?'Measured zero at this trap':'Measured trap catch')
     );
     tbody.append(tr);
   }
   table.append(thead,tbody);
 }
 for(const c of source.counties){
   const button=node('button','earworm-county',c.name.replace(' County',''));
   button.type='button';button.dataset.county=c.id;
   button.addEventListener('click',()=>{
     selected=c.id;
     const loc=new URL(location.href);
     loc.searchParams.set('trapCounty2027',selected);
     history.replaceState(null,'',loc.pathname+loc.search+loc.hash);
     show();
   });
   picker.append(button);
 }
 show();
})();
