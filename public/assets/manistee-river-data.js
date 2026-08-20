window.MANISTEE_FIELD_DATA = {
  version: '2026-08-20',
  bbox: [-86.35, 44.02, -84.68, 44.95],
  waterways: [
    {id:'manistee',name:'Manistee River',kind:'mainstem',source:'USGS National Hydrography Dataset'},
    {id:'pine',name:'Pine River',kind:'tributary',source:'USGS National Hydrography Dataset'},
    {id:'bear-creek',name:'Bear Creek',kind:'tributary',source:'USGS National Hydrography Dataset'},
    {id:'little-manistee',name:'Little Manistee River',kind:'companion',source:'USGS National Hydrography Dataset',note:'A separate Manistee-basin river that enters Manistee Lake; shown as a companion water, not labeled as a direct tributary of the Manistee River.'}
  ],
  reaches: [
    {id:'upper',name:'Upper Manistee',summary:'Cold-water trout country from the headwaters through the Grayling/Kalkaska access network.',focus:['trout','wade','paddle']},
    {id:'middle',name:'Middle Manistee',summary:'Broader water through the Hodenpyl reach and Manistee River Trail country.',focus:['paddle','camp','hike','fish']},
    {id:'tippy',name:'Tippy backwaters & dam',summary:'Impounded water above Tippy and the major transition to the lower river.',focus:['boat','camp','fish']},
    {id:'lower',name:'Lower Manistee',summary:'National Recreation River below Tippy, with developed access and migratory salmonid fishing.',focus:['steelhead','salmon','boat','paddle']},
    {id:'pine',name:'Pine River',summary:'National Scenic River tributary with cold water, carry-in launches and its own live USGS gauge.',focus:['paddle','trout','camp']}
  ],
  places: [
    {
      id:'deward',name:'Deward Access',type:'access',waterway:'manistee',reach:'upper',lat:44.83726,lon:-84.832435,
      activities:['fish','paddle','scenic'],confidence:'community-verified',locationSource:'Traverse Area Paddle Club',
      source:{name:'Traverse Area Paddle Club driving directions',url:'https://www.traverseareapaddleclub.org/content.aspx?club_id=813410&module_id=58595&page_id=22'},
      note:'Upper-river access in the Deward area. Road conditions can be rough; verify locally before relying on a shuttle route.'
    },
    {
      id:'manistee-bridge',name:'Manistee River Bridge State Forest Campground',type:'access-camp',waterway:'manistee',reach:'upper',lat:44.69468216,lon:-84.847495,
      activities:['fish','paddle','camp'],confidence:'agency',locationSource:'Michigan DNR',
      source:{name:'Michigan DNR',url:'https://www.michigan.gov/recsearch/sfcampgroundsa-m/ManisteeRiverBridge'},
      note:'DNR campground with two river access points. Boats must be carried down stairs; DNR describes a carry of at least 30 yards.'
    },
    {
      id:'ccc',name:'CCC Bridge / Sunset Trail Access',type:'access',waterway:'manistee',reach:'upper',lat:44.614621,lon:-84.991246,
      activities:['fish','paddle'],confidence:'community-verified',locationSource:'Traverse Area Paddle Club',
      source:{name:'Traverse Area Paddle Club driving directions',url:'https://www.traverseareapaddleclub.org/content.aspx?club_id=813410&module_id=58595&page_id=22'},
      note:'Important upper-river shuttle point. Gravel-road approaches can be slow or rough.'
    },
    {
      id:'sharon',name:'Sharon Road Access',type:'access',waterway:'manistee',reach:'upper',lat:44.585976,lon:-85.090657,
      activities:['fish','paddle'],confidence:'community-verified',locationSource:'Traverse Area Paddle Club',
      source:{name:'Traverse Area Paddle Club driving directions',url:'https://www.traverseareapaddleclub.org/content.aspx?club_id=813410&module_id=58595&page_id=22'},
      note:'Upper Manistee access near Sharon Road. Inspect the takeout before committing to a shuttle because local access details can change.'
    },
    {
      id:'seaton-creek',name:'Seaton Creek Campground',type:'camp-trail',waterway:'manistee',reach:'middle',lat:44.35778,lon:-85.80924,
      activities:['camp','hike','fish','scenic'],confidence:'agency',locationSource:'Recreation.gov / USFS',
      source:{name:'Recreation.gov — Huron-Manistee National Forests',url:'https://www.recreation.gov/camping/campgrounds/250045'},
      note:'At the upper end of Hodenpyl Dam Pond and a key access for the Manistee River Trail / North Country Trail loop.'
    },
    {
      id:'red-bridge',name:'Red Bridge River Access',type:'access-camp',waterway:'manistee',reach:'middle',lat:44.28379,lon:-85.86205,
      activities:['paddle','camp','hike','fish'],confidence:'mapped-agency-site',locationSource:'OpenStreetMap; facility is USFS',
      source:{name:'Huron-Manistee National Forests recreation network',url:'https://www.fs.usda.gov/r09/huron-manistee/recreation'},
      note:'River access and camping near the upper backwater / trail corridor. Verify current site status with the Forest Service.'
    },
    {
      id:'government-landing',name:'Government Landing',type:'access-camp',waterway:'manistee',reach:'tippy',lat:44.26298,lon:-85.88693,
      activities:['paddle','camp','fish'],confidence:'mapped-agency-site',locationSource:'OpenStreetMap; facility is USFS',
      source:{name:'Huron-Manistee National Forests',url:'https://www.fs.usda.gov/r09/huron-manistee/recreation/camping-cabins'},
      note:'Carry-in access associated with Forest Service designated camping in the Tippy backwaters area. Verify current site status before travel.'
    },
    {
      id:'tippy-dam',name:'Tippy Dam Recreation Area',type:'access-camp',waterway:'manistee',reach:'lower',lat:44.26423,lon:-85.93814,
      activities:['fish','camp','paddle','boat'],confidence:'agency',locationSource:'Michigan DNR',
      source:{name:'Michigan DNR — Tippy Dam Recreation Area',url:'https://www.michigan.gov/recsearch/parks/TippyDam'},
      note:'Major lower-river access. DNR lists an accessible fishing pier, camping, paddling, and launches above and below the dam.'
    },
    {
      id:'blacksmith',name:'Blacksmith Bayou Access',type:'access',waterway:'manistee',reach:'lower',lat:44.25861,lon:-86.03306,
      activities:['fish','paddle','hike'],confidence:'mapped-agency-site',locationSource:'OpenStreetMap; facility is USFS',
      source:{name:'U.S. Fish & Wildlife Service — Manistee river corridor',url:'https://www.fws.gov/rivers/river/manistee'},
      note:'One of the Forest Service developed access sites in the National Recreation River corridor.'
    },
    {
      id:'high-bridge',name:'High Bridge Access',type:'access',waterway:'manistee',reach:'lower',lat:44.26776,lon:-86.01602,
      activities:['fish','paddle','hike','scenic'],confidence:'mapped-agency-site',locationSource:'OpenStreetMap; facility is USFS',
      source:{name:'U.S. Fish & Wildlife Service — Manistee river corridor',url:'https://www.fws.gov/rivers/river/manistee'},
      note:'Forest Service developed river access in the National Recreation River corridor.'
    },
    {
      id:'bear-creek-access',name:'Bear Creek River Access',type:'access',waterway:'manistee',reach:'lower',lat:44.2917,lon:-86.1142,
      activities:['fish','paddle','scenic'],confidence:'mapped-agency-site',locationSource:'OpenStreetMap; facility is USFS',
      source:{name:'U.S. Fish & Wildlife Service — Manistee river corridor',url:'https://www.fws.gov/rivers/river/manistee'},
      note:'At the confluence of Big Bear Creek and the Manistee. Forest Service identifies Bear Creek as a cold-water scenic-study tributary.'
    },
    {
      id:'rainbow-bend',name:'Rainbow Bend',type:'access',waterway:'manistee',reach:'lower',lat:44.29206,lon:-86.14873,
      activities:['fish','paddle'],confidence:'mapped-agency-site',locationSource:'OpenStreetMap; facility is USFS',
      source:{name:'U.S. Fish & Wildlife Service — Manistee river corridor',url:'https://www.fws.gov/rivers/river/manistee'},
      note:'Forest Service developed river access in the National Recreation River corridor.'
    },
    {
      id:'pine-elm-flats',name:'Elm Flats Canoe Landing',type:'access',waterway:'pine',reach:'pine',lat:44.15399,lon:-85.70394,
      activities:['paddle','fish'],confidence:'mapped-agency-site',locationSource:'USFS / mapped public recreation data',
      source:{name:'Huron-Manistee National Forests — Pine National Scenic River',url:'https://www.fs.usda.gov/r09/huron-manistee/recreation/pine-national-scenic-river-0'},
      note:'Forest Service landing marking the beginning of the permitted portion of the Pine River. Check current permit and site-status information.'
    },
    {
      id:'pine-peterson',name:'Peterson Bridge Canoe Access',type:'access-camp',waterway:'pine',reach:'pine',lat:44.20708,lon:-85.80027,
      activities:['paddle','fish','camp'],confidence:'mapped-agency-site',locationSource:'USFS / public recreation data',
      source:{name:'Huron-Manistee National Forests — Pine National Scenic River',url:'https://www.fs.usda.gov/r09/huron-manistee/recreation/pine-national-scenic-river-0'},
      note:'Carry-in Pine River access with adjacent campground. Check Forest Service permit requirements before paddling the permit reach.'
    },
    {
      id:'pine-low-bridge',name:'Low Bridge Canoe Landing',type:'access',waterway:'pine',reach:'pine',lat:44.21611,lon:-85.90243,
      activities:['paddle','fish'],confidence:'mapped-agency-site',locationSource:'USFS / public recreation data',
      source:{name:'Huron-Manistee National Forests — Pine National Scenic River',url:'https://www.fs.usda.gov/r09/huron-manistee/recreation/pine-national-scenic-river-0'},
      note:'Carry-in Forest Service landing on the lower Pine River.'
    }
  ],
  gauges: [
    {id:'04123500',name:'Manistee near Grayling',waterway:'manistee',reach:'upper',lat:44.6930538,lon:-84.8471415,sourceUrl:'https://waterdata.usgs.gov/monitoring-location/USGS-04123500/'},
    {id:'04124000',name:'Manistee near Sherman',waterway:'manistee',reach:'upper',lat:44.4363924,lon:-85.6986792,sourceUrl:'https://waterdata.usgs.gov/monitoring-location/USGS-04124000/'},
    {id:'04124200',name:'Manistee near Mesick',waterway:'manistee',reach:'middle',lat:44.3630596,lon:-85.8209050,sourceUrl:'https://waterdata.usgs.gov/monitoring-location/USGS-04124200/'},
    {id:'04125550',name:'Manistee near Wellston',waterway:'manistee',reach:'lower',lat:44.2594446,lon:-85.9416248,sourceUrl:'https://waterdata.usgs.gov/monitoring-location/USGS-04125550/'},
    {id:'04125460',name:'Pine at High School Bridge',waterway:'pine',reach:'pine',lat:44.1933401,lon:-85.7697863,sourceUrl:'https://waterdata.usgs.gov/monitoring-location/USGS-04125460/'},
    {id:'04126200',name:'Little Manistee near Freesoil (historic)',waterway:'little-manistee',reach:'companion',lat:44.1836158,lon:-86.1675811,sourceUrl:'https://waterdata.usgs.gov/monitoring-location/USGS-04126200/',historic:true}
  ],
  sources: {
    hydrography:{name:'USGS National Hydrography Dataset',url:'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer'},
    usgs:{name:'USGS Water Data for the Nation',url:'https://waterdata.usgs.gov/'},
    regulations:{name:'Michigan DNR 2026 Inland Trout & Salmon Regulations',url:'https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations'},
    regulationMap:{name:'Michigan DNR Inland Trout & Salmon Regulations map',url:'https://www.michigan.gov/dnr/things-to-do/fishing/maps'},
    forest:{name:'Huron-Manistee National Forests',url:'https://www.fs.usda.gov/r09/huron-manistee'},
    nationalRiver:{name:'National Wild and Scenic Rivers System — Manistee',url:'https://www.fws.gov/rivers/river/manistee'}
  },
  planner: {
    disclaimer:'Float times are planning estimates, not promises. Current, wind, portages, fishing time, boat type and stops can change the day substantially.',
    speedMph:{upper:3.0,middle:2.7,lower:3.0,pine:2.8}
  }
};

// Optional decision layers are additive. The core source-backed map, access list,
// live gauges and NHD planner remain usable if either enhancement fails to load.
if(typeof document!=='undefined'){
  for(const src of ['/assets/manistee-river-personas.js','/assets/manistee-river-live-depth.js']){
    const script=document.createElement('script');
    script.src=src;
    script.async=true;
    script.dataset.manisteeEnhancement='true';
    document.head.appendChild(script);
  }
}
