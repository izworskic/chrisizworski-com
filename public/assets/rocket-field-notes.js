'use strict';
/*
 * Editorial field notes for Rocket Launch Live USA.
 * Evergreen, manually sourced descriptions. This script never determines
 * launch status, pad location, a flight trajectory, weather or public access.
 * It only describes the selected coast and a positively identified vehicle.
 */
(function(root, factory) {
  const notes=factory();
  if(typeof module==='object' && module.exports) module.exports=notes;
  if(root && root.document) notes.mount(root.document);
})(typeof window!=='undefined'?window:null, function() {
  const PLACES=Object.freeze({
    california:{
      title:'The Pacific is part of the launch',
      lead:'Vandenberg sits among the hills west of Lompoc, where a rocket can rise above the ridgeline and head out over the Pacific. The base has long launched spacecraft into polar orbits, taking advantage of the open ocean to the south.',
      watch:'Look toward the published launch pad, not a guessed flight path. Coastal fog and the marine layer can hide the first part of the climb, even when skies look clearer inland.',
      visit:'There is no general public entrance to the pad. Choose a documented viewing area and check its hours, parking and launch-day restrictions.',
      source:'https://www.vandenberg.spaceforce.mil/About-Us/Fact-Sheets/Display/Article/736798/vandenberg-space-force-base/',
      sourceLabel:'Why rockets launch from Vandenberg · U.S. Space Force',
      guide:'/vandenberg-rocket-launch-viewing/',
      guideLabel:'Explore Vandenberg viewing places'
    },
    florida:{
      title:'A launch across the water',
      lead:'On Florida’s Space Coast, spectators gather along the Indian River and at Atlantic-facing parks to watch rockets leave Kennedy or Cape Canaveral. At first it may be a silent flame on the horizon; the engine sound reaches you later.',
      watch:'The pad matters. A good Titusville view for a Kennedy launch is not automatically the best view of a Cape Canaveral flight. Compare the actual pad and public shoreline before choosing a spot.',
      visit:'Playalinda access can change around launches. Kennedy Visitor Complex viewing and tickets are announced for particular missions; regular admission alone does not guarantee a launch-day place.',
      source:'https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing/',
      sourceLabel:'What Kennedy says about launch viewing',
      guide:'/national-tools/space-coast-launch/',
      guideLabel:'Compare Florida launch viewing spots'
    },
    texas:{
      title:'A giant rocket across a strip of water',
      lead:'The launch tower stands near Boca Chica at the southern tip of Texas. Across the water, South Padre Island offers a very different perspective: spectators can watch from a public shoreline rather than trying to approach an active launch complex.',
      watch:'The rising column of exhaust is only part of the spectacle. On some Starship flights the two stages separate while the booster follows a planned test or recovery profile. The flight plan changes by mission.',
      visit:'Boca Chica Beach and State Highway 4 may close for testing and launches. Check the city’s notices, and confirm the public park’s parking and hours before traveling.',
      source:'https://visitspi.com/attractions/spacex/',
      sourceLabel:'Viewing from South Padre Island · local guide',
      guide:'/starbase-rocket-launch-viewing/',
      guideLabel:'See the Starbase viewing and road guide'
    },
    virginia:{
      title:'A rocket above the salt marsh',
      lead:'Wallops is a working NASA range on Virginia’s Eastern Shore. Around Chincoteague, marsh, water and open sky frame the launch. Some Wallops flights are big orbital rockets; others are small sounding rockets carrying experiments briefly above the atmosphere.',
      watch:'Sounding rockets can vanish from sight in seconds. NASA says some scientific flights have narrow conditions and long waits, so keep your attention on the countdown instead of assuming every launch will last several minutes.',
      visit:'NASA opens its Visitor Center launch-viewing area for selected events. Space and parking are first-come when the area opens; the Chincoteague waterfronts are alternatives, not guaranteed launch-day spots.',
      source:'https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/',
      sourceLabel:'What a Wallops launch is like · NASA',
      guide:'/wallops-rocket-launch-viewing/',
      guideLabel:'Find Wallops public viewing places'
    },
    alaska:{
      title:'A spaceport at the edge of the Pacific',
      lead:'Narrow Cape on Kodiak Island is a rugged coastal landscape rather than an urban launch destination. Alaska Aerospace describes trails, Fossil Beach and wildlife around the range during ordinary public-access periods.',
      watch:'This is a launch-range landscape to understand, not a promised spectator outing. Range safety areas and approaches may close during operations; a place open for recreation on another day may be inaccessible at launch time.',
      visit:'The launch facilities are closed to the public. No launch-specific public spectator area has been independently confirmed here, so do not use a rocket-pad pin as driving directions.',
      source:'https://akaerospace.com/beyond-launch/',
      sourceLabel:'Narrow Cape access and tours · Alaska Aerospace',
      guide:'/kodiak-rocket-launch-viewing/',
      guideLabel:'Read the Kodiak access guide'
    },
    hawaii:{
      title:'A working range on Kauaʻi’s west shore',
      lead:'At Barking Sands, long beaches meet the Pacific along the Navy’s Pacific Missile Range Facility. This is first and foremost a defense and research test range, not a public rocket-viewing attraction.',
      watch:'An activity at the range does not necessarily resemble an orbital rocket launch. Without a mission-specific public announcement and viewing location, we cannot tell you where a launch would be visible.',
      visit:'The Navy permits access to certain designated shoreline areas but restricts other federal property. Operations can change access without notice. Beach access is never permission to enter an active hazard area.',
      source:'https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/',
      sourceLabel:'Official Barking Sands beach-access policy · Navy',
      guide:'/barking-sands-rocket-launch-viewing/',
      guideLabel:'Understand Barking Sands public access'
    }
  });
  const VEHICLES=Object.freeze({
    'falcon-9':{
      title:'Falcon 9: nine engines, then a second act',
      lead:'Nine Merlin engines power Falcon 9 away from the pad. The first stage does the heavy lifting through the lower atmosphere; farther into the flight, the upper stage carries the spacecraft onward.',
      beats:[
        ['At liftoff','Watch the brilliant exhaust and rising plume. The rumble may reach you after the rocket is already climbing.'],
        ['During the climb','The first stage eventually shuts down and separates. At a distant viewing spot, the event may be hard to see with the naked eye.'],
        ['After separation','The first stage may head for a landing on land or at sea, depending on the mission. A return to a nearby landing zone is not a given.']
      ],
      source:'https://www.spacex.com/vehicles/falcon-9/',sourceLabel:'Meet Falcon 9 · SpaceX'
    },
    'falcon-heavy':{
      title:'Falcon Heavy: three cores ignite together',
      lead:'Falcon Heavy combines three Falcon-family first-stage cores. Its 27 Merlin engines give liftoff an unmistakably different scale from a single-core Falcon 9.',
      beats:[
        ['At liftoff','Three engine clusters power the initial climb. How much of that you can see depends on your public viewing position.'],
        ['As it accelerates','The side boosters are designed to separate before the central core completes its work.'],
        ['After separation','Booster recovery plans vary. Do not assume twin landings, nearby sonic booms or a particular return path without a mission plan.']
      ],
      source:'https://www.spacex.com/vehicles/falcon-heavy/',sourceLabel:'Meet Falcon Heavy · SpaceX'
    },
    starship:{
      title:'Starship: two enormous vehicles in one',
      lead:'Starship launches atop the Super Heavy booster. Its cluster of Raptor engines burns liquid methane and oxygen. This is a flight-test program as well as a launch system, and each mission may try something different.',
      beats:[
        ['At ignition','The Super Heavy booster produces the first towering column of exhaust.'],
        ['During ascent','The ship and booster eventually separate; recent vehicles use hot staging, with upper-stage engines igniting around separation.'],
        ['What happens next','A booster may follow a test, splashdown or recovery profile. Never assume a tower catch or landing is planned for the selected flight.']
      ],
      source:'https://www.spacex.com/vehicles/starship/',sourceLabel:'Starship and Super Heavy · SpaceX'
    },
    vulcan:{
      title:'Vulcan: a different rocket for different jobs',
      lead:'Vulcan starts with two methane-fueled BE-4 engines. Some versions also carry powerful solid rocket boosters strapped to the sides, while its Centaur V upper stage is built to deliver spacecraft precisely to their destination.',
      beats:[
        ['At ignition','Look for the main engines and, if this flight uses them, side-mounted solid boosters. The exact number depends on the published vehicle configuration.'],
        ['During ascent','Solid boosters, when fitted, burn early and separate. The bright exhaust may change noticeably during the climb.'],
        ['Beyond the horizon','Centaur V takes over after the booster stage. Much of its work happens beyond what spectators can see from shore.']
      ],
      source:'https://www.ulalaunch.com/rockets/vulcan-centaur',sourceLabel:'Vulcan configurations · United Launch Alliance'
    },
    'new-glenn':{
      title:'New Glenn: built around a returning booster',
      lead:'Seven BE-4 engines power the New Glenn first stage, while an upper stage continues the journey. The large booster is designed for recovery and reuse, but the details of any return depend on the flight.',
      beats:[
        ['At ignition','Watch for the exhaust from the seven-engine first stage as New Glenn clears the pad.'],
        ['As it climbs','The first stage and upper stage separate later in the flight, usually well beyond easy ground-level viewing.'],
        ['The recovery story','A sea-based booster landing may be part of the plan. Check the mission announcement; a successful landing is never guaranteed.']
      ],
      source:'https://www.blueorigin.com/new-glenn',sourceLabel:'New Glenn · Blue Origin'
    },
    alpha:{
      title:'Alpha: a smaller rocket with a focused mission',
      lead:'Firefly’s Alpha is built for smaller satellites. Its carbon-composite body carries four Reaver engines on the first stage and a Lightning engine on the upper stage.',
      beats:[
        ['At ignition','Four Reaver engines power a comparatively compact rocket off the pad.'],
        ['During the climb','The rocket accelerates toward the orbit its payload needs.'],
        ['Above the view','A separate upper-stage engine completes the job. Orbital insertion is not something spectators can confirm by watching the horizon.']
      ],
      source:'https://fireflyspace.com/alpha/',sourceLabel:'Alpha rocket · Firefly Aerospace'
    },
    sounding:{
      title:'Sounding rocket: blink and you may miss it',
      lead:'Sounding rockets carry science instruments briefly into space without entering orbit. They can measure regions satellites cannot sample in the same way, but their visible flight is often very short.',
      beats:[
        ['At liftoff','Look early. NASA warns that some sounding rockets can disappear from sight in seconds.'],
        ['At altitude','The instruments collect data during a brief suborbital journey. The whole flight can last minutes, not hours.'],
        ['The unexpected part','Some experiments need very particular sky or atmospheric conditions. Long holds and repeated scrubs are possible.']
      ],
      source:'https://www.nasa.gov/soundingrockets/overview/',sourceLabel:'Why NASA flies sounding rockets'
    }
  });
  function familyFor(launch){
    // Trust the provider's rocket field, never infer hardware from a payload or
    // an unrelated headline. A generic or missing rocket remains unknown.
    const raw=String(launch&&launch.rocket||'').toLowerCase();
    if(!raw || /^(unknown|tbd|n\/a|unconfirmed|rocket not named)/i.test(raw))return null;
    if(/\bfalcon[\s-]*heavy\b/.test(raw))return 'falcon-heavy';
    if(/\bfalcon[\s-]*9\b/.test(raw))return 'falcon-9';
    if(/\bstarship\b|\bsuper[\s-]*heavy\b/.test(raw))return 'starship';
    if(/\bvulcan\b/.test(raw))return 'vulcan';
    if(/\bnew[\s-]*glenn\b/.test(raw))return 'new-glenn';
    if(/\bfirefly\s*alpha\b|\balpha\s*(?:block\s*[ivx0-9]+)?\b/.test(raw))return 'alpha';
    if(/\bblack[\s-]*brant\b|\bterrier[\s-]|\bmalemute\b|\bsounding[\s-]*rocket\b|\bimproved[\s-]*orion\b/.test(raw))return 'sounding';
    return null;
  }
  function materialize(data){
    const region=String(data&&data.ok&&data.selectedRegion||'');
    const place=Object.prototype.hasOwnProperty.call(PLACES,region)?PLACES[region]:null;
    const launch=data&&data.ok&&data.selectedLaunch;
    const match=Boolean(launch&&launch.id===data.selectedLaunchId&&launch.region===region);
    const family=match?familyFor(launch):null;
    return {region:place?region:null,place,vehicle:family?VEHICLES[family]:null,family};
  }
  function mount(doc){
    const title=doc.getElementById('rl-place-note-title');
    const vehicleTitle=doc.getElementById('rl-vehicle-note-title');
    if(!title||!vehicleTitle)return false;
    const put=(id,val)=>{const x=doc.getElementById(id);if(x)x.textContent=val;};
    const link=(id,href,label)=>{
      const x=doc.getElementById(id);if(!x)return;
      if(!href){x.hidden=true;x.removeAttribute('href');x.textContent='';return;}
      x.href=href;x.textContent=label;x.hidden=false;
    };
    const render=data=>{
      const {region,place,vehicle,family}=materialize(data);
      if(place){
        put('rl-place-note-title',place.title);
        put('rl-place-note-copy',place.lead);
        put('rl-place-note-watch',place.watch);
        put('rl-place-note-check',place.visit);
        link('rl-place-note-source',place.source,place.sourceLabel);
        link('rl-place-note-guide',place.guide,place.guideLabel);
        title.closest('[data-region-story]')?.setAttribute('data-region-story',region);
      }else{
        put('rl-place-note-title','Every launch coast has its own story');
        put('rl-place-note-copy','The Atlantic shoreline, the Pacific hills, the Texas coast and Virginia marshes can make the same countdown feel entirely different. Choose a coast above to explore what makes it special.');
        put('rl-place-note-watch','Select a launch region to see what the landscape can reveal—and what the horizon may hide.');
        put('rl-place-note-check','A beautiful viewpoint is not automatically a permitted place to watch. Follow the region’s official access guidance.');
        link('rl-place-note-source',null,null);link('rl-place-note-guide',null,null);
        title.closest('[data-region-story]')?.setAttribute('data-region-story','none');
      }
      const vehicleSection=doc.getElementById('rl-vehicle-field-notes');
      if(vehicleSection)vehicleSection.dataset.vehicleFamily=family||'unknown';
      if(vehicle){
        put('rl-vehicle-note-title',vehicle.title);
        put('rl-vehicle-note-intro',vehicle.lead);
        for(let i=0;i<3;i++){
          put('rl-vehicle-beat-'+(i+1)+'-title',vehicle.beats[i][0]);
          put('rl-vehicle-beat-'+(i+1)+'-copy',vehicle.beats[i][1]);
        }
        link('rl-vehicle-note-source',vehicle.source,vehicle.sourceLabel);
      }else{
        put('rl-vehicle-note-title','What should you watch for after liftoff?');
        put('rl-vehicle-note-intro','Choose a flight with a named rocket to explore its engines, stages and possible recovery. We won’t guess the vehicle from a mission title.');
        [['The bright first moments','Watch the rocket clear the horizon. Engine sound can arrive later than the light.'],
         ['The long climb','Stages and flight paths vary by rocket and mission.'],
         ['The next chapter','For a specific landing, separation or test objective, look for the operator’s mission plan.']].forEach((b,i)=>{
           put('rl-vehicle-beat-'+(i+1)+'-title',b[0]);
           put('rl-vehicle-beat-'+(i+1)+'-copy',b[1]);
         });
        link('rl-vehicle-note-source',null,null);
      }
    };
    render(null);
    doc.addEventListener('rocket-viewing:data',e=>render(e.detail||null));
    doc.addEventListener('rocket-viewing:failure',()=>render(null));
    return true;
  }
  return {PLACES,VEHICLES,familyFor,materialize,mount};
});
