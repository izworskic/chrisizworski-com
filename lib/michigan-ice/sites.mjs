const nps='https://www.nps.gov/piro/planyourvisit/';
export const STATIONS={
 chatham:{id:'201485',name:'Chatham 1 SE',lat:46.3345,lon:-86.92},
 munising:{id:'USW00054813',name:'Munising Lakeshore',lat:46.41204,lon:-86.65045},
 paradise:{id:'206354',name:'Paradise (regional proxy)',lat:46.6038,lon:-85.0396}
};
export const SITES=[
 {id:'eben',roadDestination:'Eben Junction MI',name:'Eben Ice Caves',kind:'Seep-fed curtains',station:'chatham',lat:46.383,lon:-86.944,
  scope:'Rock River Canyon Wilderness · inland curtains',manager:'Hiawatha National Forest · Munising Ranger District',
  short:'Water finds its way through sandstone, then winter slowly builds a wall of ice.',
  experience:'A substantial winter hike to an inland ice amphitheater. This is the classic ice-cave experience, but the approach and overhead ice deserve respect.',
  mechanism:'Seeping water and snowmelt freeze beneath overhanging sandstone. Cold air supplies only one ingredient: a weather station cannot measure how much water is reaching the cliff.',
  access:'Published approach: Eben Road to Frey Road. Parking and the start of the approach involve private land. Verify current permission and posted parking instructions before leaving; no verified parking pin is provided here.',
  walk:'Roughly two miles round trip on an unofficial winter route, with steep icy slopes, wet crossings and variable snow. This is not a maintained accessible trail.',
  safety:'Large ice can fall unexpectedly. Stay out from beneath and behind the curtains. Traction helps with footing, not falling ice. Do not enter the wilderness by snowmobile.',
  authority:'https://www.fs.usda.gov/r09/hiawatha/alerts',
  source:'https://www.fs.usda.gov/r09/hiawatha/wilderness/sustainable-recreation-strategy-rock-river-canyon-wilderness-eben-ice-caves',
  accessState:'unverified',gate:'overhead-ice',aurora:'munising'},
 {id:'sand-point',roadDestination:'Sand Point Beach Munising MI',name:'Sand Point Ice Curtains',kind:'Mainland ice curtains',station:'munising',lat:46.449,lon:-86.607,
  scope:'Pictured Rocks · inland escarpment',manager:'Pictured Rocks National Lakeshore · National Park Service',
  short:'A close look at the winter curtains growing on the mainland sandstone escarpment.',
  experience:'Look for ice through the trees along the inland cliffs near Sand Point Road. This is a land-based alternative to viewing Grand Island across the bay.',
  mechanism:'Water seeps from porous sandstone and freezes into columns and curtains. Each ledge has its own water supply and exposure; one developed curtain does not confirm every viewing area.',
  access:'NPS identifies Sand Point Beach parking, then a walk back along the road about ¼–½ mile to signed viewing areas. Sand Point Road and beach lots are normally plowed in winter. Current closures and maintenance still govern.',
  walk:'Uphill approaches from the road are not designated trails. Do not park on the shoulder, use the closed Munising Falls trail, or walk on groomed ski tracks.',
  safety:'Stay clear of overhead ice and ice-climbing fall zones. Pets are not allowed at the ice-viewing/climbing areas. Stay off lake ice and obey closures.',
  authority:nps+'conditions.htm',source:nps+'winteractivities.htm',accessState:'unverified',gate:'overhead-ice',aurora:'munising',
  arrival:'https://www.nps.gov/places/sand-point-beach.htm'},
 {id:'grand-island',roadDestination:'Sand Point Beach Munising MI',name:'Grand Island Ice Curtains',kind:'Mainland shore viewing',station:'munising',lat:46.449,lon:-86.607,
  scope:'Distant views from Sand Point · mainland only',manager:'Grand Island: Hiawatha NF · mainland beach: Pictured Rocks NPS',
  short:'Bring binoculars. This plan keeps your feet on the mainland.',
  experience:'View the island’s curtains across Munising Bay from the beaches at the end of Sand Point Road. This is a distant view, not a walk inside a cave. Not every photographed formation is visible from here.',
  mechanism:'Seep water, freezing air and Lake Superior exposure shape the island’s curtains. Lake ice, cliff ice and visibility from shore are three different things; a frozen bay does not prove a view or safe passage.',
  access:'Use Sand Point Beach on the mainland. NPS describes plowed winter road and parking access; check current restrictions before travelling. Binoculars or a telephoto lens help with the distant view.',
  walk:'Remain on the mainland. No ice-crossing route, winter ferry or island arrival is part of this planner.',
  safety:'Stay off the lake ice. The deep channel between Sand Point and Grand Island has shifting currents. Lake-wide ice cover and cold totals do not establish a safe crossing.',
  authority:nps+'conditions.htm',source:nps+'winteractivities.htm',accessState:'unverified',gate:'shore-only',aurora:'munising',
  arrival:'https://www.nps.gov/places/sand-point-beach.htm'},
 {id:'wagner-falls',roadDestination:'Wagner Falls Scenic Site MI',name:'Wagner Falls',kind:'Winter waterfall',station:'munising',lat:46.387526,lon:-86.646904,
  scope:'Wagner Falls Scenic Site · observation platform',manager:'Michigan DNR · Parks & Recreation Division',
  short:'A small woodland cascade, best treated as a short stop on a Munising winter trip.',
  experience:'Water, snow and ice share this quiet woodland scene. It does not need to freeze solid to be beautiful, and it is not an ice cave.',
  mechanism:'Flowing creek water and spray can build ice around the ledges during sustained cold. Flow and local shade matter; the Munising station is regional weather context, not a measurement at the falls.',
  access:'DNR lists an 8–10-car parking area off M-94, about 0.3 mile from M-28. No on-site water or restrooms. Winter plowing and platform maintenance are not currently verified by this tool.',
  walk:'DNR describes a 0.1-mile gravel and boardwalk approach to the viewing platform. Snow or ice can change the footing; stay on the open path and platform.',
  safety:'Stay out of the creek and off the ice. Snow can hide edges and slippery boards; do not approach beneath overhangs or bypass barriers.',
  authority:'https://www.michigan.gov/dnr/about/newsroom/closures',source:'https://www.michigan.gov/recsearch/parks/wagnerfalls',accessState:'unverified',gate:'platform',aurora:'munising',
  arrival:'https://www.michigan.gov/recsearch/parks/wagnerfalls'},
 {id:'tahquamenon-falls',roadDestination:'Tahquamenon Upper Falls Day Use Area MI',name:'Tahquamenon Falls',kind:'Ice-framed flowing water',station:'paradise',lat:46.5747,lon:-85.2564,
  scope:'Upper Falls first · Lower Falls context',manager:'Michigan DNR · Tahquamenon Falls State Park',
  short:'Listen for the river beneath winter’s frame. A complete freeze is not the goal.',
  experience:'A powerful waterfall can remain flowing amid impressive ice and snow. Plan around open Upper Falls overlooks; the Lower Falls have a separate approach off M-123.',
  mechanism:'Cold builds ice along the edges and spray zones while the river carries heat and moving water. Full freezing is not predicted here. Paradise is an explicitly labeled regional temperature proxy, not a sensor at the falls.',
  access:'Use official Upper Falls day-use arrival information off M-123; the DNR park-wide directions point is not the Upper Falls lot. Check current winter paths, overlooks and parking with the park. Recreation Passport required for vehicle entry.',
  walk:'The Upper Falls has a new accessible boardwalk completed in 2026. Winter maintenance and snow/ice accessibility must be checked separately. Do not rely on older maps showing the former brink stairs.',
  safety:'Stay on open designated paths and overlooks. Do not walk onto river ice or cross the frozen flow. A weather outlook cannot establish a safe surface.',
  authority:'https://www.michigan.gov/dnr/about/newsroom/closures',source:'https://www.michigan.gov/recsearch/parks/tahquamenonfalls',accessState:'unverified',gate:'platform',aurora:'paradise-whitefish-point',
  arrival:'https://www.michigan.gov/recsearch/parks/tahquamenonfalls'}
];
// Deliberately empty: absence of a current official observation is not a formation verdict.
// Records must include siteId, state, observedOn, publishedOn, source, authority, viewingScope.
export const REPORTS=[];
export const ACCESS_REVIEWS=[];
export const DEFERRED=[
 {name:'Munising Falls',state:'Closed until further notice',reason:'NPS still lists the trail as closed after April 2025 storm damage. Normal winter plowing does not reopen the falls approach.',source:nps+'waterfalls.htm',checkedOn:'2026-10-19'},
 {name:'Alger Falls',state:'Winter arrival not verified',reason:'The roadside attraction is documented, but land permission and legal, maintained winter stopping have not been established. No dedicated trip page or directions are offered.',source:'https://www.munisingtownship.org/wp-content/uploads/2023/10/Draft-Recreation-Plan.pdf',checkedOn:'2026-10-19'}
];
