import fs from 'node:fs';

const htmlFile = 'public/tools/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const updates = {
  'ausable-mayfly-hatches': 'Match the hatch on the Holy Waters. Ten Au Sable mayflies identified with high-resolution wing and body profiles, real-time USGS river temperatures, and seasonal emergence windows from early Hendricksons to late-night Hex.',
  'michigan-mayfly-hatches': 'Track emergence across Michigan\'s premier trout waters. Real-time USGS temperatures, barometric swings, and seasonal emergence curves for the Au Sable, Manistee, Pere Marquette, Muskegon, and Boardman.',
  'michigan-ice-caves': 'Winter trail conditions and ice curtain formation for the Eben Ice Caves, Grand Island, and Munising sandstone amphitheaters. Dated formation logs, freeze-thaw cycles, and snowshoe access before you make the snowbelt drive.',
  'mackinac-ice-bridge': 'The winter crossing tradition across the Straits of Mackinac. Track NOAA daily satellite ice concentration, Straits freezing-degree days, and shore-ice anchoring from St. Ignace to Mackinac Island.',
  'great-lakes-mayflies': 'The summer emergence atlas across all five Great Lakes. Offshore buoy water temperatures, sediment habitat maps, and historic hatch dates tracking the legendary Hexagenia limbata from Saginaw Bay to Green Bay.',
  'lake-smoke': 'When sub-zero Arctic air meets the heat of the open Great Lakes. Live water-to-air thermal gradient tables, wind vectors, and dawn viewing outlooks across 15 coastal harbors from Duluth to Marquette.',
  'niagara-border': 'Live border crossing wait times for the Peace Bridge, Rainbow Bridge, Lewiston–Queenston, and Whirlpool Rapids. Real-time commercial and passenger delays, NEXUS lane status, and bridge cameras across the Niagara River.',
  'border-waits': 'Real-time border delay monitors for all five Michigan–Ontario international gateways: the Gordie Howe Bridge, Ambassador Bridge, Detroit–Windsor Tunnel, Blue Water Bridge, and Sault Ste. Marie. Live lane status, NEXUS lanes, and bridge approach cameras.',
  'nyc-crossing': 'Real-time traffic delays, toll rates, and Manhattan congestion pricing for Hudson and East River bridges and tunnels. Instant vehicle classification and approach times for the George Washington, Lincoln, Holland, and Verrazzano.',
  'isle-royale-ferry': 'Complete passage schedules, vessel rates, and crossing times for the Sea Hunter III and Voyageur II out of Grand Portage. Connect into Windigo or Rock Harbor across Lake Superior\'s open water with ranger station arrival advice.',
  'shorefeel': 'How Lake Superior, Michigan, Huron, Erie, and Ontario feel right now. Daily NOAA surface water temperatures paired with shoreline wind, wave turbulence, and coastal chill indices from Grand Haven to Presque Isle.',
  'beach-report': 'Live Great Lakes beach conditions across 50 shoreline parks. Active EGLE BeachGuard water quality notices, NOAA nearshore wave heights, rip-current alerts, and morning swim ratings from Lake Michigan dunes to Lake Huron coves.',
  'upper-peninsula-waterfalls': 'Explore 200+ wild cascades across the sandstone country of the Upper Peninsula. Interactive topographic routing, trail difficulty, staircase counts, and seasonal spring-runoff conditions from Munising to the Black River.',
  'mackinac-island': 'Straits of Mackinac ferry schedules, dockside parking logistics, and ticket pricing between Mackinaw City, St. Ignace, and Mackinac Island. Compare Shepler’s and Star Line departures with mainland weather guidance.',
  'great-lakes-ferries': 'The comprehensive navigator for Great Lakes island ferries and open-water crossings. Schedules, vehicle space, and passenger logistics for Mackinac Island, Beaver Island, Isle Royale, Put-in-Bay, and the S.S. Badger.',
  'ferry-put-in-bay': 'Lake Erie island crossings from Catawba and Port Clinton to South Bass Island. Compare Miller Ferry and Jet Express seasonal schedules, vehicle transport rules, dock parking, and passage times.',
  'ferry-isle-royale': 'Passage planner for the wilderness archipelago of Lake Superior. Schedules, crossing durations, and reservations for the Ranger III from Houghton, Isle Royale Queen IV from Copper Harbor, and Grand Portage vessels.',
  'ferry-beaver': 'Open Lake Michigan passage from Charlevoix to St. James Harbor. Beaver Island Boat Company schedules, vehicle reservation requirements, baggage limits, and open-water crossing conditions.',
  'ferry-toronto': 'Harbor crossing schedules and passenger access between downtown Toronto and the Toronto Islands. Centre Island, Hanlan’s Point, and Ward’s Island vessel departures with real-time seasonal sailing alerts.',
  'michigan-ski-hills': 'Ski hill snow reports across 18 northern Michigan and U.P. peaks. Live NWS lake-effect snow accumulation, fresh powder depths, terrain status, and highway drive times from Boyne Mountain to Mount Bohemia.',
  'shed-antler-search': 'Late-winter field conditions for scouting dropped whitetail antlers. NOAA snow-cover depth models, southern-slope melt rates, and low-disturbance habitat guidance across northern Michigan deer yards.',
  'waterfowl-freeze-line': 'Follow the autumn migration freeze-line down the Great Lakes and Mississippi Flyways. Daily 1-km satellite snow cover, shallow marsh ice-up data, and barometric wind shifts pushing mallards, divers, and Canada geese south.',
  'winter-eagle-watching': 'Locate wintering bald eagles gathered along open Great Lakes tailwaters and coastal ice leads. Waterflow telemetry, freeze maps, and river access sites below hydro dams from the Au Sable to the St. Joseph.',
  'firefly-tracker': 'Summer twilight emergence tracking for Photinus pyralis across Michigan meadows. Growing degree-day soil heat models, evening humidity indices, and optimal viewing windows from hardwood edges to river valleys.',
  'hummingbird-tracker': 'Spring ruby-throated hummingbird arrival waves across Michigan. Track northward migration fronts, nectar source phenology, feeder placement timing, and early-season frost precautions from the Ohio border to Lake Superior.',
  'frog-chorus': 'The acoustic calendar of spring wetlands. Track evening calling windows for wood frogs, spring peepers, and chorus frogs with soil-thaw temperatures, barometric rain triggers, and species audio soundscapes.',
  'bloom-tracker': 'The unfolding flowering calendar across 19 premier Michigan botanical preserves, orchards, and wildflower trails. Blossom progression from Old Mission cherry groves and Holland tulips to U.P. woodland trilliums and autumn asters.',
  'wisconsin-bloom-tracker': 'Wisconsin’s seasonal flower trails from Door County apple and cherry orchards to the UW–Madison lilac collections and Washington Island lavender fields. Peak bloom dates, trail logistics, and orchard field reports.'
};

let count = 0;
for (const [id, newDesc] of Object.entries(updates)) {
  const cardRe = new RegExp(`(<div class="tool-card"[^>]*data-tool-id="${id}"[\\s\\S]*?<div class="tool-desc">)([\\s\\S]*?)(<\\/div>)`);
  if (cardRe.test(html)) {
    html = html.replace(cardRe, `$1${newDesc}$3`);
    count++;
  } else {
    console.error(`Missing tool card for: ${id}`);
  }
}

fs.writeFileSync(htmlFile, html, 'utf8');
console.log(`Successfully updated ${count} tool card descriptions in ${htmlFile}`);
