import fs from 'node:fs';

let up = fs.readFileSync('public/upper-peninsula-waterfalls/index.html', 'utf8');
const oldUp = 'Find the right waterfall for your day: an easy boardwalk, a sandstone canyon, a long backcountry hike or a cascade worth planning around. Filter the map, compare access and collect your stops.';
const newUp = 'Step onto the trails of the North Country. Whether you’re seeking an accessible timber boardwalk over roaring amber currents, a hidden gorge carved through Precambrian sandstone, or a quiet backcountry trek deep in the cedar bottoms, plan your stops with field-tested access notes, staircase counts, and seasonal spring-melt conditions.';
if (up.includes(oldUp)) {
  up = up.replace(oldUp, newUp);
  fs.writeFileSync('public/upper-peninsula-waterfalls/index.html', up, 'utf8');
  console.log('Updated UP Waterfalls lede');
} else {
  console.log('UP Waterfalls target not found');
}

let soo = fs.readFileSync('public/soo-locks/index.html', 'utf8');
const oldSoo = 'Named-vessel passage sources, the official boat hotline, live AIS activity, and Sault Ste. Marie visitor information';
const newSoo = 'Harbor pilot tracking and lockmaster reports from the St. Marys River. Named 1,000-foot ore carriers, ocean-going salties, official USACE boat hotlines, and waterfront observation decks in Sault Ste. Marie.';
if (soo.includes(oldSoo)) {
  soo = soo.replace(oldSoo, newSoo);
  fs.writeFileSync('public/soo-locks/index.html', soo, 'utf8');
  console.log('Updated Soo Locks lede');
} else {
  console.log('Soo Locks target not found');
}

let bridge = fs.readFileSync('public/mackinac-bridge-live/index.html', 'utf8');
const oldBridge = 'Check the official live status first, then both camera directions, NWS weather, RV and trailer guidance, nearby approach-road events, tolls, and driver assistance.';
const newBridge = 'Live conditions over the Straits of Mackinac. Official Straits crosswind alerts, north and south tower camera sweeps, high-profile trailer escort protocols, and direct bridge dispatch updates before you reach the causeway.';
if (bridge.includes(oldBridge)) {
  bridge = bridge.replace(oldBridge, newBridge);
  fs.writeFileSync('public/mackinac-bridge-live/index.html', bridge, 'utf8');
  console.log('Updated Mackinac Bridge lede');
} else {
  console.log('Mackinac Bridge target not found');
}
