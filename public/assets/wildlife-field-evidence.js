/* Shared wildlife field-evidence vocabulary. Dates refer to observation events, not fetch times. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WildlifeField=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  var DAY=86400000;
  var KINDS={
    'agency-survey':{label:'Agency field survey',confidence:'Higher source confidence',fresh:14,aging:28,scope:'Counted at the named managed area; not a regional or lake-wide census.'},
    'research-community':{label:'Research-grade community report',confidence:'Moderate source confidence',fresh:7,aging:30,scope:'Identification reviewed within the community; no confirmation at a selected public lookout.'},
    'indexed-community':{label:'Indexed community occurrence',confidence:'Limited source confidence',fresh:7,aging:30,scope:'Indexing, duplicate reports and reporting lag limit confidence; not a site count.'},
    'field-ground':{label:'Visitor-entered ground condition',confidence:'Unverified self-report',fresh:1,aging:2,scope:'Applies only to the ground the visitor actually inspected.'},
    'weather':{label:'Weather forecast',confidence:'Not wildlife evidence',fresh:0,aging:0,scope:'Describes observer comfort or habitat pressure; cannot establish animal presence.'},
    'habitat':{label:'Habitat or seasonal guide',confidence:'Not wildlife evidence',fresh:0,aging:0,scope:'A potential public viewing location is not a sighting or a confirmed wildlife hotspot.'}
  };
  function dayStamp(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value))return null;
    var y=+value.slice(0,4),m=+value.slice(5,7),d=+value.slice(8,10),ts=Date.UTC(y,m-1,d);
    var checked=new Date(ts);
    return checked.getUTCFullYear()===y&&checked.getUTCMonth()===m-1&&checked.getUTCDate()===d?ts:null;
  }
  function assess(type,observedAt,now){
    var info=KINDS[type]||KINDS.habitat,nowMs=Number.isFinite(now)?now:Date.now();
    var stamp=dayStamp(observedAt),today=Date.UTC(new Date(nowMs).getUTCFullYear(),new Date(nowMs).getUTCMonth(),new Date(nowMs).getUTCDate());
    var ageDays=stamp===null||stamp>today?null:Math.floor((today-stamp)/DAY);
    var dateStatus=ageDays===null?'unverified-date':ageDays<=info.fresh?'recent':ageDays<=info.aging?'aging':'historical';
    // A source may be authoritative yet outdated; these are separate dimensions.
    return {sourceType:type,label:info.label,confidence:info.confidence,ageDays:ageDays,
      dateStatus:dateStatus,ageLabel:ageDays===null?'No verified observation date':ageDays===0?'Observed today':ageDays===1?'Observed 1 day ago':'Observed '+ageDays+' days ago',
      scope:info.scope,animalObserved:type==='agency-survey'||type==='research-community'||type==='indexed-community'};
  }
  // Curated public approaches, NOT animal pins or promises of access today.
  // Every entry needs an operator URL. Hunting closures, trail status and collecting rules change.
  var PLACES=[
    {kind:'waterfowl',region:'saginaw-bay',name:'Nayanquing Point · Kitchen Road viewing platform',where:'Pinconning / Saginaw Bay, Michigan',note:'DNR identifies the public viewing platform at the end of Kitchen Road. A managed hunting property; check current visitor access before going.',source:'https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/nayanquing-point-swa',nav:'Kitchen Road Nayanquing Point viewing platform Pinconning Michigan'},
    {kind:'waterfowl',region:'saginaw-bay',name:'Bay City State Park · Tobico Marsh overlooks',where:'3582 State Park Drive, Bay City, Michigan',note:'Public park birding towers and boardwalks; a good watch point, not a DNR waterfowl count site. Check park access and recreation-passport rules.',source:'https://www.michigan.gov/recsearch/parks/baycity',nav:'Bay City State Park 3582 State Park Drive Bay City Michigan'},
    {kind:'waterfowl',region:'saginaw-bay',name:'Shiawassee Refuge · Ferguson Bayou Trail',where:'6000 Bishop Road, Saginaw, Michigan',note:'Viewing decks over wetlands and pools. Closed on specified refuge hunt dates, including some late October–December dates; wildlife drive is seasonal. Verify the refuge closure calendar first.',source:'https://www.fws.gov/refuge/shiawassee/visit-us',nav:'Ferguson Bayou Trail 6000 Bishop Road Saginaw Michigan'},
    {kind:'waterfowl',region:'saginaw-bay',name:'Fish Point State Wildlife Area · approved visitor access',where:'7750 Ringle Road, Unionville, Michigan',note:'Managed DNR waterfowl site with dated surveys. Hunting operations and permitted visitor routes change during the season; check with the field office rather than walking into a managed hunting zone.',source:'https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/fish-point-swa',nav:'Fish Point State Wildlife Area 7750 Ringle Road Unionville Michigan'},
    {kind:'waterfowl',region:'horicon-marsh',name:'Horicon Refuge · Highway 49 TernPike trails',where:'Highway 49, Waupun, Wisconsin',note:'Designated floating boardwalk and trails are public; vehicle tour closes in winter and during some hunts. Check the current USFWS permitted-use map.',source:'https://www.fws.gov/refuge/horicon/visit-us/activities/auto-tour',nav:'Horicon National Wildlife Refuge TernPike Highway 49 Waupun Wisconsin'},
    {kind:'waterfowl',region:'horicon-marsh',name:'Horicon Marsh · DNR Education and Visitor Center',where:'Highway 28, Horicon / Mayville, Wisconsin',note:'Official viewing overlooks and dike trail. Hours, seasonal access and managed hunts should be checked with Wisconsin DNR.',source:'https://dnr.wisconsin.gov/topic/Lands/WildlifeAreas/horicon/birding.html',nav:'Horicon Marsh Education Visitor Center Wisconsin'},
    {kind:'waterfowl',region:'detroit-river',name:'Detroit River International Wildlife Refuge · Gateway',where:'5437 W Jefferson Avenue, Trenton, Michigan',note:'Public river-facing observation opportunities. Check current refuge visitor hours and permitted portions before leaving.',source:'https://www.fws.gov/refuge/detroit-river/visit-us',nav:'Detroit River International Wildlife Refuge 5437 W Jefferson Avenue Trenton Michigan'},
    {kind:'shed',region:'bay-city',name:'Bay City State Park · designated public walking routes',where:'3582 State Park Drive, Bay City, Michigan',note:'Public walking and nature-observation lead only. This is NOT a verified shed-collecting site; ask the park about collecting rules and seasonal closures. Never enter deer winter cover.',source:'https://www.michigan.gov/recsearch/parks/baycity',nav:'Bay City State Park 3582 State Park Drive Bay City Michigan'},
    {kind:'shed',region:'saginaw',name:'Shiawassee Refuge · Woodland Trail',where:'5050 Stroebel Road, Saginaw, Michigan',note:'Approved public walking trail, subject to hunt-date closures; NOT an antler-collecting recommendation. Refuge property rules must be checked, and wildlife left undisturbed.',source:'https://www.fws.gov/refuge/shiawassee/visit-us/trails',nav:'Shiawassee Woodland Trail 5050 Stroebel Road Saginaw Michigan'}
  ];
  function places(kind,region){return PLACES.filter(function(p){return p.kind===kind&&p.region===region;}).map(function(p){return Object.assign({},p);});}
  function renderPlaces(holder,kind,region){
    if(!holder||typeof document==='undefined')return;
    holder.replaceChildren();
    var matching=places(kind,region);
    if(!matching.length){holder.textContent='No public approach has been individually checked for this region. Use the land manager’s access map; a regional forecast pin is not a permitted wildlife-watching location.';return;}
    matching.forEach(function(p){
      var card=document.createElement('article');card.className='wildlife-place';
      var title=document.createElement('strong');title.textContent=p.name;
      var where=document.createElement('small');where.textContent=p.where;
      var note=document.createElement('p');note.textContent=p.note;
      var links=document.createElement('div');links.className='wildlife-place-links';
      var official=document.createElement('a');official.href=p.source;official.target='_blank';official.rel='noopener noreferrer';official.textContent='Check official access';
      var nav=document.createElement('a');nav.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.nav);nav.target='_blank';nav.rel='noopener noreferrer';nav.textContent='Directions';
      links.append(official,nav);card.append(title,where,note,links);holder.append(card);
    });
  }
  return {assess:assess,places:places,renderPlaces:renderPlaces};
});
