/* Winter Layup: evidence and vessel identity policy (browser + Node.js).
 * No AIS-based winter classification. No name-similarity auto-merges.
 * Identity keys persist between winter seasons; berth events do NOT.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FreighterLayupModel=api;
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const STATUSES=Object.freeze({
    confirmed_historical:{label:'Verified historical layup',weight:2},
    reported_historical:{label:'Community-reported historical layup',weight:1}
  });
  const CLASSES=Object.freeze(['port_authority','maritime_historical_society','local_maritime_museum','operator_statement','journalistic_report','community_report','operator','official_agency']);
  function normalizeName(value){
    return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en-US')
      .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }
  function validImo(value){
    if(value===null||value===undefined||value==='')return true;
    const str=String(value).replace(/^IMO\s*/i,'');
    if(!/^\d{7}$/.test(str))return false;
    const sum=[7,6,5,4,3,2].reduce((acc,n,i)=>acc+Number(str[i])*n,0);
    return sum%10===Number(str[6]);
  }
  function validMmsi(value){return value==null||value===''||/^\d{9}$/.test(String(value))}
  function identityKey(v){return String(v.identity?.key||v.id||'').trim()}
  function validateRegistry(data){
    const errors=[];
    if(!data||!Array.isArray(data.seasons)||!Array.isArray(data.harbors))return ['missing seasons or harbors'];
    const harborIds=new Set();
    for(const h of data.harbors){
      if(!h.id||harborIds.has(h.id))errors.push('duplicate harbor '+String(h.id));
      harborIds.add(h.id);
      if(h.coordinatePrecision!=='approximate_harbor_reference_not_dock')errors.push('unsupported coordinate precision '+h.id);
      if(!Number.isFinite(h.lat)||!Number.isFinite(h.lon))errors.push('invalid harbor reference '+h.id);
    }
    const seenSeasons=new Set(),stableIds=new Map(),identityAliases=new Map();
    for(const season of data.seasons){
      if(!season.id||seenSeasons.has(season.id))errors.push('duplicate season '+String(season.id));
      seenSeasons.add(season.id);
      if(!Array.isArray(season.records)){errors.push('no season records '+season.id);continue}
      const within=new Set();
      if(season.state==='upcoming_unconfirmed'&&season.records.length)errors.push('unconfirmed future season cannot contain dated layups');
      for(const v of season.records){
        const key=identityKey(v);
        if(!key||!v.id||within.has(key))errors.push('duplicate or missing vessel id '+key+' in '+season.id);
        within.add(key);
        if(v.identity&&v.identity.key!==v.id)errors.push('identity mismatch '+v.id);
        if(!validImo(v.identity?.imo))errors.push('invalid IMO '+v.id);
        if(!validMmsi(v.identity?.mmsi))errors.push('invalid MMSI '+v.id);
        if(!harborIds.has(v.harborId))errors.push('unknown harbor '+v.id);
        if(!STATUSES[v.status])errors.push('unsupported evidence status '+v.id);
        if(!CLASSES.includes(v.evidenceClass))errors.push('unclassified source '+v.id);
        if(!/^\d{4}-\d\d-\d\d$/.test(v.statusAsOf||'')||Number.isNaN(Date.parse(v.statusAsOf)))errors.push('missing as-of '+v.id);
        if(!v.evidence||!/^https:\/\//.test(v.evidence.url||'')||!v.evidence.publisher)errors.push('missing source '+v.id);
        if(v.status==='confirmed_historical'&&v.evidenceClass==='community_report')errors.push('community report cannot confirm layup '+v.id);
        if(v.berthPrecision==='dock_documented'&&!/(dock|pier|elevator|shipyards|graving)/i.test(v.berth||''))errors.push('vague claimed dock '+v.id);
        if(!['dock_documented','facility_reported','berth_unverified'].includes(v.berthPrecision))errors.push('missing berth precision '+v.id);
        if(!Array.isArray(v.events)||!v.events.length)errors.push('missing dated history '+v.id);
        const past=stableIds.get(key);
        if(past&&normalizeName(past)!==normalizeName(v.name))errors.push('identity label changed across seasons '+key);
        stableIds.set(key,v.name);
        for(const alias of [v.name,...(v.aliases||[])]){
          const norm=normalizeName(alias);
          if(!norm)errors.push('blank vessel alias '+key);
          const owner=identityAliases.get(norm);
          if(owner&&owner!==key)errors.push('ambiguous alias '+alias+' for '+owner+' and '+key);
          identityAliases.set(norm,key);
        }
      }
    }
    return errors;
  }
  function findVessel(records,query){
    const q=normalizeName(query);
    if(!q)return {match:null,reason:'blank'};
    const matches=(records||[]).filter(v=>[v.name,...(v.aliases||[])].some(alias=>normalizeName(alias)===q));
    return matches.length===1?{match:matches[0],reason:'exact_curated_identity'}:
      {match:null,reason:matches.length?'ambiguous':'no_exact_match'};
  }
  function matchesSearch(v,query){
    const q=normalizeName(query);
    if(!q)return true;
    const terms=[v.name,...(v.aliases||[]),v.berth||'',v.harborId||''];
    return terms.some(term=>normalizeName(term).includes(q));
  }
  function classify(v,season){
    if(!season||!v||!STATUSES[v.status])return {label:'Unknown',isCurrent:false,confirmed:false};
    const historic=season.state==='historical_snapshot';
    return {label:STATUSES[v.status].label,isCurrent:false,confirmed:historic&&v.status==='confirmed_historical',reported:historic&&v.status==='reported_historical',asOf:v.statusAsOf};
  }
  function totals(season){
    const records=season?.records||[];
    return {documented:records.length,confirmed:records.filter(v=>classify(v,season).confirmed).length,
      reported:records.filter(v=>classify(v,season).reported).length,
      harbors:new Set(records.map(v=>v.harborId)).size};
  }
  function defaultSeason(data){return data.seasons.filter(s=>s.state==='historical_snapshot').map(s=>s.id).sort().reverse()[0]||data.seasons[0].id;}
  function selectRecords(data,state){
    const list=(data.seasons.find(s=>s.id===state.season)?.records||[]).filter(v=>
      (state.activeHarbor==='all'||v.harborId===state.activeHarbor)&&
      (state.berth==='all'||v.berth===state.berth)&&matchesSearch(v,state.query)&&
      (state.evidence==='all'||(state.evidence==='verified'?v.status==='confirmed_historical':v.status==='reported_historical')));
    return list.slice().sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name):b.statusAsOf.localeCompare(a.statusAsOf)||a.name.localeCompare(b.name));
  }
  function normalizeState(data,input={}){
    const season=data.seasons.find(s=>s.id===input.season)||data.seasons.find(s=>s.id===defaultSeason(data));
    const ids=new Set(season.records.map(v=>v.harborId));
    const activeHarbor=ids.has(input.activeHarbor)?input.activeHarbor:'all';
    const berths=new Set(season.records.filter(v=>activeHarbor==='all'||v.harborId===activeHarbor).map(v=>v.berth));
    const state={season:season.id,activeHarbor,query:String(input.query||'').slice(0,100),
      berth:berths.has(input.berth)?input.berth:'all',evidence:['verified','reported'].includes(input.evidence)?input.evidence:'all',
      sort:input.sort==='recent'?'recent':'name',selected:null};
    if(selectRecords(data,state).some(v=>v.id===input.selected))state.selected=input.selected;
    return state;
  }
  function readState(data,url){
    const p=new URL(url,'https://chrisizworski.com').searchParams;
    return normalizeState(data,{season:p.get('season'),activeHarbor:p.get('harbor'),query:p.get('q'),berth:p.get('berth'),evidence:p.get('evidence'),sort:p.get('sort'),selected:p.get('vessel')});
  }
  function stateURL(data,state,url){
    const s=normalizeState(data,state),u=new URL(url,'https://chrisizworski.com');
    for(const key of ['season','harbor','q','berth','evidence','sort','vessel'])u.searchParams.delete(key);
    u.searchParams.set('season',s.season);
    for(const [key,value] of [['harbor',s.activeHarbor],['q',s.query],['berth',s.berth],['evidence',s.evidence],['sort',s.sort],['vessel',s.selected]]){
      if(value&&value!=='all'&&!(key==='sort'&&value==='name'))u.searchParams.set(key,value);
    }
    if(u.hash==='#ship-detail'&&!s.selected)u.hash='';
    return u;
  }
  function otherWinterMatches(data,state){
    if(normalizeName(state.query).length<2)return [];
    return data.seasons.filter(s=>s.id!==state.season&&s.state==='historical_snapshot')
      .map(s=>({id:s.id,label:s.label,count:s.records.filter(v=>matchesSearch(v,state.query)).length}))
      .filter(s=>s.count).sort((a,b)=>b.id.localeCompare(a.id));
  }
  function harborCounts(data,seasonId){
    const list=data.seasons.find(s=>s.id===seasonId)?.records||[];
    return data.harbors.map(h=>({id:h.id,name:h.name,count:list.filter(v=>v.harborId===h.id).length})).filter(h=>h.count).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  }
  return Object.freeze({STATUSES,normalizeName,validImo,validMmsi,identityKey,validateRegistry,findVessel,matchesSearch,classify,totals,defaultSeason,selectRecords,normalizeState,readState,stateURL,harborCounts,otherWinterMatches});
});
