'use strict';
/*
 * Shared evidence layer for the two rocket launch experiences.
 * The selected mission arrives from the host app; this script reads ONLY our
 * cached, scheduled Postgres-backed API. No third-party client requests.
 */
(()=>{
  const root=document.getElementById('launch-truth-desk');
  if(!root)return;
  const API='/api/rocket-launch-truth';
  const $=id=>document.getElementById(id);
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const node=(tag,cls,value)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!=null)el.textContent=String(value);
    return el;
  };
  const set=(id,value)=>{const el=$(id);if(el)el.textContent=value??'—';};
  let sequence=0;
  let selected=null;
  const readable=(value,zone='America/New_York',precision='minute')=>{
    if(!value||!Number.isFinite(Date.parse(value)))return 'Time unverified';
    const d=new Date(value);
    return new Intl.DateTimeFormat('en-US',{
      timeZone:['minute','second'].includes(precision)?zone:'UTC',
      month:'short',day:'numeric',year:'numeric',
      ...( ['minute','second'].includes(precision) ?
        {hour:'numeric',minute:'2-digit',timeZoneName:'short'} : {})
    }).format(d);
  };
  const checked=(value,zone)=>{
    if(!value||!Number.isFinite(Date.parse(value)))return 'Not recorded';
    return readable(value,zone,'minute');
  };
  const safeUrl=url=>{
    if(typeof url!=='string'||url.length>440)return false;
    try{
      const u=new URL(url);
      return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
        /^[a-z0-9](?:[a-z0-9.-]{0,240})\.[a-z]{2,}$/i.test(u.hostname)&&
        !/(?:^|\.)localhost$|\.local$|\.internal$/.test(u.hostname)&&
        !/^\d+(?:\.\d+){3}$/.test(u.hostname);
    }catch{return false;}
  };
  const anchor=(url,label)=>{
    if(!safeUrl(url))return null;
    const a=node('a','lt-source-link',label);
    a.href=url;
    a.target='_blank';a.rel='noopener noreferrer';
    return a;
  };
  const addEmpty=(parent,message)=>{
    parent.replaceChildren(node('p','lt-empty',message));
  };
  const record=(kind,meta,title,explanation,url,label='Original source')=>{
    const card=node('article','lt-item');
    card.dataset.type=kind;
    card.appendChild(node('small','',meta));
    card.appendChild(node('strong','',title));
    if(explanation)card.appendChild(node('p','',explanation));
    const a=anchor(url,label);
    if(a)card.appendChild(a);
    return card;
  };
  function comparisonText(item) {
    switch(item.status){
      case 'aligned':return 'Target times agree within one minute';
      case 'disagrees':return 'The two launch calendars disagree';
      case 'precision-not-comparable':return 'Dates listed, exact times not comparable';
      case 'identity-not-distinct':return 'Mission identity too ambiguous to compare';
      case 'ambiguous':return 'Duplicate mission markers: not compared';
      case 'not-in-next-five':return 'Not present in the other provider’s next five';
      case 'snapshot-mismatch':return 'New target not yet reconciled';
      case 'stale':return 'Last cross-check is now stale';
      case 'historical-only':return 'Earlier source snapshot only';
      case 'awaiting-reconciliation':return 'Next independent check pending';
      case 'source-unavailable':return 'Other calendar unavailable';
      default:return 'Cross-calendar comparison not verified';
    }
  }
  function render(data){
    const zone=selected?.timezone||'America/New_York';
    let status=data?.status||'not-monitored';
    const current=data?.net,chosen=selected?.net;
    const mismatched=Boolean(chosen&&current&&Date.parse(chosen)!==Date.parse(current));
    if(mismatched)status='target-changed-after-check';
    root.dataset.status=status;
    set('lt-timestamp',data?.observedAt?
      'Evidence checked '+checked(data.observedAt,zone)+' · '+(status==='recent'?'Current observation':'Check freshness before relying on it'):
      'No scheduled source observation yet');
    set('lt-headline',mismatched?
      'The selected launch target has moved since the source check':
      data?.headline||'No mission-matched source evidence available');
    set('lt-explainer',mismatched?
      'The time on the main launch card differs from the monitored snapshot. This evidence remains historical until the next scheduled comparison.':
      data?.story||'The launch operator retains the authority to confirm operational status.');
    const c=data?.comparison||{};
    const cStatus=mismatched?'snapshot-mismatch':c.status||'unknown';
    root.dataset.compare=cStatus;
    set('lt-compare-state',comparisonText({status:cStatus}));
    set('lt-compare-note',mismatched?
      'Do not treat the previous cross-source result as confirmation of the new target.':
      c.note||'There is not enough source evidence for a second-calendar comparison.');
    const validTime=['minute','second'].includes(data?.netPrecision);
    const currentC=validTime&&cStatus==='aligned'&&c.otherTarget?
      ' LL2: '+readable(data.net,zone,data.netPrecision)+
      ' · RocketLaunch.Live: '+readable(c.otherTarget,zone,data.netPrecision)+'.':'';
    if(currentC)set('lt-compare-note',(c.note||'')+currentC);
    if(validTime&&cStatus==='disagrees'&&c.otherTarget){
      set('lt-compare-note','LL2: '+readable(data.net,zone,data.netPrecision)+
        '. RocketLaunch.Live: '+readable(c.otherTarget,zone,data.netPrecision)+
        '. Their published targets differ. Check the operator for the latest authoritative window.');
    }
    const changes=$('lt-changes'),sources=$('lt-sources');
    if(changes){
      changes.replaceChildren();
      const events=Array.isArray(data?.timeline)?data.timeline.slice(0,8):[];
      for(const evt of events){
        if(evt?.kind!=='schedule-field-change')continue;
        const was=evt.field==='target-time'?
          readable(evt.before,zone,data.netPrecision):evt.before||'Not listed';
        const is=evt.field==='target-time'?
          readable(evt.after,zone,data.netPrecision):evt.after||'Not listed';
        const heading=evt.field==='target-time'?'Launch target revised':
          evt.field==='ll2-status'?'Published status changed':
          evt.field==='time-precision'?'Schedule precision changed':'Launch window changed';
        changes.appendChild(record(evt.field==='target-time'?'target-time':'event',
          'First detected '+checked(evt.detectedAt,zone),heading,
          was+' → '+is+'. This is a detected LL2 change, not a confirmed operator decision.',
          evt.sourceUrl,'LL2 mission record'));
      }
      if(!changes.children.length)addEmpty(changes,
        status==='not-monitored'?'This launch is outside the currently sampled missions. No change history has been established.':
          'No changes have been observed by this monitor yet. This does not prove the schedule has always been unchanged.');
    }
    if(sources){
      sources.replaceChildren();
      const updates=Array.isArray(data?.updates)?data.updates.slice(0,4):[];
      const news=Array.isArray(data?.news)?data.news.slice(0,3):[];
      for(const update of updates){
        sources.appendChild(record('source-update',
          'LL2 contributor update · '+checked(update.publishedAt,zone),
          update.summary||'Published update',
          'Source-linked contributor record; not an official confirmation unless the linked operator independently supports it.',
          update.sourceUrl||'https://ll.thespacedevs.com/','View cited source'));
      }
      for(const story of news){
        sources.appendChild(record('news',
          (story.newsSite||'Space news')+' · '+checked(story.publishedAt,zone),
          story.title||'Article indexed to this mission',
          'Spaceflight News API indexed this article to the selected launch ID. It can discuss multiple launches.',
          story.sourceUrl,'Read article'));
      }
      if(!sources.children.length)addEmpty(sources,
        data?.status==='not-monitored'||data?.status==='not-returned'?
          'No current mission-linked source record. Check Spaceflight Now and the launch operator.':
          data?.updatesStatus==='not-prioritized'||data?.newsStatus==='not-prioritized'?
          'This mission is in the full schedule ledger, but detailed news and contributor history have not been refreshed this cycle. This is not evidence that no reporting exists.':
          'No qualifying update or launch-ID-indexed news was returned by the checked feeds.');
    }
    const health=data?.sourceHealth||{};
    const schedule=Array.isArray(health.schedule)?health.schedule:[];
    const failed=schedule.filter(row=>row.status!=='ok').length;
    const words=[data?.coverage ||
      'The national observer records every returned coastal launch; in-depth reporting checks rotate across priority missions.'];
    if(failed)words.push(failed+' of '+schedule.length+' LL2 schedule source checks unavailable.');
    if(data?.updatesStatus==='unavailable')words.push('LL2 update history unavailable.');
    if(data?.updatesStatus==='not-prioritized')words.push('Contributor updates not checked for this mission in this cycle.');
    if(data?.newsStatus==='unavailable')words.push('News matching unavailable.');
    if(data?.newsStatus==='not-prioritized')words.push('Exact-ID news enrichment pending.');
    if(health.rll?.status==='unavailable')words.push('RocketLaunch.Live check unavailable.');
    words.push('No agreement, absence, or reporting claims establish a launch GO, scrub, entry permission or favorable weather.');
    set('lt-source-health',words.join(' '));
  }
  async function load(detail){
    const id=detail?.launchId;
    selected=detail||null;
    const token=++sequence;
    if(!UUID.test(id||'')){
      render({status:'not-monitored',headline:'Choose an upcoming mission to inspect the evidence',
        story:'Mission history and news are linked to a specific launch ID.'});
      return;
    }
    root.dataset.status='loading';
    set('lt-headline','Checking independently collected launch evidence…');
    set('lt-timestamp','Reading the scheduled Postgres observation…');
    try{
      const r=await fetch(API+'?launchId='+encodeURIComponent(id),{
        headers:{Accept:'application/json'},signal:AbortSignal.timeout(9500)
      });
      if(!r.ok)throw new Error('source-ledger-response');
      const body=await r.json();
      if(token!==sequence||!body?.ok||body.selectedLaunchId!==id)return;
      render(body);
    }catch(_){
      if(token!==sequence)return;
      render({status:'unavailable',headline:'The evidence ledger could not be read',
        story:'The launch schedule and original operator links remain available. A temporary source failure does not establish a delay or scrub.'});
    }
  }
  document.addEventListener('rocket-truth:mission-selected',event=>{
    void load(event.detail);
  });
  // Let pages with no active mission explain the data before any selection.
  render({status:'not-monitored',headline:'Choose a mission to open its source ledger',
    story:'The ledger compares named missions; it never substitutes general rocket news for verified operational reports.'});
})();
