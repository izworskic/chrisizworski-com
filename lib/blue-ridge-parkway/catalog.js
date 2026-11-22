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
  "crabtree-falls": {
    id:"crabtree-falls", name:"Crabtree Falls", milepost:339.5, lat:35.819671, lon:-82.149581,
    elevationFt:3500, dwellMinutes:100, tags:["waterfall","photography","fall-color"],
    practical:"Give the water time here. The NPS describes a 2.5-mile loop descending through mountain forest to the falls. Listen for the stream as you approach, and save energy for the climb back. This is a hike, not a pull-off.",
    source:"https://www.nps.gov/blri/planyourvisit/crabtree-falls.htm"
  },
  "nc-minerals-museum": {
    id:"nc-minerals-museum", name:"Museum of North Carolina Minerals", milepost:331, lat:35.854132, lon:-82.051443,
    elevationFt:2820, dwellMinutes:30, tags:["history","easy-stop","rain-plan"],
    scheduleSensitive:true,
    practical:"Step indoors to see the rock beneath the scenery. The museum connects mountain geology with North Carolina mining history, a useful perspective when cloud hides the distant ridges.",
    source:"https://www.nps.gov/blri/planyourvisit/museum-of-north-carolina-minerals-mp-331.htm"
  },
  "jeffress-cascades": {
    id:"jeffress-cascades", name:"Cascades at E.B. Jeffress Park", milepost:271.9, lat:36.245566, lon:-81.458525,
    elevationFt:3200, dwellMinutes:45, tags:["waterfall","short-walk","photography","fall-color"],
    practical:"Follow the Cascades Trail into the woods and listen for the water ahead. The NPS describes a short, moderate loop, so give this waterfall its walking time rather than counting it as a roadside stop.",
    source:"https://www.nps.gov/blri/planyourvisit/nc-trails.htm"
  },
  "the-lump": {
    id:"the-lump", name:"The Lump", milepost:264.4, lat:36.27612, lon:-81.37878,
    elevationFt:3468, dwellMinutes:20, tags:["scenery","short-walk","photography","fall-color","easy-stop"],
    practical:"A short climb takes you above the surrounding trees. Look for the folds of High Country ridges beyond the hilltop, then continue without committing the day to a long hike.",
    source:"https://www.nps.gov/blri/planyourvisit/nc-trails.htm"
  },
  "cumberland-knob": {
    id:"cumberland-knob", name:"Cumberland Knob", milepost:217.5, lat:36.436501, lon:-81.070557,
    elevationFt:2885, dwellMinutes:30, tags:["short-walk","history","scenery","easy-stop"],
    practical:"This quiet place marks the Parkway's beginnings: construction started near Cumberland Knob in 1935. Take the easy half-mile walk to stretch your legs; the longer Gully Creek Trail calls for a different time budget.",
    source:"https://www.nps.gov/blri/planyourvisit/cumberland-knob-trail.htm"
  },
  "blue-ridge-music-center": {
    id:"blue-ridge-music-center", name:"Blue Ridge Music Center", milepost:213, lat:36.573197, lon:-80.850001,
    elevationFt:2700, dwellMinutes:45, tags:["history","short-walk","easy-stop","rain-plan"],
    scheduleSensitive:true,
    practical:"The Blue Ridge has a musical history as deep as its valleys. Explore the instruments and traditions of the mountains, and check the official schedule before expecting seasonal exhibits or performances.",
    source:"https://www.nps.gov/blri/planyourvisit/blue-ridge-music-center-mp-213.htm"
  },
  "brp-visitor-center": {
    id:"brp-visitor-center", name:"Blue Ridge Parkway Visitor Center", milepost:384, lat:35.5652, lon:-82.4865,
    elevationFt:2130, dwellMinutes:20, tags:["orientation","short-walk","history"],
    practical:"Get your bearings near Asheville. The visitor center helps you understand the Parkway's mileposts and changing landscape before the road rises into higher country. Check the posted hours before planning an indoor stop."
  },
  "folk-art-center": {
    id:"folk-art-center", name:"Folk Art Center", milepost:382, lat:35.5928, lon:-82.4817,
    elevationFt:2200, dwellMinutes:35, tags:["history","rain-plan","easy-stop"],
    practical:"Step inside to discover the craft traditions of the Southern Appalachians. Woodwork, weaving and other handmade objects tell a human story behind the mountain scenery, even when the ridge is hidden in cloud."
  },
  "craggy-gardens": {
    id:"craggy-gardens", name:"Craggy Gardens", milepost:364, lat:35.7042, lon:-82.3737,
    elevationFt:5500, dwellMinutes:45, tags:["scenery","short-walk","photography","fall-color","wildflowers"],
    practical:"Notice the change in trees as you climb. Craggy's high ground is known for heath, rhododendrons and wind-shaped forest; Catawba rhododendrons bloom in early summer. Walk only as far as trail and weather conditions allow."
  },
  "mount-mitchell": {
    id:"mount-mitchell", name:"Mount Mitchell access", milepost:355.3, lat:35.7644, lon:-82.2651,
    elevationFt:5700, dwellMinutes:55, tags:["scenery","photography","high-elevation","fall-color"],
    practical:"NC 128 leaves the Parkway for Mount Mitchell State Park. The surrounding Black Mountains rise into a cooler world, but the drive and any summit-area walking need time of their own. Check state-park access before leaving the Parkway."
  },
  "mount-pisgah": {
    id:"mount-pisgah", name:"Mount Pisgah area", milepost:408.8, lat:35.4254, lon:-82.7565,
    elevationFt:5000, dwellMinutes:30, tags:["scenery","picnic","history","fall-color"],
    practical:"Pause in the high forest around Pisgah and notice the cooler air and changing canopy. It makes a natural southern turning point if you want time to look around rather than hurry toward Graveyard Fields."
  },
  "looking-glass": {
    id:"looking-glass", name:"Looking Glass Rock Overlook", milepost:417, lat:35.3092, lon:-82.7935,
    elevationFt:4400, dwellMinutes:15, tags:["scenery","photography","easy-stop","fall-color"],
    practical:"Look across the valley for the broad pale face of Looking Glass Rock. It stands apart from the wooded ridges around it. If mist covers the rock, save your stop time for a nearer forest or stream."
  },
  "graveyard-fields": {
    id:"graveyard-fields", name:"Graveyard Fields", milepost:418.8, lat:35.3215, lon:-82.8474,
    elevationFt:5100, dwellMinutes:60, tags:["waterfall","short-walk","fall-color","photography"],
    practical:"Leave the windshield behind for a landscape of open ground, forest, streams and waterfalls. Choose a walk you can complete comfortably, and check current trail and road conditions before setting out."
  },
  "devils-courthouse": {
    id:"devils-courthouse", name:"Devil's Courthouse", milepost:422.4, lat:35.3053, lon:-82.8990,
    elevationFt:5720, dwellMinutes:35, tags:["scenery","short-walk","photography","high-elevation"],
    practical:"The short trail climbs steeply toward exposed rock. In clear weather the surrounding ridges spread out from the viewpoint. Allow time for the climb and avoid exposed terrain when storms approach."
  },
  "richland-balsam": {
    id:"richland-balsam", name:"Richland Balsam", milepost:431.4, lat:35.3657, lon:-82.9863,
    elevationFt:6053, dwellMinutes:20, tags:["high-elevation","scenery","fall-color","photography"],
    practical:"Here the roadway reaches its highest elevation on the Parkway. Notice the red spruce and Fraser fir, trees of a cool mountain forest that feels far removed from the valley below. The forest tells the story even when clouds hide the view."
  },
  "balsam-gap": {
    id:"balsam-gap", name:"Balsam Gap", milepost:443, lat:35.4265, lon:-83.0850,
    elevationFt:3300, dwellMinutes:10, tags:["access","easy-stop"],
    practical:"Think of Balsam Gap as a choice in the journey rather than an overlook. It connects the Parkway with US 23/74, but confirm current access and your route before using it as an exit."
  },
  "waterrock-knob": {
    id:"waterrock-knob", name:"Waterrock Knob", milepost:451.2, lat:35.4598, lon:-83.1404,
    elevationFt:5820, dwellMinutes:50, tags:["scenery","short-walk","photography","sunset","fall-color","high-elevation"],
    practical:"Step out and look for the mountain ridges fading into the distance. The visitor area offers views without the climb to the summit, which is a separate and more demanding walk. Wind and low cloud can change the scene quickly."
  },
  "moses-cone": {
    id:"moses-cone", name:"Moses H. Cone Memorial Park", milepost:294, lat:36.1556, lon:-81.7036,
    elevationFt:3600, dwellMinutes:45, tags:["history","short-walk","fall-color","easy-stop"],
    practical:"Stand near Flat Top Manor and imagine a carriage moving through these hills. Moses and Bertha Cone laid out gently curving roads across their estate. Follow one on foot and let the landscape unfold at a slower pace."
  },
  "price-park": {
    id:"price-park", name:"Julian Price Memorial Park", milepost:296.7, lat:36.1363, lon:-81.7332,
    elevationFt:3400, dwellMinutes:25, tags:["picnic","easy-stop","fall-color","family"],
    practical:"Make this a quieter pause in the High Country. The lake and trees offer a different rhythm from the exposed ridges: a picnic, a little walking, and time to listen to the forest."
  },
  "rough-ridge": {
    id:"rough-ridge", name:"Rough Ridge", milepost:302.8, lat:36.1058, lon:-81.7806,
    elevationFt:4300, dwellMinutes:50, tags:["short-walk","scenery","photography","fall-color"],
    practical:"Follow the Tanawha Trail toward exposed rock above the forest. Boardwalk sections protect fragile plants, so stay on the marked path. It is the walk, not the parking lot, that reveals this part of Grandfather Mountain."
  },
  "linn-cove": {
    id:"linn-cove", name:"Linn Cove Viaduct", milepost:304.4, lat:36.0923, lon:-81.8290,
    elevationFt:4100, dwellMinutes:20, tags:["scenery","photography","engineering","fall-color"],
    practical:"Notice how the Linn Cove Viaduct curves around Grandfather Mountain rather than cutting into its fragile slopes. Its engineering was shaped by the land. Use a designated viewpoint or trail, not the driver's seat, to admire it."
  },
  "linville-falls": {
    id:"linville-falls", name:"Linville Falls", milepost:316.5, lat:35.9491, lon:-81.9262,
    elevationFt:3200, dwellMinutes:75, tags:["waterfall","hike","photography","fall-color"],
    practical:"The Linville River drops through rugged mountain country here. Choose a waterfall viewpoint you have time to reach on foot. The moving water and gorge are the experience, so check trail access before you go."
  },
  "doughton-park": {
    id:"doughton-park", name:"Doughton Park", milepost:241.1, lat:36.4355, lon:-81.1500,
    elevationFt:3500, dwellMinutes:40, tags:["scenery","picnic","history","fall-color"],
    practical:"The meadows and open slopes of Doughton feel different from the rocky Boone overlooks. Take time to look across the broad landscape, but visit only when the connecting Parkway sections are confirmed accessible."
  },
  "peaks-of-otter": {
    id:"peaks-of-otter", name:"Peaks of Otter", milepost:85.6, lat:37.4452, lon:-79.6040,
    elevationFt:2500, dwellMinutes:50, tags:["scenery","history","picnic","short-walk","fall-color"],
    practical:"Pause beside Abbott Lake and look up at Sharp Top rising above the water. The reflection and mountain landscape are worth experiencing even without the longer summit hike."
  },
  "rocky-knob": {
    id:"rocky-knob", name:"Rocky Knob", milepost:169, lat:36.8110, lon:-80.3480,
    elevationFt:3500, dwellMinutes:25, tags:["scenery","picnic","fall-color","easy-stop"],
    practical:"The Parkway crosses open slopes and broad Virginia mountain country here. Look across the rolling hills, then continue toward Mabry Mill to connect the landscape with the lives of people who worked here."
  },
  "mabry-mill": {
    id:"mabry-mill", name:"Mabry Mill", milepost:176.2, lat:36.7503, lon:-80.4055,
    elevationFt:2800, dwellMinutes:50, tags:["history","photography","easy-stop","fall-color"],
    practical:"Look beyond the waterwheel photograph. Ed and Lizzie Mabry ground corn, sawed lumber and operated a blacksmith shop here. The mill tells a working-life story; check NPS schedules before expecting demonstrations."
  },
  "humpback-rocks": {
    id:"humpback-rocks", name:"Humpback Rocks", milepost:5.8, lat:37.9624, lon:-78.8962,
    elevationFt:3100, dwellMinutes:55, tags:["history","hike","scenery","fall-color"],
    practical:"Near the northern entrance, the historic farm landscape tells a story of mountain life. The separate rock hike requires much more effort. Decide whether you came for the farm, the climb or both."
  },
  "ravens-roost": {
    id:"ravens-roost", name:"Ravens Roost Overlook", milepost:10.7, lat:37.9208, lon:-78.9470,
    elevationFt:3200, dwellMinutes:15, tags:["scenery","photography","easy-stop","fall-color"],
    practical:"Pull into the overlook and watch the Blue Ridge fold away toward the valley. One unhurried view can be enough, especially if Humpback Rocks supplied your day's main walk."
  }
});

