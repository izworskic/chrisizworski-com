/* Lake Superior Circle Tour 10-day decision experience.
 * Real shared Rust/WASM when ready; independent, source-gated JS oracle when
 * blocked. Never claims park access, predicted traffic or permission to cross.
 */
(function(){
  'use strict';
  const data=document.getElementById('ct-intelligence-days');
  const hoursInput=document.getElementById('ct-hours');
  const seasonInput=document.getElementById('ct-season');
  const brief=document.getElementById('trip-brief');
  const kernel=window.CircleTourRust;
  if(!data||!hoursInput||!seasonInput||!brief||!kernel?.feasibility)return;
  let days;
  try {days=JSON.parse(data.textContent).days;}catch{return;}
  const labels={1:'Reasonable day allowance',2:'Tight day · protect the buffer',
    3:'Over budget · shorten the visits',4:'Clock estimate held · incomplete road approach',
    5:'Check this season’s park access',0:'Time policy unavailable'};
  function update(){
    const hours=Number(hoursInput.value);
    const season=seasonInput.value;
    if(![8,9,10,12].includes(hours)||!['summer','autumn','winter'].includes(season))return;
    const count={1:0,2:0,3:0,4:0,5:0,0:0};
    for(const day of days){
      const state=kernel.feasibility({miles:day.miles,availableHours:hours,
        visitHours:day.visits,borderMinutes:day.borderReserveMinutes,
        evidenceComplete:day.complete,
        seasonalHold:season==='winter'&&day.seasonalSensitive});
      count[state.code]++;
      const target=document.querySelector('[data-day="'+day.day+'"] .day-state');
      if(target){
        target.dataset.code=String(state.code);
        target.textContent=labels[state.code];
        target.title=state.remainingHours===null?
          'This is not a verified route/park-access calculation.':
          'Approximate editorial time left: '+state.remainingHours+' hr. Not live driving data.';
      }
    }
    const notes=[
      count[1]+' day(s) with a reasonable editorial allowance',
      count[2]+' tight',
      count[3]+' needing fewer activities',
      count[4]+' withheld for a missing full road approach',
      count[5]+' needing a seasonal access check'
    ];
    brief.textContent=notes.join(' · ')+'. These are trip-planning estimates, not arrival-time forecasts.';
    document.documentElement.dataset.circleRustTripEngine=kernel.engine();
  }
  hoursInput.addEventListener('change',update);
  seasonInput.addEventListener('change',update);
  update();
  Promise.resolve(kernel.activate?.()).then(update).catch(update);
})();
