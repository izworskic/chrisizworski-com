"use strict";

const GATEWAYS = Object.freeze({
  asheville: { id:"asheville", label:"Asheville", milepost:384.1, lat:35.564, lon:-82.544, state:"NC" },
  boone: { id:"boone", label:"Boone / Blowing Rock", milepost:290.8, lat:36.135, lon:-81.677, state:"NC" },
  roanoke: { id:"roanoke", label:"Roanoke", milepost:121.4, lat:37.228, lon:-79.946, state:"VA" },
  floyd: { id:"floyd", label:"Floyd / Meadows of Dan", milepost:167.2, lat:36.797, lon:-80.399, state:"VA" },
  afton: { id:"afton", label:"Afton / Waynesboro", milepost:0, lat:38.032, lon:-78.858, state:"VA" },
  cherokee: { id:"cherokee", label:"Cherokee", milepost:469.1, lat:35.513, lon:-83.303, state:"NC" }
});

const STOPS = Object.freeze({
  "brp-visitor-center": {
    id:"brp-visitor-center", name:"Blue Ridge Parkway Visitor Center", milepost:384, lat:35.5652, lon:-82.4865,
    elevationFt:2130, dwellMinutes:20, tags:["orientation","short-walk","history"],
    practical:"A useful first stop if you are new to the Parkway. Get oriented here, then spend your time on the road rather than collecting more brochures farther up the mountain."
  },
  "folk-art-center": {
    id:"folk-art-center", name:"Folk Art Center", milepost:382, lat:35.5928, lon:-82.4817,
    elevationFt:2200, dwellMinutes:35, tags:["history","rain-plan","easy-stop"],
    practical:"A low-effort stop near Asheville with real indoor value. It is a good swap when cloud or rain makes a high-elevation overlook less rewarding."
  },
  "craggy-gardens": {
    id:"craggy-gardens", name:"Craggy Gardens", milepost:364, lat:35.7042, lon:-82.3737,
    elevationFt:5500, dwellMinutes:45, tags:["scenery","short-walk","photography","fall-color","wildflowers"],
    practical:"This is where an Asheville drive starts to feel alpine. The short Craggy Pinnacle walk gives a much bigger view than the time commitment suggests, but cloud can erase the payoff quickly."
  },
  "mount-mitchell": {
    id:"mount-mitchell", name:"Mount Mitchell access", milepost:355.3, lat:35.7644, lon:-82.2651,
    elevationFt:5700, dwellMinutes:55, tags:["scenery","photography","high-elevation","fall-color"],
    practical:"Treat this as the turn-around point, not another quick overlook. NC 128 leaves the Parkway here for Mount Mitchell State Park, so allow extra time if you actually drive to the summit area."
  },
  "mount-pisgah": {
    id:"mount-pisgah", name:"Mount Pisgah area", milepost:408.8, lat:35.4254, lon:-82.7565,
    elevationFt:5000, dwellMinutes:30, tags:["scenery","picnic","history","fall-color"],
    practical:"A natural southern turn-around for a shorter Asheville drive. You get high-country scenery without committing to the longer Graveyard Fields run."
  },
  "looking-glass": {
    id:"looking-glass", name:"Looking Glass Rock Overlook", milepost:417, lat:35.3092, lon:-82.7935,
    elevationFt:4400, dwellMinutes:15, tags:["scenery","photography","easy-stop","fall-color"],
    practical:"One of the better quick-payoff overlooks south of Asheville. Stop if the rock face is visible; if the valley is socked in, keep moving toward the next elevation band."
  },
  "graveyard-fields": {
    id:"graveyard-fields", name:"Graveyard Fields", milepost:418.8, lat:35.3215, lon:-82.8474,
    elevationFt:5100, dwellMinutes:60, tags:["waterfall","short-walk","fall-color","photography"],
    practical:"This is a real walk, not a windshield stop. It earns the time when waterfalls or fall color are the point of the day, but it can consume the margin in a four-hour itinerary."
  },
  "devils-courthouse": {
    id:"devils-courthouse", name:"Devil's Courthouse", milepost:422.4, lat:35.3053, lon:-82.8990,
    elevationFt:5720, dwellMinutes:35, tags:["scenery","short-walk","photography","high-elevation"],
    practical:"A short, steep climb with a large view. It is a better final stop than an add-on when your schedule is tight; leave enough time to walk it rather than only photograph the parking area."
  },
  "richland-balsam": {
    id:"richland-balsam", name:"Richland Balsam", milepost:431.4, lat:35.3657, lon:-82.9863,
    elevationFt:6053, dwellMinutes:20, tags:["high-elevation","scenery","fall-color","photography"],
    practical:"The Parkway's highest point is useful as an elevation check as much as a destination. Conditions here can be markedly colder, windier and cloudier than Cherokee or Asheville."
  },
  "balsam-gap": {
    id:"balsam-gap", name:"Balsam Gap", milepost:443, lat:35.4265, lon:-83.0850,
    elevationFt:3300, dwellMinutes:10, tags:["access","easy-stop"],
    practical:"More useful as a route decision point than a sightseeing stop. This is where you can leave the Parkway for US 23/74 instead of forcing a longer mountain return."
  },
  "waterrock-knob": {
    id:"waterrock-knob", name:"Waterrock Knob", milepost:451.2, lat:35.4598, lon:-83.1404,
    elevationFt:5820, dwellMinutes:50, tags:["scenery","short-walk","photography","sunset","fall-color","high-elevation"],
    practical:"The strongest short drive from Cherokee when long-range views are the priority. The parking area already has a broad view; the summit trail asks more of your legs and your clock."
  },
  "moses-cone": {
    id:"moses-cone", name:"Moses H. Cone Memorial Park", milepost:294, lat:36.1556, lon:-81.7036,
    elevationFt:3600, dwellMinutes:45, tags:["history","short-walk","fall-color","easy-stop"],
    practical:"A good first substantial stop from Blowing Rock because it works even when ridge-top visibility is mediocre. The estate, carriage roads and grounds justify more than a five-minute pull-off."
  },
  "price-park": {
    id:"price-park", name:"Julian Price Memorial Park", milepost:296.7, lat:36.1363, lon:-81.7332,
    elevationFt:3400, dwellMinutes:25, tags:["picnic","easy-stop","fall-color","family"],
    practical:"Use this as the breathing-room stop in a High Country drive: picnic, lake edge and easy access, without turning the whole outing into a hike."
  },
  "rough-ridge": {
    id:"rough-ridge", name:"Rough Ridge", milepost:302.8, lat:36.1058, lon:-81.7806,
    elevationFt:4300, dwellMinutes:50, tags:["short-walk","scenery","photography","fall-color"],
    practical:"A disproportionately good view for a relatively short trail, but the walk is the attraction. If you only have two hours, choose this or Moses Cone rather than pretending you can do both well."
  },
  "linn-cove": {
    id:"linn-cove", name:"Linn Cove Viaduct", milepost:304.4, lat:36.0923, lon:-81.8290,
    elevationFt:4100, dwellMinutes:20, tags:["scenery","photography","engineering","fall-color"],
    practical:"The drive itself is part of the stop. Give yourself enough room to use an overlook or trail access rather than trying to appreciate the viaduct from behind the wheel."
  },
  "linville-falls": {
    id:"linville-falls", name:"Linville Falls", milepost:316.5, lat:35.9491, lon:-81.9262,
    elevationFt:3200, dwellMinutes:75, tags:["waterfall","hike","photography","fall-color"],
    practical:"This changes the shape of the day. The waterfall is worth a dedicated trail stop, so a Boone-to-Linville plan should cut lesser overlooks instead of stacking them on top."
  },
  "doughton-park": {
    id:"doughton-park", name:"Doughton Park", milepost:241.1, lat:36.4355, lon:-81.1500,
    elevationFt:3500, dwellMinutes:40, tags:["scenery","picnic","history","fall-color"],
    practical:"A broad, quieter landscape that feels different from the Boone overlooks. It makes sense as a destination only when the northern approach is actually open end-to-end."
  },
  "peaks-of-otter": {
    id:"peaks-of-otter", name:"Peaks of Otter", milepost:85.6, lat:37.4452, lon:-79.6040,
    elevationFt:2500, dwellMinutes:50, tags:["scenery","history","picnic","short-walk","fall-color"],
    practical:"A strong Roanoke-area destination because the lake, historic landscape and mountain views give you options without requiring a long hike."
  },
  "rocky-knob": {
    id:"rocky-knob", name:"Rocky Knob", milepost:169, lat:36.8110, lon:-80.3480,
    elevationFt:3500, dwellMinutes:25, tags:["scenery","picnic","fall-color","easy-stop"],
    practical:"A useful pause rather than a day-consuming attraction. Pair it with Mabry Mill when you want scenery and history in the same drive."
  },
  "mabry-mill": {
    id:"mabry-mill", name:"Mabry Mill", milepost:176.2, lat:36.7503, lon:-80.4055,
    elevationFt:2800, dwellMinutes:50, tags:["history","photography","easy-stop","fall-color"],
    practical:"Do not treat Mabry Mill as just the famous photograph. The mill, sawmill and blacksmith story are why the stop holds up after the picture is taken."
  },
  "humpback-rocks": {
    id:"humpback-rocks", name:"Humpback Rocks", milepost:5.8, lat:37.9624, lon:-78.8962,
    elevationFt:3100, dwellMinutes:55, tags:["history","hike","scenery","fall-color"],
    practical:"Close enough to the north entrance to be the anchor of a short Afton drive. The farm area is easy; the rock hike is a different commitment, so decide which version you mean before you leave the car."
  },
  "ravens-roost": {
    id:"ravens-roost", name:"Ravens Roost Overlook", milepost:10.7, lat:37.9208, lon:-78.9470,
    elevationFt:3200, dwellMinutes:15, tags:["scenery","photography","easy-stop","fall-color"],
    practical:"A fast, high-value overlook near the northern end. It works especially well when Humpback Rocks is your main walk and you want one clean view without another long stop."
  }
});

