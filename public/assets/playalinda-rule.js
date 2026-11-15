'use strict';
/* Standing Playalinda launch-viewing rule, shared by Rocket Launch Live and
   Space Coast Launch so the two pages can never disagree.

   Source: NPS Canaveral National Seashore Superintendent's Compendium 2026,
   section 1.5(a)(n). During a launch the closed Playalinda District areas are
   the park vistas and the beach at parking area #1 (closed 1/4 mile south to
   the KSC boundary). Beach parking lots 4-7 are not closed, so they are open
   for viewing. Playalinda closes to inbound traffic 30 minutes before launch.

   NPS publishes only closures, never per-launch openings, so this verdict is
   fixed text and must never be gated on a live alert or notice check. The
   cutoff is derived at render time from the displayed launch time, so a slip
   or scrub moves it with no manual edit. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PlayalindaRule=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const SOURCE='https://www.nps.gov/cana/learn/management/superintendent-s-compendium.htm';
  const SOURCE_LABEL='NPS 2026 Superintendent’s Compendium, §1.5(a)(n)';
  const OPEN_LOTS=Object.freeze([4,5,6,7]);
  const CLOSED_BEACH_LOT=1;
  const INBOUND_CUTOFF_MINUTES=30;
  const ALTERNATE='Jetty Park is the alternate; check its park pass and hours.';
  // SLC-40, SLC-41 (Cape Canaveral SFS) and LC-39A (KSC).
  const PAD=/(?:\bSLC[\s-]*4[01]\b|Space Launch Complex[\s-]*4[01]\b|\bLC[\s-]*39A\b|Launch Complex[\s-]*39A\b)/i;
  const EXACT=new Set(['minute','second']);

  const applies=pad=>PAD.test(String(pad||''));
  // Same Intl options as the launch time on both pages ("12:11 PM EST").
  function formatTime(ms,zone){
    try{
      return new Intl.DateTimeFormat('en-US',{timeZone:zone||'America/New_York',
        hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(ms));
    }catch{return null;}
  }
  const verdict=cutoff=>'Yes, Playalinda Beach lots 4-7 are open for viewing this launch. '+
    'Park only in a beach parking lot. Vistas are closed during the launch, and the beach at '+
    'parking area #1 is closed 1/4 mile south to the KSC boundary. '+
    (cutoff?'Arrive before '+cutoff+':':'Arrive before the inbound cutoff:')+
    ' Playalinda closes to inbound traffic 30 minutes before launch.';

  // launch: {pad, net, netPrecision}. Returns null when the rule does not apply.
  function decide(launch,zone){
    if(!launch||!applies(launch.pad))return null;
    const net=Date.parse(launch.net||'');
    const exact=Number.isFinite(net)&&EXACT.has(launch.netPrecision);
    const cutoffMs=exact?net-INBOUND_CUTOFF_MINUTES*60000:null;
    const cutoffLabel=exact?formatTime(cutoffMs,zone):null;
    return Object.freeze({
      state:'open',
      headline:verdict(cutoffLabel),
      cutoffLabel,
      cutoffAt:cutoffLabel?new Date(cutoffMs).toISOString():null,
      note:ALTERNATE,
      source:SOURCE,sourceLabel:SOURCE_LABEL
    });
  }
  const isOpenLot=n=>OPEN_LOTS.includes(Number(n));
  return Object.freeze({decide,applies,verdict,isOpenLot,
    SOURCE,SOURCE_LABEL,OPEN_LOTS,CLOSED_BEACH_LOT,ALTERNATE,INBOUND_CUTOFF_MINUTES});
});
