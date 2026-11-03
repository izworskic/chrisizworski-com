'use strict';
/* Page-specific measurement without location, mission identifiers, cookies,
 * hidden link interception, or third-party page-time API calls.
 * Google Analytics is inserted through the site's normal build pipeline.
 * If analytics is blocked or absent, all navigation remains ordinary links. */
(() => {
  const ALLOWED_PLACEMENTS=new Set([
    'nav','hero','decision','weather','check-schedule','bottom','map','map-panel'
  ]);
  function event(name,parameters) {
    if(typeof window.gtag!=='function')return;
    window.gtag('event',name,{
      guide:'vandenberg-rocket-launch-viewing',
      transport_type:'beacon',
      ...parameters
    });
  }
  document.addEventListener('click',e=>{
    const link=e.target.closest?.('a[data-vg-planner]');
    if(!link)return;
    const placement=link.dataset.vgPlanner;
    if(!ALLOWED_PLACEMENTS.has(placement))return;
    // Track only a fixed destination. Neither searches nor personal locations
    // nor a launch query parameter are sent to analytics.
    const target=new URL(link.href,location.origin);
    if(target.origin!==location.origin||
        target.pathname!=='/national-tools/rocket-launch-live/'||
        target.searchParams.get('region')!=='california')return;
    event('vandenberg_guide_planner_open',{placement});
  });
  document.querySelectorAll('.vg-faq-item').forEach((entry,index)=>{
    entry.addEventListener('toggle',()=>{
      if(entry.open)event('vandenberg_guide_faq_open',{question_number:index+1});
    });
  });
})();
