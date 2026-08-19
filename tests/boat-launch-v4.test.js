const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const boat=require('../api/boat-launches.js')._test;
const weather=require('../api/boat-launch-weather.js')._test;
const html=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const js=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');

test('statewide API accepts an inland DNR launch',()=>{
  const inland={OBJECTID:100,globalid:'inland-guid',facilityid:null,name:'Houghton Lake Access',latitude:44.31,longitude:-84.76,referenceonly:'No',flag:null,waterbody:'Houghton Lake',greatlakesaccess:'No, does not connect (inland lake, etc.)',launch_status:'Open',condition:'Good'};
  assert.equal(boat.eligibleAttributes(inland),true);
  const normalized=boat.normalizeFeature({attributes:inland});
  assert.equal(normalized.waterScope,'inland-or-other');
  assert.equal(normalized.connectionBasis,'dnr-statewide-boating-access');
  assert.equal(normalized.launchStatus,'Open');
  assert.equal(normalized.facilityCondition,'Good');
});

test('source query is statewide rather than Great-Lakes gated',()=>{
  const decoded=decodeURIComponent(boat.queryUrl()).replace(/\+/g,' ');
  assert.match(decoded,/bas_type='Boating Access Site'/);
  assert.match(decoded,/launch_status='Open'/);
  assert.doesNotMatch(decoded,/greatlakesaccess LIKE 'Yes%'/);
  assert.doesNotMatch(decoded,/facilityid IS NOT NULL/);
});

test('finder has exactly one search box and maps the full filtered inventory',()=>{
  assert.equal((html.match(/<input[^>]+type="search"/g)||[]).length,1);
  assert.match(html,/Michigan boat launches, on one map/);
  assert.match(js,/markerClusterGroup/);
  assert.match(js,/for\(const a of mapSet\(\)\)/);
  assert.match(js,/const markerById=new Map\(\)/);
});

test('search keeps destination routing and launch-name fallback in one control',()=>{
  assert.match(js,/runDestinationSearch/);
  assert.match(js,/directMatches/);
  assert.match(js,/DRIVE_API='\/api\/boat-launch-drive'/);
  assert.match(js,/sort\.value='nearest'/);
  assert.doesNotMatch(html,/launch-name-filter/);
});

test('map selection synchronizes the results without scrolling the page past details',()=>{
  assert.match(js,/function keepResultVisible\(row\)/);
  assert.match(js,/results\.scrollTop=/);
  assert.doesNotMatch(js,/newRow\.scrollIntoView/);
  assert.match(js,/selected\.scrollIntoView\(\{block:'start'/);
  assert.match(js,/max-width: 980px/);
});

test('review workflow is explained as data verification, not launch condition',()=>{
  assert.doesNotMatch(html,/DNR review in progress/i);
  assert.doesNotMatch(js,/DNR review in progress/i);
  assert.match(html,/does not mean the launch itself is closed or unsafe/i);
  assert.match(js,/This launch is listed Open by Michigan DNR/);
});

test('pin colors use only source-backed status and do not invent condition ratings',()=>{
  assert.match(js,/isSupplemental\(a\)\?'municipal':'open'/);
  assert.doesNotMatch(js,/function conditionKey\(a\)/);
  assert.match(html,/Green = Michigan DNR currently lists the launch Open/i);
  assert.match(html,/Violet = separately verified municipal launch/i);
  assert.match(html,/Blue = your selected launch/i);
  assert.match(html,/condition values are preserved and shown only when the source actually publishes one/i);
  assert.doesNotMatch(html,/green = good|amber = fair|red = poor/i);
});

test('weather endpoint only accepts Michigan-area launch points',()=>{
  assert.equal(weather.validPoint(43.59,-83.89),true);
  assert.equal(weather.validPoint(44.31,-84.76),true);
  assert.equal(weather.validPoint(39.1,-84.5),false);
  assert.equal(weather.validPoint(44.3,-95),false);
});

test('weather normalization does not invent safety claims',()=>{
  assert.deepEqual(weather.period({name:'Tonight',temperature:62,temperatureUnit:'F',windSpeed:'5 mph',windDirection:'NW',shortForecast:'Clear'}),{name:'Tonight',startTime:null,isDaytime:null,temperature:62,temperatureUnit:'F',windSpeed:'5 mph',windDirection:'NW',shortForecast:'Clear',probabilityOfPrecipitation:null});
  assert.doesNotMatch(fs.readFileSync('api/boat-launch-weather.js','utf8'),/safe to boat|safe to launch|safety score/i);
});