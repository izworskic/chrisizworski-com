/* Experience Foundry / Follow the Freighter.
 * One observed AIS snapshot plus OFFICIAL geographic reference.
 * No ETA, itinerary, lock occupancy or vessel travel history is synthesized.
 * Native DOM only. Exports pure analysis for science and absence tests.
 */
(function (root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.SeawayFollow=api;
})(typeof window==='object'?window:{},function(){
  'use strict';
  const CORRIDOR=['montreal','beauharnois','massena','iroquois','thousand-islands'];
  const MAX_AGE_MS=30*60*1000;
  const isMmsi=s=>/^\d{9}$/.test(String(s||''));
  const dateOf=value=>{const n=Date.parse(value||'');return Number.isFinite(n)?n:null;};
  function analyze(ship,reference,context,checkedAt,now=Date.now()){
    const seen=dateOf(ship?.seen),age=seen===null?null:Math.round((now-seen)/60000);
    const valid=isMmsi(ship?.mmsi)&&seen!==null&&now-seen>=-60000&&now-seen<=MAX_AGE_MS;
    const possible=(Array.isArray(ship?.regionIds)?ship.regionIds:[]).filter(id=>CORRIDOR.includes(id));
    const id=CORRIDOR.includes(context?.id)&&possible.includes(context.id)?context.id:null;
    const chapters=CORRIDOR.map((chapter,i)=>({
      id:chapter,index:i+1,name:reference?.regions?.find(r=>r.id===chapter)?.name||chapter,
      current:valid&&chapter===id
    }));
    const locks=(reference?.locks||[]).filter(lock=>lock.region===id).map(lock=>({
      id:lock.id,name:lock.name,number:lock.number,hasVerifiedView:Boolean(lock.viewpoint)
    }));
    const viewpoints=(reference?.viewpoints||[]).filter(v=>v.region===id&&typeof v.source==='string'&&v.source.startsWith('https://'));
    const index=CORRIDOR.indexOf(id);
    const neighbors=index<0?[]:[{id:CORRIDOR[index-1],direction:'Toward Montreal'},
                                  {id:CORRIDOR[index+1],direction:'Toward Lake Ontario'}]
      .filter(x=>Boolean(x.id)).map(x=>({...x,name:chapters.find(y=>y.id===x.id).name}));
    return {
      valid,id,ageMinutes:age,checkedAt:dateOf(checkedAt)===null?null:checkedAt,
      name:typeof ship?.name==='string'&&ship.name.trim()?ship.name.trim().slice(0,100):'AIS vessel '+String(ship?.mmsi||'unknown'),
      mmsi:isMmsi(ship?.mmsi)?String(ship.mmsi):null,
      seen:valid?ship.seen:null,
      position:valid&&Number.isFinite(ship.lat)&&Number.isFinite(ship.lon)?{lat:ship.lat,lon:ship.lon}:null,
      speed:valid&&Number.isFinite(ship.speedKnots)?Math.max(0,ship.speedKnots):null,
      heading:valid&&Number.isFinite(ship.heading)?ship.heading:null,
      course:valid&&Number.isFinite(ship.course)?ship.course:null,
      chapters,locks,viewpoints,neighbors,
      area:id?chapters.find(c=>c.id===id).name:null,
      note:id?reference.regions.find(r=>r.id===id)?.note||'':null,
      message:!valid?'The selected report is missing or beyond the 30-minute observation window. Choose a fresh report or use the official operator information.':
        !id?'AIS was received, but its river chapter cannot be established reliably. A route or next lock cannot be inferred.':
        'This is a received position, not a verified voyage direction, destination, lock sequence, queue or arrival time.'
    };
  }
  function mount({document,root,reference,onExploreRegion,onExploreLock,onExploreView,onInspectAll,onTrack}){
    if(!root)return {select:()=>false,clear:()=>{},expire:()=>{}};
    const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
    const link=(text,url)=>{const node=el('a',text);node.href=url;node.target='_blank';node.rel='noopener noreferrer';return node;};
    const button=(text,callback,cls='button secondary')=>{const b=el('button',text,cls);b.type='button';b.addEventListener('click',callback);return b;};
    const dateLabel=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?
      d.toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Time unavailable';};
    const content=root.querySelector('#followFreighterContent');
    let active=null, last=null;
    function setHidden(hidden){root.hidden=hidden;root.dataset.hasShip=hidden?'false':'true';}
    function writeStatus(msg){const box=root.querySelector('#followFreighterStatus');if(box)box.textContent=msg;}
    function clear(){active=null;last=null;content?.replaceChildren();setHidden(true);}
    function expire(){
      if(!active)return;
      active.valid=false;
      writeStatus('This selected AIS report is no longer fresh. Its old position is not a current vessel location. Recheck the entire Seaway or choose another received report.');
      const label=root.querySelector('[data-follow-fresh]');
      if(label)label.textContent='Not a current report';
      const links=root.querySelector('[data-follow-steps]');
      if(links)links.hidden=true;
    }
    function select(ship,context,checkedAt){
      const model=analyze(ship,reference,context,checkedAt);
      if(!model.valid||!model.mmsi){expire();return false;}
      const stamp=[model.mmsi,model.seen,model.id,model.checkedAt,model.speed].join('|');
      if(stamp===last){active=model;return true;}
      last=stamp;active=model;
      if(!content)return false;
      content.replaceChildren();
      const head=el('div',undefined,'follow-head'),intro=el('div',undefined,'follow-intro');
      intro.append(el('p','Selected received vessel · Live-source observation','follow-eyebrow'),
        el('h3',model.name),el('p','MMSI '+model.mmsi+' · Heard '+dateLabel(model.seen)+' · '+(model.ageMinutes<=1?'within the past minute':model.ageMinutes+' minutes ago'),'follow-dateline'));
      const badge=el('div',undefined,'follow-fresh');badge.dataset.followFresh='true';badge.append(el('b','Dated AIS report'),el('small','Not a confirmed transit or arrival'));
      head.append(intro,badge);content.append(head);
      const reading=el('div',undefined,'follow-reading');
      const observation=el('div',undefined,'follow-observation');
      observation.append(el('p','01 / What the receiver actually knows','follow-eyebrow'),
        el('strong',model.area||'River chapter uncertain'),
        el('p',model.note||model.message));
      const facts=el('dl',undefined,'follow-facts');
      const factsData=[
        ['Heard',dateLabel(model.seen)],
        ['Speed',model.speed===null?'Not reported':model.speed.toFixed(1)+' knots reported'],
        ['Heading',model.heading===null?'Not reported':model.heading+'° reported'],
        ['Destination','Not verified by this AIS feed'],
        ['Lock ETA','Not available from this source']
      ];
      for(const [key,value] of factsData){const pair=el('div');pair.append(el('dt',key),el('dd',value));facts.append(pair);}
      observation.append(facts);reading.append(observation);
      const rail=el('div',undefined,'follow-corridor');
      rail.append(el('p','02 / The Seaway staircase · Geographic reference','follow-eyebrow'),
        el('p','The highlighted chapter is where this report was received. The other chapters show how the waterway connects, not where this ship has been or will go.'));
      const ol=el('ol',undefined,'follow-rail');
      for(const c of model.chapters){
        const li=el('li',undefined,c.current?'is-current':'');
        li.append(el('span',String(c.index).padStart(2,'0'),'follow-rail-number'),el('strong',c.name));
        li.append(el('small',c.current?'Recent position in this chapter':'Geographic reference only'));
        if(c.current)li.setAttribute('aria-current','step');
        ol.append(li);
      }
      rail.append(ol);reading.append(rail);content.append(reading);
      const actions=el('div',undefined,'follow-actions');
      actions.dataset.followSteps='true';
      actions.append(el('p','03 / Make the next useful choice','follow-eyebrow'));
      if(model.locks.length){
        const p=el('p','Locks in this river chapter (not a confirmed next lock):');
        actions.append(p);
        const row=el('div',undefined,'follow-action-row');
        for(const lock of model.locks){
          row.append(button('Explore '+lock.name+' lock',()=>{onExploreLock?.(lock.id);onTrack?.('follow_lock_reference');}));
        }
        actions.append(row);
      }
      if(model.viewpoints.length){
        actions.append(el('p','Documented shore-watching places in the same river chapter. Check access and official order of turn first.'));
        const row=el('div',undefined,'follow-action-row');
        for(const site of model.viewpoints)row.append(button('Plan '+site.name+' viewing',()=>{onExploreView?.(site.id);onTrack?.('follow_viewing_plan');}));
        actions.append(row);
      }else actions.append(el('p','No independently verified public viewpoint is attached to this received river chapter. A lock or ship symbol is not a visitor entrance.'));
      if(model.neighbors.length){
        actions.append(el('p','Explore an adjacent stretch by geographic direction. These buttons do not predict the ship’s direction or movement.'));
        const row=el('div',undefined,'follow-action-row');
        for(const next of model.neighbors)row.append(button(next.direction+' · '+next.name,()=>{onExploreRegion?.(next.id);onTrack?.('follow_neighbor');}));
        actions.append(row);
      }
      const util=el('div',undefined,'follow-action-row');
      util.append(button('Recheck this vessel across the Seaway',()=>{onInspectAll?.(model.mmsi);onTrack?.('follow_search_corridor');},'button'));
      util.append(link('Official lock order of turn ↗',reference.officialQueue));
      util.append(link('Original AIS source ↗','https://ais.openwaters.io/v1/vessels/'+model.mmsi));
      actions.append(util);
      if(model.id==='thousand-islands') {
        const cameras=el('a','Look at the Thousand Islands river cameras ↓');cameras.href='#seawayCameras';actions.append(cameras);
      }
      content.append(actions);
      const beyond=el('div',undefined,'follow-beyond');
      beyond.append(el('p','Further into the Great Lakes · Other waterways, not this vessel’s verified route','follow-eyebrow'));
      const onward=el('div',undefined,'follow-next-links');
      for(const [text,url] of [['Welland Canal','/welland-canal/'],['Soo Locks','/soo-locks/'],['Great Lakes freighter tracker','/great-lakes-freighter-tracking/']]){
        const node=el('a',text+' ↗');node.href=url;onward.append(node);
      }
      beyond.append(onward);content.append(beyond);
      setHidden(false);
      writeStatus(model.message);
      return true;
    }
    return {select,clear,expire,get active(){return active;}};
  }
  return {CORRIDOR,analyze,mount};
});
