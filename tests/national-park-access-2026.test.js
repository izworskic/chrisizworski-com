const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const page = fs.readFileSync('public/national-park-phenomena-field-guide/index.html','utf8');
const client = fs.readFileSync('public/assets/national-park-phenomena-field-guide.js','utf8');
const windowStub = {};
vm.runInNewContext(client,{window:windowStub,document:{addEventListener(){}}});
const atlas = windowStub.NP_PHENOMENA_DATA;
const get = id => atlas.phenomena.find(x=>x.id===id);
const sections = id => { const start = page.indexOf('<article class="wf-story" id="'+id+'"'); assert.ok(start >= 0); return page.slice(start, page.indexOf('</article>', start)); };
test('Glacier 2026: no vehicle permit, Logan Pass shuttle and parking separated',()=>{
 const glacier=get('glacier-going-to-the-sun-opening');
 assert.equal(glacier.permitType,'open');
 assert.equal(glacier.accessRules.entrance,'NOT_REQUIRED');
 assert.equal(glacier.accessRules.shuttle,'TICKET_REQUIRED');
 assert.equal(glacier.accessRules.parking,'THREE_HOUR_LIMIT');
 assert.deepEqual(Array.from(glacier.accessRules.dateRange),['2026-07-01','2026-09-07']);
 assert.match(sections(glacier.id),/No 2026 Vehicle Reservation/);
 assert.match(sections(glacier.id),/three.hour private.car parking/i);
 assert.match(sections(glacier.id),/2027 rules are unconfirmed/);
 assert.doesNotMatch(sections(glacier.id),/120.Day Rolling|timed.entry reservations are strictly required/i);
});
test('Yosemite Firefall February 2026: no entrance reservation, separate traffic controls',()=>{
 const yose=get('yosemite-horsetail-firefall');
 assert.equal(yose.permitType,'open');
 assert.equal(yose.accessRules.entrance,'NOT_REQUIRED');
 assert.equal(yose.accessRules.parking,'RESTRICTED');
 assert.match(sections(yose.id),/no reservation to enter Yosemite or visit Horsetail Fall/i);
 assert.match(sections(yose.id),/Northside Drive/i);
 assert.match(sections(yose.id),/2027 rules are not confirmed/i);
 assert.doesNotMatch(sections(yose.id),/weekend vehicle timed.entry/i);
});
test('2027 cannot inherit 2026 rule for any park in map or calendar engine',()=>{
 for(const p of atlas.phenomena){
  assert.equal(atlas.getSeasonPolicy(p,2027).status,'UNCONFIRMED');
  assert.match(atlas.getSeasonPolicy(p,2027).text,/unconfirmed/i);
 }
 assert.equal(atlas.getSeasonPolicy(get('glacier-going-to-the-sun-opening'),2026).status,'HISTORICAL_2026');
 assert.doesNotMatch(client,/120.day rolling vehicle reservations|February Yosemite Firefall weekend vehicle reservations/i);
});
test('structured data FAQ and visible FAQ agree, canonical unaffected',()=>{
 const json=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const faq=json['@graph'].find(x=>x['@type']==='FAQPage').mainEntity[0].acceptedAnswer.text;
 assert.match(faq,/Glacier had no vehicle reservation/i);
 assert.match(faq,/2027 are not confirmed/i);
 assert.ok(page.includes(faq));
 assert.match(page,/<link rel="canonical" href="https:\/\/chrisizworski.com\/national-park-phenomena-field-guide\/"/);
 assert.match(page,/phenomenon-leaflet-map/);
 assert.match(client,/carto-basemap-config/);
});

test('Rocky Mountain 2026 separates general from Bear Lake timed-entry schedules',()=>{
 const park=get('rocky-mountain-elk-rut');
 assert.equal(park.accessRules.generalEnd,'2026-10-12');
 assert.equal(park.accessRules.bearLakeEnd,'2026-10-18');
 assert.match(sections(park.id),/7 PM MDT/);
 assert.match(sections(park.id),/October permits September 1/);
 assert.match(sections(park.id),/2027 rules unconfirmed/);
 assert.doesNotMatch(sections(park.id),/required through late October|5:00 PM MT/);
});
test('Acadia 2026 vehicle booking applies only to Cadillac Summit Road and specific dates',()=>{
 const park=get('acadia-cadillac-first-sunrise');
 assert.equal(park.accessRules.summitStart,'2026-05-20');
 assert.equal(park.accessRules.summitEnd,'2026-10-25');
 assert.equal(park.accessRules.otherParkVehicleReservation,'NOT_REQUIRED');
 assert.match(sections(park.id),/30%.*90 days.*70%.*two days/);
 assert.match(sections(park.id),/Other areas of Acadia did not require vehicle reservations/);
 assert.match(sections(park.id),/2027 policy unconfirmed/);
});