const ROUTES = Object.freeze([
  { id:"asheville-craggy", gateway:"asheville", name:"Craggy Gardens high country", startMile:384.1, turnMile:364, stopIds:["folk-art-center","craggy-gardens"], elevationClass:"high", minHours:2.4, tags:["scenery","short-walk","photography","fall-color"], character:"Climb north from Asheville toward rhododendron-covered Craggy Gardens and the cooler forest above the city." },
  { id:"asheville-mitchell", gateway:"asheville", name:"Craggy to Mount Mitchell access", startMile:384.1, turnMile:355.3, stopIds:["craggy-gardens","mount-mitchell"], elevationClass:"high", minHours:3.8, tags:["scenery","high-elevation","photography","fall-color"], character:"Travel past Craggy's heath country toward Mount Mitchell access, noticing how the forest changes as the road rises." },
  { id:"asheville-pisgah", gateway:"asheville", name:"Mount Pisgah out-and-back", startMile:384.1, turnMile:408.8, stopIds:["brp-visitor-center","mount-pisgah"], elevationClass:"high", minHours:3.1, tags:["scenery","picnic","history","fall-color"], character:"Turn south through the forest near Mount Pisgah, leaving room for a genuine pause in the high country." },
  { id:"asheville-graveyard", gateway:"asheville", name:"Pisgah and Graveyard Fields", startMile:384.1, turnMile:422.4, stopIds:["mount-pisgah","looking-glass","graveyard-fields","devils-courthouse"], elevationClass:"high", minHours:5.2, tags:["scenery","waterfall","short-walk","photography","fall-color"], character:"Follow the southern ridges toward rock overlooks and Graveyard Fields, where streamside walks deserve time of their own." },

  { id:"boone-high-country", gateway:"boone", name:"Blowing Rock high-country loop", startMile:290.8, turnMile:305.2, stopIds:["moses-cone","price-park","rough-ridge","linn-cove"], elevationClass:"mid", minHours:3.2, tags:["scenery","short-walk","history","fall-color","photography"], character:"Travel from Moses Cone's old carriage roads to Rough Ridge's rock and the curved Linn Cove Viaduct." },
  { id:"boone-linville", gateway:"boone", name:"High Country to Linville Falls", startMile:290.8, turnMile:316.5, stopIds:["moses-cone","linn-cove","linville-falls"], elevationClass:"mid", minHours:4.6, tags:["waterfall","hike","scenery","fall-color","photography"], character:"Continue through Grandfather Mountain country toward the sound of Linville Falls, with time set aside for the trail." },
  { id:"boone-doughton", gateway:"boone", name:"North to Doughton Park", startMile:290.8, turnMile:241.1, stopIds:["doughton-park"], elevationClass:"mid", minHours:4.8, tags:["scenery","picnic","history","fall-color"], character:"Follow the quieter northern hills toward Doughton's open meadows, provided the connecting road is officially open." },

  { id:"roanoke-peaks", gateway:"roanoke", name:"Peaks of Otter", startMile:121.4, turnMile:85.6, stopIds:["peaks-of-otter"], elevationClass:"mid", minHours:3.3, tags:["scenery","history","picnic","short-walk","fall-color"], character:"From Roanoke, head toward Abbott Lake and the mountain silhouette of Sharp Top at Peaks of Otter." },
  { id:"roanoke-mabry", gateway:"roanoke", name:"Rocky Knob and Mabry Mill", startMile:121.4, turnMile:176.2, stopIds:["rocky-knob","mabry-mill"], elevationClass:"mid", minHours:5.0, tags:["history","scenery","photography","fall-color"], character:"Travel south into Rocky Knob's rolling hills and the working history of Mabry Mill." },

  { id:"floyd-mabry", gateway:"floyd", name:"Rocky Knob and Mabry Mill", startMile:167.2, turnMile:198.4, stopIds:["rocky-knob","mabry-mill"], elevationClass:"mid", minHours:2.8, tags:["history","scenery","photography","fall-color"], character:"Pair the open slopes at Rocky Knob with the story of Ed and Lizzie Mabry's mill." },
  { id:"floyd-north", gateway:"floyd", name:"North from Rocky Knob", startMile:167.2, turnMile:135.9, stopIds:["rocky-knob"], elevationClass:"mid", minHours:2.5, tags:["scenery","picnic","fall-color"], character:"A road-first journey across Virginia's rolling high ridges, with time to stop and notice the countryside." },

  { id:"afton-humpback", gateway:"afton", name:"Humpback Rocks and Ravens Roost", startMile:0, turnMile:16.1, stopIds:["humpback-rocks","ravens-roost"], elevationClass:"mid", minHours:2.5, tags:["hike","history","scenery","photography","fall-color"], character:"Begin at the northern entrance with Humpback Rocks' farm landscape, a possible hike and a quieter overlook." },
  { id:"afton-scenic", gateway:"afton", name:"Northern ridge drive", startMile:0, turnMile:45.5, stopIds:["humpback-rocks","ravens-roost"], elevationClass:"mid", minHours:4.1, tags:["scenery","photography","fall-color"], character:"Let the northern ridges unfold without treating every overlook as an obligation." },

  { id:"cherokee-waterrock", gateway:"cherokee", name:"Waterrock Knob", startMile:469.1, turnMile:451.2, stopIds:["waterrock-knob"], elevationClass:"high", minHours:2.4, tags:["scenery","short-walk","photography","sunset","fall-color"], character:"Climb from Cherokee toward Waterrock Knob's cooler forest and layered mountain horizons." },
  { id:"cherokee-balsam", gateway:"cherokee", name:"Waterrock and Balsam high country", startMile:469.1, turnMile:443, stopIds:["waterrock-knob","balsam-gap"], elevationClass:"high", minHours:3.4, tags:["scenery","photography","fall-color","high-elevation"], character:"Continue through Waterrock Knob toward Balsam Gap, watching the rising forest and protecting your return time." },
  { id:"cherokee-richland", gateway:"cherokee", name:"Richland Balsam high point", startMile:469.1, turnMile:431.4, stopIds:["waterrock-knob","balsam-gap","richland-balsam"], elevationClass:"high", minHours:4.7, tags:["scenery","photography","fall-color","high-elevation"], character:"Travel through changing mountain forest to Richland Balsam, the Parkway's highest road point among spruce and fir." }
]);

function routesForGateway(gateway){ return ROUTES.filter(route=>route.gateway===gateway); }
function stopsForRoute(route){ return (route.stopIds||[]).map(id=>STOPS[id]).filter(Boolean); }

module.exports={GATEWAYS,STOPS,ROUTES,routesForGateway,stopsForRoute};