const ROUTES = Object.freeze([
  { id:"asheville-craggy", gateway:"asheville", name:"Craggy Gardens high country", startMile:384.1, turnMile:364, stopIds:["folk-art-center","craggy-gardens"], elevationClass:"high", minHours:2.4, tags:["scenery","short-walk","photography","fall-color"], character:"The best compact northbound Asheville drive when high-elevation views matter." },
  { id:"asheville-mitchell", gateway:"asheville", name:"Craggy to Mount Mitchell access", startMile:384.1, turnMile:355.3, stopIds:["craggy-gardens","mount-mitchell"], elevationClass:"high", minHours:3.8, tags:["scenery","high-elevation","photography","fall-color"], character:"A longer ridge run with a clear turn-around point at NC 128." },
  { id:"asheville-pisgah", gateway:"asheville", name:"Mount Pisgah out-and-back", startMile:384.1, turnMile:408.8, stopIds:["brp-visitor-center","mount-pisgah"], elevationClass:"high", minHours:3.1, tags:["scenery","picnic","history","fall-color"], character:"A southbound drive that keeps the day simple and leaves time to actually stop." },
  { id:"asheville-graveyard", gateway:"asheville", name:"Pisgah and Graveyard Fields", startMile:384.1, turnMile:422.4, stopIds:["mount-pisgah","looking-glass","graveyard-fields","devils-courthouse"], elevationClass:"high", minHours:5.2, tags:["scenery","waterfall","short-walk","photography","fall-color"], character:"The full southern high-country sampler; worthwhile only when you have enough daylight and stop time." },

  { id:"boone-high-country", gateway:"boone", name:"Blowing Rock high-country loop", startMile:290.8, turnMile:305.2, stopIds:["moses-cone","price-park","rough-ridge","linn-cove"], elevationClass:"mid", minHours:3.2, tags:["scenery","short-walk","history","fall-color","photography"], character:"The strongest compact High Country route: estate, lake, ridge and viaduct without chasing mileage." },
  { id:"boone-linville", gateway:"boone", name:"High Country to Linville Falls", startMile:290.8, turnMile:316.5, stopIds:["moses-cone","linn-cove","linville-falls"], elevationClass:"mid", minHours:4.6, tags:["waterfall","hike","scenery","fall-color","photography"], character:"A destination drive built around Linville Falls, with only the stops that earn their time on the way." },
  { id:"boone-doughton", gateway:"boone", name:"North to Doughton Park", startMile:290.8, turnMile:241.1, stopIds:["doughton-park"], elevationClass:"mid", minHours:4.8, tags:["scenery","picnic","history","fall-color"], character:"A quieter northern run that is excellent when the Parkway is continuous through Deep Gap—and a bad choice when it is not." },

  { id:"roanoke-peaks", gateway:"roanoke", name:"Peaks of Otter", startMile:121.4, turnMile:85.6, stopIds:["peaks-of-otter"], elevationClass:"mid", minHours:3.3, tags:["scenery","history","picnic","short-walk","fall-color"], character:"A focused northbound Roanoke drive with one destination that gives you several ways to spend the stop." },
  { id:"roanoke-mabry", gateway:"roanoke", name:"Rocky Knob and Mabry Mill", startMile:121.4, turnMile:176.2, stopIds:["rocky-knob","mabry-mill"], elevationClass:"mid", minHours:5.0, tags:["history","scenery","photography","fall-color"], character:"A longer southbound drive where the historic stops matter as much as the overlooks." },

  { id:"floyd-mabry", gateway:"floyd", name:"Rocky Knob and Mabry Mill", startMile:167.2, turnMile:198.4, stopIds:["rocky-knob","mabry-mill"], elevationClass:"mid", minHours:2.8, tags:["history","scenery","photography","fall-color"], character:"The obvious Meadows of Dan-area half day, with enough room to linger at the mill." },
  { id:"floyd-north", gateway:"floyd", name:"North from Rocky Knob", startMile:167.2, turnMile:135.9, stopIds:["rocky-knob"], elevationClass:"mid", minHours:2.5, tags:["scenery","picnic","fall-color"], character:"A road-first option when you want ridge scenery more than attractions." },

  { id:"afton-humpback", gateway:"afton", name:"Humpback Rocks and Ravens Roost", startMile:0, turnMile:16.1, stopIds:["humpback-rocks","ravens-roost"], elevationClass:"mid", minHours:2.5, tags:["hike","history","scenery","photography","fall-color"], character:"The right first taste of the Parkway from the north entrance without turning a short outing into a mileage contest." },
  { id:"afton-scenic", gateway:"afton", name:"Northern ridge drive", startMile:0, turnMile:45.5, stopIds:["humpback-rocks","ravens-roost"], elevationClass:"mid", minHours:4.1, tags:["scenery","photography","fall-color"], character:"A longer road-focused drive for people who came to move through the landscape, not collect stops." },

  { id:"cherokee-waterrock", gateway:"cherokee", name:"Waterrock Knob", startMile:469.1, turnMile:451.2, stopIds:["waterrock-knob"], elevationClass:"high", minHours:2.4, tags:["scenery","short-walk","photography","sunset","fall-color"], character:"The cleanest short Parkway drive from Cherokee, with one high-value destination and no need to over-plan it." },
  { id:"cherokee-balsam", gateway:"cherokee", name:"Waterrock and Balsam high country", startMile:469.1, turnMile:443, stopIds:["waterrock-knob","balsam-gap"], elevationClass:"high", minHours:3.4, tags:["scenery","photography","fall-color","high-elevation"], character:"A high-elevation drive with an easy exit at Balsam Gap if the weather or clock turns against you." },
  { id:"cherokee-richland", gateway:"cherokee", name:"Richland Balsam high point", startMile:469.1, turnMile:431.4, stopIds:["waterrock-knob","balsam-gap","richland-balsam"], elevationClass:"high", minHours:4.7, tags:["scenery","photography","fall-color","high-elevation"], character:"A longer climb through changing elevation bands to the highest point on the Parkway." }
]);

function routesForGateway(gateway){ return ROUTES.filter(route=>route.gateway===gateway); }
function stopsForRoute(route){ return (route.stopIds||[]).map(id=>STOPS[id]).filter(Boolean); }

module.exports={GATEWAYS,STOPS,ROUTES,routesForGateway,stopsForRoute};
