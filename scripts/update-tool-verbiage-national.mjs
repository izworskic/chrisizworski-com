import fs from 'node:fs';

const htmlFile = 'public/synced-national-tools/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const updates = {
  'rivers': 'Real-time hydrological status across America\'s waterways. Live USGS discharge rates, gauge heights, flood stages, and ten-year historical percentiles before you launch a drift boat or paddle.',
  'coastal': 'Surf, swell, and shoreline safety across the Pacific, Atlantic, Gulf, and Great Lakes. Active NOAA rip-current advisories, water temperatures, wave period telemetry, and tidal cycles.',
  'smoke': 'Pinpoint cleaner breathing windows amidst wildfire plumes. Real-time EPA AirNow PM2.5 concentrations paired with high-resolution HRRR smoke transport models and wind shifts.',
  'snow': 'High-country winter snowpack and spring runoff dynamics. SNOTEL automated snow-water equivalent telemetry, settling depths, and thaw-refreeze cycles across Western and Northern ranges.',
  'epic-ikon-pass': 'Navigate resort access and pass restrictions with clarity. Real-time calendar of published blackout dates, shared-destination day allotments, and mandatory lift reservation rules across North America.',
  'aurora': 'Dark-sky auroral oval tracking across the Northern Tier. Real-time NOAA Space Weather Kp geomagnetic readings paired with local cloud-cover satellite models and lunar phase brightness.',
  'waterfall-window': 'Time your canyon and mountain waterfall journeys for peak flow. Spring snowmelt hydrographs, USGS drainage basin runoff, and daylight trail windows across premier American cascades.',
  'monarch': 'Track the multigenerational migration across North America. Real-time verified roost reports, nectar corridor phenology, flight wind vectors, and coastal concentration points.',
  'bird-migration': 'Overnight radar mass-migration returns and morning fallout potential. NEXRAD nocturnal bird density scans paired with dawn weather fronts and local eBird hotspot activity.',
  'lake-effect-snow': 'Where the lake-effect squalls are setting up right now. High-resolution NOAA radar scans, boundary-layer wind trajectories, and 72-hour snowfall projections across 15 Great Lakes snowbelts.',
  'niagara-border': 'Direct crossing monitors for the lower Niagara frontier. Live vehicle queue times, commercial and NEXUS lane status, and bridge camera views across the Peace, Rainbow, and Lewiston–Queenston spans.',
  'midwest-xc': 'Nordic trail conditions across the Northwoods and Upper Midwest. DNR and club grooming logs, live base depths, fresh powder snowfall, and skate-versus-classic track reports.',
  'elk-rut': 'Experience the autumn rut in Rocky Mountain National Park. Dawn and dusk bugling windows, meadow staging zones from Moraine Park to Horseshoe Park, and timed-entry gate logistics.',
  'trail-ridge-road': 'Alpine highway status across the Continental Divide. Official NPS gate open/closed alerts, 12,000-foot pass weather, wind gusts, and seasonal alpine closure status.',
  'yellowstone-geysers': 'Witness the thermal pulse of the Yellowstone Caldera. Official NPS prediction intervals, eruption duration windows, and boardwalk trail alerts for Old Faithful, Grand, Castle, and Riverside.',
  'going-to-the-sun-road-status': 'Traverse the Crown of the Continent. Live NPS alpine pass opening status, plowing progress through the Big Drift, vehicle size restrictions, and Logan Pass parking congestion.',
  'yellowstone-road-status': 'Real-time road reports across Yellowstone\'s Grand Loop. Construction delays, wildlife jams, seasonal gate openings, and winter oversnow travel requirements.',
  'zion-narrows-conditions': 'Canyon safety and Virgin River hydrodynamics in Zion. Real-time USGS flow cubic-feet-per-second, flash flood hazard warnings, water temperature, and NPS permit thresholds.',
  'grand-canyon-access': 'Navigating the South, Desert View, and North Rims of the Grand Canyon. Live NPS road conditions, shuttle operations, rim viewpoint access, and winter weather closures.',
  'lake-mead-access': 'Desert boating logistics on Lake Mead. Current reservoir water elevations, active launch ramp depths, low-water hazards, and NPS marina access status.',
  'lake-powell-ramp-status': 'Glen Canyon navigation and ramp accessibility. Real-time Lake Powell pool elevations, paved ramp usability, primitive launch limits, and NPS water-level thresholds.',
  'yosemite-firefall': 'The February twilight phenomenon at Horsetail Fall. High-elevation snowmelt runoff volume, clear western sunset horizon angles, and El Capitan viewing logistics.',
  'tioga-road-status': 'High Sierra passage across Yosemite\'s granite crest. Live NPS opening and closure status, winter snow-clearing updates, and 9,943-foot Tioga Pass driving conditions.',
  'big-sur-highway-1': 'The rugged Pacific edge of California Highway 1. Real-time Caltrans active slide repairs, one-way traffic controls, road reopenings, and coastal storm detour routes.',
  'sierra-pass-status': 'Cross the granite spine of California. Live Caltrans highway alerts, chain controls, and seasonal opening/closure updates across Donner, Tioga, Sonora, Ebbetts, and Carson passes.',
  'oregon-coast': 'Tidal surges and rocky shoreline discoveries along Highway 101. Low-tide tidepool windows, sneaker wave advisories, and sea cave access for Yaquina Head, Haystack Rock, and Thor’s Well.',
  'ballard-locks': 'Hiram M. Chittenden Locks live maritime operations. Ship canal chamber traffic, commercial vessel passages, underwater salmon ladder viewing, and Puget Sound tidal differences.',
  'grand-coulee': 'Hydropower scale on the Columbia River. Real-time Lake Roosevelt elevations, spillway discharge rates, visitor center tours, and evening laser light show schedules.',
  'columbia-salmon': 'Track returning anadromous runs up the Pacific Northwest\'s greatest river. Daily fish ladder counts at Bonneville, The Dalles, and McNary dams for Chinook, Coho, and summer steelhead.',
  'mount-rainier-road-status': 'Alpine access across the volcanic heights of Mount Rainier. NPS snowplowing status, tire chain requirements, and gate openings for Paradise, Sunrise, and Chinook Pass.'
};

let count = 0;
for (const [id, newDesc] of Object.entries(updates)) {
  const cardRe = new RegExp(`(<article class="directory-card"[^>]*data-tool-id="${id}"[\\s\\S]*?<p class="description">)([\\s\\S]*?)(<\\/p>)`);
  if (cardRe.test(html)) {
    html = html.replace(cardRe, `$1${newDesc}$3`);
    count++;
  } else {
    console.error(`Missing directory card for: ${id}`);
  }
}

fs.writeFileSync(htmlFile, html, 'utf8');
console.log(`Successfully updated ${count} national directory card descriptions in ${htmlFile}`);
