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
      case 'aligned':return 'Both calendars list nearly the same launch time';
      case 'disagrees':return 'The launch calendars show different times';
      case 'precision-not-comparable':return 'At least one calendar has no exact liftoff time';
      case 'identity-not-distinct':return 'Can’t be sure both calendars mean the same flight';
      case 'ambiguous':return 'Multiple similar missions listed; comparison withheld';
      case 'not-in-next-five':return 'This flight isn’t in the other calendar’s next five';
      case 'snapshot-mismatch':return 'The latest launch time hasn’t been cross-checked';
      case 'stale':return 'This comparison needs a fresh check';
      case 'historical-only':return 'Only an older schedule comparison is available';
      case 'awaiting-reconciliation':return 'Waiting for the next calendar comparison';
      case 'source-unavailable':return 'The second launch calendar isn’t responding';
      default:return 'We can’t compare launch times right now';
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
      'Schedule checked '+checked(data.observedAt,zone)+' · '+(status==='recent'?'Recently checked':'Check the operator before relying on this'):
      'No calendar update recorded yet');
    set('lt-headline',mismatched?
      'The launch time has changed since the last comparison':
      data?.headline||'No recent update tied to this flight');
    set('lt-explainer',mismatched?
      'The time above is newer than this comparison. Check the operator while we wait for an updated cross-check.':
      data?.story||'The operator has the final word on whether the rocket flies.');
    const c=data?.comparison||{};
    const cStatus=mismatched?'snapshot-mismatch':c.status||'unknown';
    root.dataset.compare=cStatus;
    set('lt-compare-state',comparisonText({status:cStatus}));
    set('lt-compare-note',mismatched?
      'The older comparison doesn’t confirm the new launch time.':
      c.note||'There isn’t enough information to compare the two schedules.');
    const validTime=['minute','second'].includes(data?.netPrecision);
    const currentC=validTime&&cStatus==='aligned'&&c.otherTarget?
      ' Launch Library 2: '+readable(data.net,zone,data.netPrecision)+
      ' · RocketLaunch.Live: '+readable(c.otherTarget,zone,data.netPrecision)+'.':'';
    if(currentC)set('lt-compare-note',(c.note||'')+currentC);
    if(validTime&&cStatus==='disagrees'&&c.otherTarget){
      set('lt-compare-note','Launch Library 2: '+readable(data.net,zone,data.netPrecision)+
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
        const heading=evt.field==='target-time'?'Launch time changed':
          evt.field==='ll2-status'?'Launch status changed':
          evt.field==='time-precision'?'More precise launch time posted':'Launch window moved';
        changes.appendChild(record(evt.field==='target-time'?'target-time':'event',
          'We noticed this change '+checked(evt.detectedAt,zone),heading,
          was+' → '+is+'. This change appeared on the public calendar, not in an official launch decision.',
          evt.sourceUrl,'See the calendar entry'));
      }
      if(!changes.children.length)addEmpty(changes,
        status==='not-monitored'?'We’re not tracking changes for this flight yet.':
          'No schedule changes recorded here yet. It’s still worth checking the operator near liftoff.');
    }
    if(sources){
      sources.replaceChildren();
      const updates=Array.isArray(data?.updates)?data.updates.slice(0,4):[];
      const news=Array.isArray(data?.news)?data.news.slice(0,3):[];
      for(const update of updates){
        sources.appendChild(record('source-update',
          'Calendar contributor update · '+checked(update.publishedAt,zone),
          update.summary||'Published update',
          'A public calendar update, not an official launch approval. Check the linked source.',
          update.sourceUrl||'https://ll.thespacedevs.com/','Read the original update'));
      }
      for(const story of news){
        sources.appendChild(record('news',
          (story.newsSite||'Space news')+' · '+checked(story.publishedAt,zone),
          story.title||'Article about this mission',
          'This news story was linked to the mission, but it may also discuss other flights.',
          story.sourceUrl,'Read article'));
      }
      if(!sources.children.length)addEmpty(sources,
        data?.status==='not-monitored'||data?.status==='not-returned'?
          'No fresh update tied to this flight. Check Spaceflight Now and the launch operator.':
          data?.updatesStatus==='not-prioritized'||data?.newsStatus==='not-prioritized'?
          'The flight is listed, but we don’t have recent stories or schedule-change history for it yet.':
          'No new schedule change or related news appeared in the latest check.');
    }
    const health=data?.sourceHealth||{};
    const schedule=Array.isArray(health.schedule)?health.schedule:[];
    const failed=schedule.filter(row=>row.status!=='ok').length;
    const words=[data?.coverage ||
      'Launch schedules update frequently. Detailed news checks focus on a smaller group of upcoming flights.'];
    if(failed)words.push(failed+' of '+schedule.length+' launch-calendar checks could not be completed.');
    if(data?.updatesStatus==='unavailable')words.push('Past calendar changes could not be checked.');
    if(data?.updatesStatus==='not-prioritized')words.push('Detailed schedule updates haven’t been checked for this flight yet.');
    if(data?.newsStatus==='unavailable')words.push('Related news couldn’t be checked right now.');
    if(data?.newsStatus==='not-prioritized')words.push('Looking for news tied to this flight.');
    if(data?.sourceGroupComplete===false)
      words.push('Some launch listings may be missing from this calendar.');
    if(health.rll?.status==='unavailable')words.push('The other calendar couldn’t be checked.');
    words.push('A matching calendar doesn’t guarantee liftoff, open gates or clear skies.');
    set('lt-source-health',words.join(' '));
  }
  async function load(detail){
    const id=detail?.launchId;
    selected=detail||null;
    const token=++sequence;
    if(!UUID.test(id||'')){
      render({status:'not-monitored',headline:'Choose a flight to see its update history',
        story:'Each launch has its own changing schedule and news.'});
      return;
    }
    root.dataset.status='loading';
    set('lt-headline','Checking what has changed for this flight…');
    set('lt-timestamp','Loading the latest schedule comparison…');
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
      render({status:'unavailable',headline:'We can’t load schedule updates right now',
        story:'You can still check the flight’s calendar entry and the operator. A failed update check doesn’t mean the launch was delayed.'});
    }
  }
  document.addEventListener('rocket-truth:mission-selected',event=>{
    void load(event.detail);
  });
  // Let pages with no active mission explain the data before any selection.
  render({status:'not-monitored',headline:'Choose a launch to see what has changed',
    story:'We track changes to the particular flight you choose, not random news about nearby launches.'});
})();