test('Zion bottom-up is a no-permit featured hike, top-down retains route-specific permit and warning gates',()=>{
 const zion=get('zion-narrows-flash-window');
 assert.equal(zion.permitType,'open');
 assert.equal(zion.accessRules.bottomUp,'NO_WILDERNESS_PERMIT');
 assert.equal(zion.accessRules.topDown,'WILDERNESS_PERMIT_REQUIRED');
 assert.match(zion.permitLead,/top-down 16-mile day\/overnight trips require/i);
 assert.match(sections(zion.id),/Bottom-Up: No Permit/);
 assert.match(sections(zion.id),/16-mile top-down through-hike/);
 assert.match(sections(zion.id),/at least two hours afterward/);
 assert.match(sections(zion.id),/NPS Narrows permits by route/);
 assert.doesNotMatch(sections(zion.id),/Top-Down Opens 5th of Prior Month/);
});
test('Katmai viewing needs no reservation; separate overnight campground release dates are correct for 2026',()=>{
 const katmai=get('katmai-brooks-falls-bears');
 assert.equal(katmai.permitType,'open');
 assert.equal(katmai.accessRules.bearViewing,'NO_ADVANCE_RESERVATION');
 assert.equal(katmai.accessRules.platform,'CAPACITY_MANAGED');
 assert.equal(katmai.accessRules.campground,'RESERVATION_REQUIRED');
 assert.deepEqual(Array.from(katmai.accessRules.campgroundReleases),['2026-01-07','2026-02-07','2026-03-07']);
 assert.match(sections(katmai.id),/Brooks Falls viewing does not require an advance reservation/);
 assert.match(sections(katmai.id),/February 7 for July–August/);
 assert.match(sections(katmai.id),/Brooks River Corridor activity permits/);
 assert.match(sections(katmai.id),/2027 campground release dates are unconfirmed/);
 assert.doesNotMatch(sections(katmai.id),/January 5|three minutes|Campground Lottery/);
});
test('2026 atlas featured-activity filters classify all 12 destinations consistently',()=>{
 const counts=atlas.phenomena.reduce((a,p)=>(a[p.permitType]++,a),{lottery:0,open:0});
 assert.equal(counts.lottery,4);
 assert.equal(counts.open,8);
 assert.match(page,/2026 Featured Activity Requires Booking \(4\)/);
 assert.match(page,/2026 Featured Activity: No Advance Permit \(8\)/);
});

test('Smokies Elkmont 2026 vehicle lottery dates and registered camper exception are distinct',()=>{
 const fireflies=get('elkmont-synchronous-fireflies');
 assert.equal(fireflies.accessRules.lotteryStart,'2026-04-24');
 assert.equal(fireflies.accessRules.lotteryEnd,'2026-04-27');
 assert.equal(fireflies.accessRules.eventStart,'2026-05-20');
 assert.equal(fireflies.accessRules.eventEnd,'2026-05-27');
 assert.equal(fireflies.accessRules.registeredElkmontCamping,'PEDESTRIAN_ACCESS');
 assert.match(sections(fireflies.id),/Apr 24, 10 AM–Apr 27, 11:59 PM EDT/);
 assert.match(sections(fireflies.id),/not a park-wide entrance requirement/);
 assert.match(sections(fireflies.id),/2027 event and lottery dates are unconfirmed/);
 assert.doesNotMatch(sections(fireflies.id),/shuttle buses into Elkmont|April 24–28/);
});

test('RMNP 2026 elk meadow foot travel closed 5 PM to 10 AM, not 7 AM; designated roadside viewing remains distinct',()=>{
 const elk=get('rocky-mountain-elk-rut');
 assert.equal(elk.accessRules.elkMeadowFootClosure.from,'17:00');
 assert.equal(elk.accessRules.elkMeadowFootClosure.to,'10:00');
 assert.equal(elk.accessRules.elkMeadowFootClosure.start,'2026-09-01');
 assert.equal(elk.accessRules.elkMeadowFootClosure.end,'2026-10-31');
 assert.match(sections(elk.id),/No Foot Travel 5 PM–10 AM/);
 assert.match(sections(elk.id),/area-specific restrictions are not a park-wide road closure/);
 assert.doesNotMatch(sections(elk.id),/5:00 PM and 7:00 AM/);
});
test('brooks camp NPS 50-yard bear separation, not a fictitious 300-foot rule',()=>{
 assert.match(page,/At Katmai Brooks Camp maintain at least 50 yards from bears/);
 assert.doesNotMatch(page,/300 feet from coastal brown bears/);
});
