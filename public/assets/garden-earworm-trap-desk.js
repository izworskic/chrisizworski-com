(function () {
  'use strict';
  const data=window.GardenEarwormTrapData;
  const box=document.getElementById('earworm-trap-desk');
  const buttons=document.getElementById('earworm-county-picker');
  const headline=document.getElementById('earworm-readout');
  const track=document.getElementById('earworm-chart');
  const table=document.getElementById('earworm-detail');
  const label=document.getElementById('earworm-location-note');
  const crop=document.getElementById('crop');
  const stage=document.getElementById('stage');
  const cropNote=document.getElementById('earworm-crop-note');
  if(!data||!box||!buttons||!headline||!track||!table||!label||!crop||!cropNote)return;
  const expected=['ottawa','oceana','washtenaw','monroe','saginaw','lapeer','genesee','midland'];
  if(data.schema!=='garden-earworm-trap-archive-v1'||data.season!==2026||
     data.seasonState!=='CLOSED'||!Array.isArray(data.counties)||
     data.counties.length!==8||!expected.every(id=>data.counties.some(c=>c.id===id))||
     data.source?.url!=='https://msu-prod.dotcms.cloud/news/michigan-vegetable-crop-report-september-2-2026'||
     data.source?.latestCollectionWeek!=='2026-09-01')return;
  const timeParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'numeric'}).formatToParts(new Date());
  const current=Object.fromEntries(timeParts.map(x=>[x.type,Number(x.value)||x.value]));
  const dormant=Number(current.year)>2026||Number(current.month)>=11||Number(current.month)<=2;
  const selectCounty=new URL(location.href).searchParams.get('trapCounty');
  let selected=data.counties.some(c=>c.id===selectCounty)?selectCounty:'saginaw';
  function el(tag,cls,text){
    const n=document.createElement(tag);if(cls)n.className=cls;
    if(text!==undefined)n.textContent=String(text);
    return n;
  }
  function formatDate(iso){return new Date(iso+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});}
  function nodeLink(text,url){
    const a=el('a','',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
  }
  function validCounty(c){
    if(!c||!expected.includes(c.id)||!Array.isArray(c.samples)||c.samples.length!==10||!c.samples.every(x=>
      /^2026-(?:06|07|08|09)-\d\d$/.test(x.week) &&
      ['REPORTED','NOT_REPORTED'].includes(x.status) &&
      (x.status==='NOT_REPORTED'?(x.total===null&&x.avgPerNight===null&&x.publishedCell==='-'):
        Number.isInteger(x.total)&&x.total>=0&&
        (x.avgPerNight===null||/^\d+(?:\.\d)?$/.test(x.avgPerNight)))))return false;
    return true;
  }
  function renderCrop(){
    if(crop.value==='corn'){
      cropNote.textContent=stage?.value==='flowering'||stage?.value==='fruiting'?
        'For sweet corn, fresh green silks are the most vulnerable stage. These 2026 trap records are historical, not a reason to treat the current planting.':
        'Sweet corn selected. Earworm scouting matters most while green silks are present. These are past trap records, not a live local warning.';
    } else {
      cropNote.textContent='This archive applies to sweet corn and the corn earworm moth, not the '+(crop.options[crop.selectedIndex]?.textContent||'selected crop')+
        ' crop. You can still explore MSU records; choose sweet corn above for crop-specific scouting notes.';
    }
  }
  function barSeries(c){
    const series=c.samples.map(x=>x.status==='REPORTED'?x.avgPerNight===null?0:Number(x.avgPerNight):null);
    const peak=Math.max(0,...series.filter(x=>x!==null));
    track.replaceChildren();
    const row=el('div','earworm-bars');
    for(let i=0;i<c.samples.length;i++){
      const sample=c.samples[i],v=series[i];
      const column=el('div','earworm-column');
      const measure=el('div','earworm-bar-value',sample.status==='NOT_REPORTED'?'N/R':sample.avgPerNight===null?'0':sample.avgPerNight);
      const holder=el('div','earworm-bar-holder');
      const bar=el('div','earworm-bar'+(sample.status==='NOT_REPORTED'?' is-missing':''));
      if(sample.status==='NOT_REPORTED')bar.textContent='–';
      else if(v===0)bar.classList.add('is-zero');
      else bar.style.height=Math.max(3,v/(peak||1)*100)+'%';
      if(sample.twoWeekTotal)bar.classList.add('is-two-week');
      holder.append(bar);
      column.append(measure,holder,el('div','earworm-bar-week',formatDate(sample.week)));
      row.append(column);
    }
    track.append(row);
    track.setAttribute('aria-label',c.name+' 2026 MSU archived reported average moths per night. Missing weeks are not zero. Exact source values are in the table beneath.');
  }
  function renderTable(c){
    table.replaceChildren();
    const caption=el('caption','','2026 MSU earworm moth captures for '+c.name+'; latest week first');
    const thead=el('thead'),r=el('tr');
    for(const col of ['Report week','Total moths','Avg / night','Evidence note'])r.append(el('th','',col));
    thead.append(r);
    const tbody=el('tbody');
    for(const x of [...c.samples].reverse()){
      const tr=el('tr',x.status==='NOT_REPORTED'?'earworm-not-reported':'');
      tr.append(el('td','',formatDate(x.week)));
      tr.append(el('td','',x.status==='NOT_REPORTED'?'Not reported':String(x.total)));
      tr.append(el('td','',x.status==='NOT_REPORTED'?'Not reported':x.avgPerNight??'Not published'));
      tr.append(el('td','',x.status==='NOT_REPORTED'?'Missing report, not zero':x.twoWeekTotal?'Two-week collection; use published avg/night':x.total===0?'Zero captured in reported check':'MSU measured catch'));
      tbody.append(tr);
    }
    table.append(caption,thead,tbody);
  }
  function render(){
    const county=data.counties.find(x=>x.id===selected);
    if(!validCounty(county)){
      headline.replaceChildren(el('p','','Published county records could not be verified. Refer to the original MSU Extension table.'));
      track.replaceChildren();table.replaceChildren();
      return;
    }
    buttons.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.county===selected)));
    const reported=county.samples.filter(s=>s.status==='REPORTED');
    const latest=reported.at(-1),lastWeek=county.samples.at(-1);
    const typeName={WIRE_HARTSTACK:'Wire Hartstack',CLOTH_HELIOTHIS:'Cloth Heliothis',TYPE_NOT_SPECIFIED:'Type not specified'};
    headline.replaceChildren();
    const currentYear=Number(current.year);
    const freshness=el('strong','earworm-season-label',currentYear>2026?'2026 archive · no '+currentYear+' trap data':'2026 season closed · not a current outbreak warning');
    headline.append(freshness,el('h3','',county.name+' field-trap record'));
    const stats=el('div','earworm-stats');
    const latestBlock=el('div','earworm-stat');
    latestBlock.append(el('small','','Last published catch for this county'));
    latestBlock.append(el('strong','',latest?latest.total+' moth'+(latest.total===1?'':'s'):'None reported'));
    latestBlock.append(el('span','',latest?formatDate(latest.week)+' · '+(latest.avgPerNight??'avg/night not published')+
      (latest.avgPerNight!==null?' avg/night':''):'No eligible published record'));
    const type=el('div','earworm-stat');
    type.append(el('small','','Published trap type'),el('strong','',typeName[county.trapType]||'Not specified'),
      el('span','','Trap types are not directly comparable'));
    const published=el('div','earworm-stat');
    published.append(el('small','','Final 2026 reporting week'),el('strong','','Sep 1, 2026'),
      el('span','',lastWeek?.status==='NOT_REPORTED'?'This county not reported that week':'This county submitted a reading'));
    stats.append(latestBlock,type,published);
    headline.append(stats);
    if(dormant){
      headline.append(el('p','earworm-season-caveat','The growing season is closed in Michigan. These measurements describe the past 2026 monitoring season, not activity today or a prediction for next summer.'));
    }
    label.textContent='Showing '+county.name+' only. County labels identify cooperating trap reports, not countywide coverage or your ZIP. '+
       reported.length+' reported checks; '+(county.samples.length-reported.length)+' weeks with no report in the published table.';
    barSeries(county);
    renderTable(county);
  }
  for(const c of data.counties){
    const b=el('button','earworm-county',c.name.replace(' County',''));
    b.type='button';b.dataset.county=c.id;b.setAttribute('aria-pressed','false');
    b.addEventListener('click',()=>{
      selected=c.id;
      const u=new URL(location.href);
      u.searchParams.set('trapCounty',selected);
      history.replaceState(null,'',u.pathname+'?'+u.searchParams.toString()+u.hash);
      render();
    });
    buttons.append(b);
  }
  crop.addEventListener('change',renderCrop);
  stage?.addEventListener('change',renderCrop);
  renderCrop();
  render();
})();
