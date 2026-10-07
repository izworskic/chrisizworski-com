const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const api = require('../api/flight-tracker.js')._test;
const assignmentApi = require('../api/flight-assignment.js')._test;
const html = fs.readFileSync(path.join(root,'public','flight-tracker','index.html'),'utf8');
const client = fs.readFileSync(path.join(root,'public','assets','flight-tracker.js'),'utf8');

test('passenger flight numbers normalize only to direct unambiguous operating callsigns', () => {
  const delta = api.normalizeFlightInput('dl 1234');
  assert.equal(delta.ok, true);
  assert.equal(delta.display, 'DL1234');
  assert.deepEqual(delta.callsigns, ['DAL1234']);

  const american = api.normalizeFlightInput('AA86');
  assert.equal(american.callsigns[0], 'AAL86');


  const raw = api.normalizeFlightInput('UAL2380');
  assert.equal(raw.ok, true);
  assert.deepEqual(raw.callsigns, ['UAL2380']);
});


test('direct airline coverage includes verified major international and nearby carriers without regional guessing', () => {
  const expected = {
    BA:'BAW', LH:'DLH', AF:'AFR', KL:'KLM', EI:'EIN', FI:'ICE', VS:'VIR',
    TK:'THY', EK:'UAE', QR:'QTR', NH:'ANA', JL:'JAL', SQ:'SIA', QF:'QFA',
    NZ:'ANZ', AI:'AIC', KE:'KAL', AM:'AMX', AV:'AVA', CM:'CMP', PD:'POE', TS:'TSC'
  };
  for (const [iata, icao] of Object.entries(expected)) {
    const normalized = api.normalizeFlightInput(iata + '123');
    assert.equal(normalized.ok, true, iata);
    assert.deepEqual(normalized.callsigns, [icao + '123'], iata);
  }
  // The resolver still does not invent same-number regional partner callsigns.
  assert.deepEqual(api.normalizeFlightInput('DL123').callsigns, ['DAL123']);
  assert.deepEqual(api.normalizeFlightInput('AA123').callsigns, ['AAL123']);
  assert.deepEqual(api.normalizeFlightInput('UA123').callsigns, ['UAL123']);
});

test('common aircraft type designators become passenger-readable names and unknown types stay truthful', () => {
  assert.equal(api.aircraftTypeName('A321'), 'Airbus A321');
  assert.equal(api.aircraftTypeName('B38M'), 'Boeing 737 MAX 8');
  assert.equal(api.aircraftTypeName('BCS3'), 'Airbus A220-300');
  assert.equal(api.aircraftTypeName('E75L'), 'Embraer E175');
  assert.equal(api.aircraftTypeName('ZZZZ'), 'ZZZZ');
  assert.equal(api.aircraftTypeName(null), null);
});

test('unknown airline and malformed flight numbers fail closed', () => {
  assert.equal(api.normalizeFlightInput('ZZ123').ok, false);
  assert.equal(api.normalizeFlightInput('1234').ok, false);
  assert.equal(api.normalizeFlightInput('').ok, false);
});

test('aircraft sanitizer requires an actual reported position', () => {
  assert.equal(api.sanitizeAircraft({flight:'DAL1',alt_baro:33000},'DAL1'), null);
  const plane = api.sanitizeAircraft({
    flight:'DAL1 ',
    hex:'a12345',
    lat:42.1,
    lon:-84.2,
    alt_baro:33000,
    gs:452.4,
    track:181.2,
    seen_pos:3.6,
    r:'N123DN',
    t:'A321'
  },'DAL1');
  assert.equal(plane.callsign,'DAL1');
  assert.equal(plane.lat,42.1);
  assert.equal(plane.lon,-84.2);
  assert.equal(plane.altitudeFeet,33000);
  assert.equal(plane.positionAgeSeconds,3.6);
  assert.equal(plane.aircraftTypeName,'Airbus A321');
});


test('route plausibility rejects grossly wrong airport pairs without hiding normal corridor progress', () => {
  const jfk = {lat:40.639801,lon:-73.7789};
  const lhr = {lat:51.4706,lon:-0.461941};
  const connecticut = {lat:41.57,lon:-72.64};
  const losAngeles = {lat:34.05,lon:-118.24};
  assert.equal(api.routeLooksPlausible(connecticut,jfk,lhr),true);
  assert.equal(api.routeLooksPlausible(losAngeles,jfk,lhr),false);
});

test('resolver never guesses when multiple live candidates remain', () => {
  const one = api.chooseUnique([{callsign:'DAL123',positionAgeSeconds:2},null]);
  assert.equal(one.status,'unique');
  assert.equal(one.aircraft.callsign,'DAL123');

  const ambiguous = api.chooseUnique([
    {callsign:'DAL123',positionAgeSeconds:3},
    {callsign:'EDV123',positionAgeSeconds:4}
  ]);
  assert.equal(ambiguous.status,'ambiguous');
  assert.equal(ambiguous.aircraft,null);
});

test('page leads with the delayed-flight inbound-aircraft problem rather than a generic map', () => {
  assert.match(html, /<h1 id="page-title">Where's the Plane for My Flight\?<\/h1>/);
  assert.match(html, /Flight delayed\?/);
  assert.match(html, /id="flight-number"/);
  assert.match(html, /id="flight-date"/);
  assert.match(html, /FIND MY PLANE/);
  assert.match(html, /id="answer-card"/);
  assert.ok(html.indexOf('id="answer-card"') < html.indexOf('id="flight-map"'));
  assert.match(html, /Built for delays/);
  assert.match(html, /Assignments can change/);
  assert.doesNotMatch(html, /weather score|airport dashboard|recommendation score/i);
});


test('browser loader uses the supported MapLibre ESM bundle instead of the missing classic bundle', () => {
  assert.doesNotMatch(html, /maplibre-gl@6\.3\.0\/dist\/maplibre-gl\.js/);
  assert.match(html, /flight-tracker\.js\?v=20261007m/);
  assert.match(client, /import\('https:\/\/cdn\.jsdelivr\.net\/npm\/maplibre-gl@6\.3\.0\/dist\/maplibre-gl\.mjs'\)/);
  assert.match(client, /The flight map could not load/);
});

test('client plots only API positions and refreshes without simulated motion', () => {
  assert.match(client, /planeMarker\.setLngLat\(\[ac\.lon,ac\.lat\]\)/);
  assert.match(client, /setInterval\(\(\) => \{/);
  assert.match(client, /10000/);
  assert.doesNotMatch(client, /requestAnimationFrame/);
  assert.doesNotMatch(client, /interpolate.*aircraft|estimated position/i);
});

test('flight API uses ADSB.lol callsign and route sources with API noindex', () => {
  const source = fs.readFileSync(path.join(root,'api','flight-tracker.js'),'utf8');
  assert.match(source, /api\.adsb\.lol/);
  assert.match(source, /\/v2\/callsign\//);
  assert.match(source, /vrs-standing-data\.adsb\.lol\/routes/);
  assert.match(source, /X-Robots-Tag/);
  assert.match(source, /s-maxage=/);
  assert.match(source, /ODbL 1\.0/);
  assert.match(source, /CC0 1\.0/);
});

test('flight tracker SEO contract remains concise and canonical', () => {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
  assert.ok(title.length <= 60, 'title exceeds 60 characters');
  assert.ok(description.length <= 158, 'description exceeds 158 characters');
  assert.match(html, /https:\/\/chrisizworski\.com\/flight-tracker\//);
  assert.match(html, /"@id":"https:\/\/chrisizworski\.com\/#person"/);
  assert.match(html, /"dateModified":"2026-10-07"/);
});


function testPlane(overrides = {}) {
  return {
    lat: 33.6, lon: -84.43, onGround: false,
    altitudeFeet: 24000, speedKnots: 420,
    verticalRateFpm: 0, trackDegrees: 165,
    positionAgeSeconds: 3,
    ...overrides
  };
}

function testRoute() {
  return {
    plausible: true,
    origin: { iata:'ATL', lat:33.64, lon:-84.43 },
    destination: { iata:'MCO', lat:28.431, lon:-81.308 }
  };
}

test('phase labels derive only from fresh telemetry and never equate ground to landed', () => {
  assert.equal(api.flightPhase(testPlane({verticalRateFpm:700}), true).label, 'Climbing');
  assert.equal(api.flightPhase(testPlane({verticalRateFpm:-800}), true).label, 'Descending');
  assert.equal(api.flightPhase(testPlane(), true).label, 'Cruising');
  assert.equal(api.flightPhase(testPlane({onGround:true}), true).label, 'On ground');
  assert.equal(api.flightPhase(testPlane({verticalRateFpm:-800}), false).label, 'Position not current');
  assert.equal(api.flightPhase(testPlane({speedKnots:null,altitudeFeet:null}), true).label, 'Phase unavailable');
});

test('straight-line miles left and broad landing window are computed for a credible airborne flight', () => {
  const progress=api.flightProgress(testPlane(), testRoute(), true);
  assert.equal(progress.phase.label,'Cruising');
  assert.equal(progress.remainingBasis,'straight-line');
  assert.ok(progress.remainingMiles > 300 && progress.remainingMiles < 500, progress.remainingMiles);
  assert.equal(progress.remainingMiles % 5,0);
  assert.equal(progress.landingEstimate.kind,'calculated-window');
  assert.equal(progress.landingEstimate.confidence,'rough');
  assert.ok(progress.landingEstimate.minMinutes >= 20);
  assert.ok(progress.landingEstimate.maxMinutes >= progress.landingEstimate.minMinutes + 10);
  assert.ok(progress.landingEstimate.maxMinutes > 45);
});


test('direct progress is rounded, bounded, and clearly separate from route miles', () => {
  const route = {
    plausible:true,
    origin:{iata:'ATL',lat:33.64,lon:-84.43},
    destination:{iata:'MCO',lat:28.431,lon:-81.308}
  };
  const midway = {
    lat:31.15,lon:-82.87,onGround:false,altitudeFeet:28000,speedKnots:430,
    verticalRateFpm:0,trackDegrees:145,positionAgeSeconds:2
  };
  const progress=api.flightProgress(midway,route,true);
  assert.ok(Number.isFinite(progress.directDistanceMiles));
  assert.ok(progress.directDistanceMiles > progress.remainingMiles);
  assert.ok(progress.directProgressPercent >= 0 && progress.directProgressPercent <= 100);
  assert.equal(progress.directProgressPercent % 5,0);
});

test('untrusted, stale, and no-route positions suppress calculated ETA and distance', () => {
  const plane=testPlane();
  for (const [p,route,fresh] of [
    [plane,null,true],
    [plane,{...testRoute(),plausible:false},true],
    [plane,testRoute(),false],
    [testPlane({speedKnots:null}),testRoute(),true],
    [testPlane({speedKnots:30}),testRoute(),true],
    [testPlane({onGround:true}),testRoute(),true],
    [testPlane({trackDegrees:330}),testRoute(),true]
  ]) {
    const progress=api.flightProgress(p,route,fresh);
    assert.equal(progress.landingEstimate,null,JSON.stringify(p));
  }
  assert.equal(api.flightProgress(plane,null,true).remainingMiles,null);
  assert.equal(api.flightProgress(plane,testRoute(),false).remainingMiles,null);
});

test('last 20 nautical miles suppresses landing ETA rather than suggesting runway precision', () => {
  const plane=testPlane({lat:28.5, lon:-81.4, altitudeFeet:1800, speedKnots:220});
  const progress=api.flightProgress(plane,testRoute(),true);
  assert.equal(progress.landingEstimate,null);
  assert.ok(progress.remainingMiles <= 20);
});

test('ground flag from actual ADS-B field is preserved, and absent telemetry never becomes zero', () => {
  const plane=api.sanitizeAircraft({flight:'DAL500',lat:28.4,lon:-81.3,alt_baro:'ground',seen_pos:4,gs:0},'DAL500');
  assert.equal(plane.onGround,true);
  assert.equal(plane.positionAgeSeconds,4);
  const noTime=api.sanitizeAircraft({flight:'DAL500',lat:28.4,lon:-81.3,alt_baro:800,seen_pos:null,gs:null},'DAL500');
  assert.equal(noTime.positionAgeSeconds,null);
  assert.equal(noTime.speedKnots,null);
});

test('page displays compact live phase, direct miles left and landing window above map', () => {
  assert.match(html, /id="flight-phase"/);
  assert.match(html, /id="flight-distance"/);
  assert.match(html, /id="landing-window"/);
  assert.ok(html.indexOf('id="landing-window"') < html.indexOf('id="flight-map"'));
  assert.match(client, /function renderProgress\(data\)/);
  assert.match(client, /renderProgress\(data\);/);
  assert.match(client, /glance\.hidden = true/);
  assert.match(html, /Rough landing window/);
  assert.doesNotMatch(html, /scheduled arrival:|on.time score|delay prediction/i);
});


test('page renders human-readable route, aircraft identity and tiny direct-progress bar without dashboard creep', () => {
  assert.match(html, /id="route-codes"/);
  assert.match(html, /id="direct-progress"/);
  assert.match(html, /id="direct-progress-fill"/);
  assert.match(html, /id="direct-progress-percent"/);
  assert.match(client, /function airportPlace\(ap\)/);
  assert.match(client, /function aircraftIdentity\(ac\)/);
  assert.match(client, /routeLabel\.textContent = airportPlace/);
  assert.match(client, /routeCodes\.textContent = airportCode/);
  assert.match(client, /progressFill\.style\.width/);
  assert.match(client, /aircraftIdentity\(ac\)/);
  assert.doesNotMatch(html, /squawk|mach|weather radar|airport dashboard/i);
});


test('silent refresh keeps the last confirmed flight through transient source misses', () => {
  assert.match(client, /const HOLD_LAST_LIVE_MS = 5 \* 60 \* 1000/);
  assert.match(client, /function holdLastLiveOnRefreshMiss\(data\)/);
  assert.match(client, /const meaningfullyStale = apparentAge > 90/);
  assert.match(client, /if \(silent && refreshInFlight\) return;/);
  assert.match(client, /if \(data\.status === 'live'\) \{\s*renderLive\(data\);[\s\S]*\} else if \(!\(silent && holdLastLiveOnRefreshMiss\(data\)\)\)/s);
  assert.match(client, /meaningfullyStale \? ' · refresh retrying' : ''/);
  assert.match(client, /if \(meaningfullyStale\) \{\s*phaseLabel\.textContent = 'Last reported';\s*landingLabel\.textContent = 'Refresh pending';/s);
  assert.match(client, /else \{\s*setMessage\('', 'neutral'\);\s*\}/s);
});

test('refresh resilience is bounded and explicit lookups still fail closed', () => {
  assert.match(client, /elapsedMs > HOLD_LAST_LIVE_MS/);
  assert.match(client, /if \(!silent\) \{\s*resetHeldLive\(\);/s);
  assert.match(client, /else if \(!\(silent && holdLastLiveOnRefreshMiss\(data\)\)\) \{\s*renderUnavailable\(data\);/s);
  assert.match(client, /const sequence = \+\+requestSequence/);
  assert.match(client, /sequence !== requestSequence \|\| activeFlight !== normalized/);
});


test('assignment parser extracts same-day flight options from FlightStats structured page data', () => {
  const payload = {
    props:{initialState:{flightTracker:{otherDays:[
      {flights:[
        {
          url:'/flight-tracker/DL/1234?year=2026&month=10&date=07&flightId=777',
          sortTime:'2026-10-07T20:30:00.000Z',
          departureAirport:{iata:'DTW',city:'Detroit'},
          arrivalAirport:{iata:'MBS',city:'Saginaw'},
          departureTime:'4:30',departureTimeAmPm:'PM',departureTimezone:'EDT'
        },
        {
          url:'/flight-tracker/DL/1234?year=2026&month=10&date=08&flightId=778',
          sortTime:'2026-10-08T20:30:00.000Z',
          departureAirport:{iata:'DTW'},arrivalAirport:{iata:'MBS'}
        }
      ]}
    ]}}}
  };
  const htmlFixture = '<script>__NEXT_DATA__ = ' + JSON.stringify(payload) + ';__NEXT_LOADED_PAGES__=[];</script>';
  const parsed = assignmentApi.parseNextData(htmlFixture);
  const date = assignmentApi.normalizeDate('2026-10-07');
  const options = assignmentApi.optionsForDate(parsed,date);
  assert.equal(options.length,1);
  assert.equal(options[0].flightId,'777');
  assert.equal(options[0].origin.iata,'DTW');
  assert.equal(options[0].destination.iata,'MBS');
});

test('assignment sanitizer extracts assigned tail, delay, gates and scheduled route without inventing an inbound leg', () => {
  const flight = {
    flightId:1412663918,
    flightNote:{canceled:false,hasDepartedRunway:false,landed:false,message:'Tracking will begin after departure'},
    isTracking:false,isLanded:false,
    resultHeader:{carrier:{fs:'AA'},flightNumber:'3276'},
    status:{
      statusCode:'D',status:'Delayed',statusDescription:'Delayed',
      delay:{departure:{minutes:43},arrival:{minutes:20}},
      lastUpdatedText:'Status Last Updated 2 Minutes Ago'
    },
    departureAirport:{
      fs:'DTW',iata:'DTW',city:'Detroit',name:'Detroit Metro',gate:'A31',terminal:'EM',
      timeZoneRegionName:'America/Detroit',
      times:{scheduled:{time:'5:30',ampm:'PM',time24:'17:30',timezone:'EDT'},estimatedActual:{time:'6:13',ampm:'PM',time24:'18:13',timezone:'EDT'}}
    },
    arrivalAirport:{fs:'MBS',iata:'MBS',city:'Saginaw',name:'MBS International'},
    additionalFlightInfo:{equipment:{iata:'CR9',name:'Bombardier CRJ900',title:'Actual'}},
    positional:{flexTrack:{tailNumber:'N912XJ',equipment:'CR9'}},
    schedule:{scheduledDepartureUTC:'2026-10-07T21:30:00Z',estimatedActualDepartureUTC:'2026-10-07T22:13:00Z'}
  };
  const result=assignmentApi.sanitizeFlight(
    flight,
    {display:'DL1234'},
    'https://www.flightstats.com/v2/flight-tracker/DL/1234?flightId=1'
  );
  assert.equal(result.tailNumber,'N912XJ');
  assert.equal(result.assignmentState,'assigned');
  assert.equal(result.origin.iata,'DTW');
  assert.equal(result.destination.iata,'MBS');
  assert.equal(result.origin.gate,'A31');
  assert.equal(result.flightStatus.departureDelayMinutes,43);
  assert.equal(result.equipment.name,'Bombardier CRJ900');
  assert.equal(result.currentLeg,undefined);
});

test('registration lookup support is explicit and preserves grounded aircraft without fabricating a position', () => {
  assert.equal(api.normalizeRegistration(' n463aa '),'N463AA');
  assert.equal(api.normalizeRegistration('***'),null);
  const seen=api.sanitizeSeenAircraft({r:'N463AA',t:'A21N',alt_baro:'ground',seen:4.5},'N463AA');
  assert.equal(seen.registration,'N463AA');
  assert.equal(seen.onGround,true);
  assert.equal(seen.aircraftTypeName,'Airbus A321neo');
  assert.equal(seen.lastSeenSeconds,4.5);
});

test('client resolves scheduled assignment first, then follows the exact tail by registration', () => {
  assert.match(client, /fetch\('\/api\/flight-assignment\?' \+ params\.toString\(\)/);
  assert.match(client, /const liveParams = new URLSearchParams\(\{registration\}\)/);
  assert.match(client, /liveParams\.set\('focusAirport', focusAirport\)/);
  assert.match(client, /assignedTail = data\.tailNumber \|\| null/);
  assert.match(client, /assignmentChangedFrom = priorTail && assignedTail && priorTail !== assignedTail/);
  assert.match(client, /setInterval\(\(\) => \{[\s\S]*loadAssignment\(activeFlight,activeDate,activeFlightId,\{silent:true\}\)[\s\S]*\},60000\)/);
  assert.match(client, /if \(assignedTail\) loadRegistration\(assignedTail,\{silent:true\}\)/);
});

test('client answers whether the assigned aircraft is actually inbound to the departure airport', () => {
  assert.match(client, /const currentRoute = resolvedCurrentRoute\(assignment, live\)/);
  assert.match(client, /const inboundToOrigin = currentRoute\?\.destination && userOrigin && sameAirport\(currentRoute\.destination,userOrigin\)/);
  assert.match(client, /Your plane is on the way to/);
  assert.match(client, /THIS IS THE PLANE FOR YOUR FLIGHT/);
  assert.match(client, /It is not yet flying into/);
  assert.match(client, /airline recently changed the assigned aircraft/);
});

test('assignment source remains a bounded best-effort dependency with live-flight fallback', () => {
  const source = fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(source, /www\.flightstats\.com\/v2/);
  assert.match(source, /__NEXT_DATA__ = /);
  assert.match(source, /tailNumber/);
  assert.match(source, /source-unavailable/);
  assert.match(source, /Aircraft assignments can change before departure/);
  assert.match(client, /AIRCRAFT ASSIGNMENT UNAVAILABLE/);
  assert.match(client, /loadFlight\(activeFlight,\{silent:false\}\)/);
});


test('route disambiguation makes time and city names dominant so opposite-direction legs are hard to confuse', () => {
  assert.match(client, /kicker\.textContent = 'YOUR FLIGHT'/);
  assert.match(client, /time\.className = 'route-choice-time'/);
  assert.match(client, /cities\.className = 'route-choice-cities'/);
  assert.match(client, /airportChoiceText\(option\.origin\) \+ ' → ' \+ airportChoiceText\(option\.destination\)/);
  assert.match(client, /codes\.className = 'route-choice-codes'/);
  assert.match(html, /\.route-choice-time\{font-size:20px/);
  assert.match(html, /\.route-choice-cities\{font-size:14px/);
  assert.match(client, /Choose the city pair and departure time on your ticket/);
});

test('answer card includes one bounded what-happens-next interpretation instead of adding dashboard panels', () => {
  assert.match(html, /id="answer-next"/);
  assert.match(client, /answerNext\.textContent = next \|\| ''/);
  assert.match(client, /What happens next: .*lands at .*taxis to a gate .*turns for your/s);
  assert.match(client, /What happens next: we’ll recheck the aircraft assignment every minute/);
  assert.match(client, /What happens next: we’ll keep checking .*If it starts reporting a usable position/s);
  assert.doesNotMatch(html, /weather panel|gate history|squawk|vertical speed/i);
});

test('assigned aircraft states use traveler language and live position relationships', () => {
  assert.match(client, /Your plane is assigned, but we can’t map it live right now/);
  assert.match(client, /Your plane is assigned and on the ground/);
  assert.match(client, /It may be parked at a gate, outside coverage, or between usable position reports/);
  assert.match(client, /We found your plane:/);
  assert.match(client, /function reportAgeLead\(value\)/);
  assert.match(client, /Your plane appears to be approaching/);
  assert.match(client, /Your plane is moving generally toward/);
  assert.match(client, /Your plane is on the ground at/);
  assert.match(client, /function relationshipDistanceText\(relationship, label\)/);
  assert.match(client, /we have not yet confirmed the origin of its current flight/);
  assert.match(client, /Our live aircraft feed can see/);
  assert.doesNotMatch(client, /current airport-to-airport leg/);
  assert.doesNotMatch(client, /The ADS-B network is seeing/);
});


test('same-day occurrence fusion requires the same flight number, same tail, airborne status and not landed', () => {
  const selected = {
    flightNumber:'AA3101',
    tailNumber:'N919NN',
    flightStatus:{airborne:false,landed:false}
  };
  const matching = {
    flightNumber:'AA3101',
    tailNumber:'N919NN',
    origin:{iata:'DFW',city:'Dallas/Fort Worth'},
    destination:{iata:'DTW',city:'Detroit'},
    flightStatus:{airborne:true,landed:false}
  };
  assert.equal(assignmentApi.isMatchingAirborneOccurrence(matching,selected),true);
  assert.equal(assignmentApi.isMatchingAirborneOccurrence({...matching,tailNumber:'N920NN'},selected),false);
  assert.equal(assignmentApi.isMatchingAirborneOccurrence({...matching,flightNumber:'AA999'},selected),false);
  assert.equal(assignmentApi.isMatchingAirborneOccurrence({...matching,flightStatus:{airborne:false,landed:false}},selected),false);
  assert.equal(assignmentApi.isMatchingAirborneOccurrence({...matching,flightStatus:{airborne:true,landed:true}},selected),false);
  const summary=assignmentApi.currentOccurrenceSummary(matching);
  assert.equal(summary.origin.iata,'DFW');
  assert.equal(summary.destination.iata,'DTW');
  assert.equal(summary.evidence.kind,'same-day-same-flight-same-tail-airborne');
});

test('browser uses a confirmed same-day occurrence only when live route is missing and callsign number agrees', () => {
  assert.match(client, /function confirmedOccurrenceRoute\(assignment, live\)/);
  assert.match(client, /assignment\?\.currentAircraftOccurrence/);
  assert.match(client, /occurrence\?\.flightStatus\?\.airborne !== true/);
  assert.match(client, /occurrenceTail !== assignmentTail \|\| liveTail !== assignmentTail/);
  assert.match(client, /flightNumberSuffix\(assignment\?\.flightNumber\)/);
  assert.match(client, /flightNumberSuffix\(live\?\.aircraft\?\.callsign\)/);
  assert.match(client, /if \(live\?\.route\?\.origin && live\?\.route\?\.destination\) return live\.route/);
  assert.match(client, /const currentRoute = resolvedCurrentRoute\(assignment, live\)/);
  assert.match(client, /inboundToOrigin = currentRoute\?\.destination/);
  assert.match(client, /routeLabel\.textContent = airportPlace\(currentRoute\.origin\) \+ ' → ' \+ airportPlace\(currentRoute\.destination\)/);
});


test('airport coordinate index parses VRS CSV and resolves IATA and ICAO codes', () => {
  const csv = [
    'Code,Name,ICAO,IATA,Location,CountryISO2,Latitude,Longitude,AltitudeFeet',
    'KDTW,Detroit Metropolitan Wayne County Airport,KDTW,DTW,Detroit,US,42.212399,-83.353401,645',
    'KPHL,Philadelphia International Airport,KPHL,PHL,Philadelphia,US,39.871899,-75.241096,36'
  ].join('\n');
  const index = api.buildAirportIndex(csv);
  assert.equal(index.get('DTW').icao,'KDTW');
  assert.equal(index.get('KDTW').iata,'DTW');
  assert.equal(index.get('PHL').city,'Philadelphia');
});

test('position relationship only calls an aircraft approaching when geometry supports it', () => {
  const dtw = {
    code:'KDTW',icao:'KDTW',iata:'DTW',name:'Detroit Metropolitan Wayne County Airport',
    city:'Detroit',country:'US',lat:42.212399,lon:-83.353401
  };
  const approaching = testPlane({
    lat:41.55,lon:-83.72,altitudeFeet:9000,speedKnots:300,verticalRateFpm:-900
  });
  approaching.trackDegrees = api.bearingDegrees(approaching,dtw);
  const relation = api.aircraftAirportRelationship(approaching,dtw,true);
  assert.equal(relation.state,'approaching');
  assert.equal(relation.headingRelation,'toward');
  assert.ok(relation.distanceMiles > 20 && relation.distanceMiles < 100, relation.distanceMiles);

  const crossing = {...approaching,trackDegrees:(approaching.trackDegrees + 90) % 360};
  assert.notEqual(api.aircraftAirportRelationship(crossing,dtw,true).state,'approaching');

  const stale = api.aircraftAirportRelationship(approaching,dtw,false);
  assert.equal(stale,null);
});

test('position relationship recognizes an assigned aircraft on the ground at the departure airport', () => {
  const dtw = {
    code:'KDTW',icao:'KDTW',iata:'DTW',name:'Detroit Metropolitan Wayne County Airport',
    city:'Detroit',country:'US',lat:42.212399,lon:-83.353401
  };
  const ground = testPlane({
    lat:42.209531,lon:-83.34409,onGround:true,altitudeFeet:500,speedKnots:22,
    verticalRateFpm:null,trackDegrees:28
  });
  const relation = api.aircraftAirportRelationship(ground,dtw,true);
  assert.equal(relation.state,'at-airport');
  assert.ok(relation.distanceMiles <= 1, relation.distanceMiles);
});

test('route-missing registration lookup can attach a focus-airport relationship without claiming a route', () => {
  const source = fs.readFileSync(path.join(root,'api','flight-tracker.js'),'utf8');
  assert.match(source, /VRS_AIRPORTS_URL = 'https:\/\/vrs-standing-data\.adsb\.lol\/airports\.csv'/);
  assert.match(source, /const focusAirport = !route && focusAirportCode \? await lookupAirportCoordinates\(focusAirportCode\) : null/);
  assert.match(source, /focusAirportRelationship/);
  assert.match(client, /data\.focusAirportRelationship/);
  assert.match(client, /originMarker = airportMarker\('origin', focus/);
});


test('previous occurrence context preserves a same-tail landed arrival for the turn state', () => {
  const selected = {
    flightNumber:'AA3101',
    tailNumber:'N919NN',
    origin:{iata:'DTW',city:'Detroit'},
    destination:{iata:'DFW',city:'Dallas'},
    flightStatus:{airborne:false,landed:false}
  };
  const landed = {
    flightNumber:'AA3101',
    flightId:'1412663702',
    tailNumber:'N919NN',
    origin:{iata:'DFW',city:'Dallas'},
    destination:{iata:'DTW',city:'Detroit'},
    assignmentState:'landed',
    flightStatus:{airborne:true,landed:true},
    note:'The flight has landed'
  };
  assert.equal(assignmentApi.isMatchingPreviousOccurrence(landed,selected),true);
  assert.equal(assignmentApi.isMatchingPreviousOccurrence({...landed,tailNumber:'N920NN'},selected),false);
  const summary=assignmentApi.previousOccurrenceSummary(landed);
  assert.equal(summary.destination.iata,'DTW');
  assert.equal(summary.flightStatus.landed,true);
  assert.equal(summary.evidence.kind,'same-day-same-flight-same-tail-previous-occurrence');
});

test('landed previous trip overrides stale airborne narrative and becomes the between-flights state', () => {
  assert.match(client, /function landedPreviousAtOrigin\(assignment\)/);
  assert.match(client, /previous\?\.flightStatus\?\.landed !== true/);
  assert.match(client, /sameAirport\(previous\.destination, assignment\?\.origin\)/);
  assert.match(client, /function renderArrivedForTurn\(assignment\)/);
  assert.match(client, /Your plane has arrived in .* and is on the ground/);
  assert.match(client, /completed .* and .*is still assigned to your/s);
  assert.match(client, /On ground · between flights/);
  assert.match(client, /Already at departure airport/);
  assert.match(client, /if \(assignmentData && renderArrivedForTurn\(assignmentData\)\) \{\s*resetHeldLive\(\);\s*return true;/s);
  assert.match(client, /if \(renderArrivedForTurn\(assignment\)\) return;/);
});

test('a grounded live aircraft can never fall through to the generic airborne-style fallback', () => {
  assert.match(client, /if \(live\?\.aircraft\?\.onGround === true && landedPreviousAtOrigin\(assignment\)\)/);
  assert.match(client, /if \(live\?\.aircraft\?\.onGround === true\) \{/);
  assert.match(client, /Your assigned plane is on the ground/);
  assert.match(client, /currently reporting on the ground/);
});


test('live callsign deterministically exposes a marketing flight number for cross-flight lookup', () => {
  assert.equal(api.marketingFlightFromCallsign('AAL2317'),'AA2317');
  assert.equal(api.marketingFlightFromCallsign('DAL2497'),'DL2497');
  assert.equal(api.marketingFlightFromCallsign('SWA1697'),'WN1697');
  assert.equal(api.marketingFlightFromCallsign('ZZZ999'),null);
  const trackerSource = fs.readFileSync(path.join(root,'api','flight-tracker.js'),'utf8');
  assert.match(trackerSource, /operatingFlightNumber:marketingFlightFromCallsign\(aircraft\.callsign\)/);
});

test('cross-flight inbound resolver matches a different operating flight only by tail airborne state and destination', () => {
  assert.match(client, /function operatingOccurrenceMatches\(detail, assignment, live\)/);
  assert.match(client, /clean\(detail\?\.flightNumber\) !== clean\(live\?\.operatingFlightNumber\)/);
  assert.match(client, /clean\(detail\?\.tailNumber\) !== clean\(assignment\?\.tailNumber\)/);
  assert.match(client, /detail\?\.flightStatus\?\.airborne !== true \|\| detail\?\.flightStatus\?\.landed === true/);
  assert.match(client, /!sameAirport\(detail\?\.destination, assignment\?\.origin\)/);
  assert.match(client, /async function resolveOperatingOccurrence\(assignment, live\)/);
  assert.match(client, /operatingFlight === passengerFlight/);
  assert.match(client, /base\?\.status === 'choose-flight'/);
  assert.match(client, /matches\.length === 1/);
});

test('different-flight-number inbound occurrence becomes the traveler-facing current trip', () => {
  assert.match(client, /function crossFlightOccurrenceRoute\(live\)/);
  assert.match(client, /live\?\.confirmedOperatingOccurrence/);
  assert.match(client, /return crossFlightOccurrenceRoute\(live\) \|\| confirmedOccurrenceRoute\(assignment, live\)/);
  assert.match(client, /const operatingOccurrence = await resolveOperatingOccurrence\(assignmentData,data\)/);
  assert.match(client, /data\.confirmedOperatingOccurrence = operatingOccurrence/);
  assert.match(client, /currentOperatingFlight = live\?\.confirmedOperatingOccurrence\?\.flightNumber/);
  assert.match(client, /is currently operating .* from .* to/s);
});


test('ergonomic answer card makes the aircraft chain scannable without adding a dashboard', () => {
  assert.match(html, /id="answer-journey"/);
  assert.match(html, /.answer-journey\{display:grid;grid-template-columns:minmax\(0,1fr\) 22px minmax\(0,1fr\)/);
  assert.match(html, /.journey-label/);
  assert.match(html, /.journey-primary/);
  assert.match(client, /function renderAnswerJourney\(journey\)/);
  assert.match(client, /kicker\.textContent = label/);
  assert.match(client, /arrow\.textContent = '→'/);
  assert.match(client, /makeStep\('NOW', journey\.now\)/);
  assert.match(client, /makeStep\('YOUR FLIGHT', journey\.next, 'is-next'\)/);
});

test('inbound and landed states show NOW to YOUR FLIGHT relationship while ordinary states hide it', () => {
  assert.match(client, /journey:\{\s*now:\{\s*primary:\[currentOperatingFlight \|\| tail,compactRoute/s);
  assert.match(client, /primary:\[assignment\?\.flightNumber,route\]/);
  assert.match(client, /Previous flight landed/);
  assert.match(client, /answerJourney\.hidden = true/);
  assert.match(client, /renderAnswerJourney\(journey\)/);
});

test('ergonomic polish removes duplicate tail registration from answer pills', () => {
  assert.match(client, /const identity = live\?\.aircraft\?\.aircraftTypeName \|\| live\?\.aircraft\?\.aircraftType/);
  assert.match(client, /const pills = \[route, delay, tail, identity\]/);
  assert.doesNotMatch(client, /const identity = aircraftIdentity\(live\?\.aircraft\)/);
});

test('mobile journey strip remains compact at the 390px baseline', () => {
  assert.match(html, /@media \(max-width:520px\)/);
  assert.match(html, /\.answer-journey\{grid-template-columns:minmax\(0,1fr\) 18px minmax\(0,1fr\);gap:6px\}/);
  assert.match(html, /\.journey-primary\{font-size:12\.5px\}/);
  assert.match(html, /\.journey-secondary\{font-size:10px\}/);
});


test('recent-arrival recovery narrows the airport board before checking same-tail details', () => {
  const now = Date.parse('2026-10-07T17:20:00Z');
  const nextData = {
    props:{initialState:{flightTracker:{route:{flights:[
      {
        sortTime:'2026-10-07T16:10:00.000Z',
        carrier:{fs:'AA',flightNumber:'2317'},
        operatedBy:null,
        url:'/flight-tracker/AA/2317?year=2026&month=10&date=7&flightId=1412662791',
        airport:{fs:'SAV',city:'Savannah'}
      },
      {
        sortTime:'2026-10-07T16:15:00.000Z',
        carrier:{fs:'DL',flightNumber:'999'},
        operatedBy:null,
        url:'/flight-tracker/DL/999?year=2026&month=10&date=7&flightId=2',
        airport:{fs:'ATL',city:'Atlanta'}
      },
      {
        sortTime:'2026-10-06T02:00:00.000Z',
        carrier:{fs:'AA',flightNumber:'1'},
        operatedBy:null,
        url:'/flight-tracker/AA/1?year=2026&month=10&date=6&flightId=3',
        airport:{fs:'LAX',city:'Los Angeles'}
      }
    ]}}}}
  };
  const candidates = assignmentApi.recentArrivalCandidates(nextData,{carrier:'AA',airport:'CLT',nowMs:now});
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].flightNumber,'AA2317');
  assert.equal(candidates[0].flightId,'1412662791');
  assert.equal(candidates[0].destination.iata,'CLT');
});

test('recent-arrival recovery validates codes and prefers a current airborne or recent landed same-tail occurrence', () => {
  assert.equal(assignmentApi.normalizeAirportCode(' clt '),'CLT');
  assert.equal(assignmentApi.normalizeAirportCode('!'),null);
  assert.equal(assignmentApi.normalizeCarrierCode('aa'),'AA');
  assert.equal(assignmentApi.normalizeCarrierCode('AAL'),null);
  const now=Date.parse('2026-10-07T17:20:00Z');
  const landed={flightStatus:{landed:true,airborne:true}};
  const airborne={flightStatus:{landed:false,airborne:true}};
  const scheduled={flightStatus:{landed:false,airborne:false}};
  const candidate={sortMs:Date.parse('2026-10-07T16:10:00Z')};
  assert.ok(assignmentApi.recentArrivalMatchScore(airborne,candidate,now) > assignmentApi.recentArrivalMatchScore(landed,candidate,now));
  assert.ok(assignmentApi.recentArrivalMatchScore(landed,candidate,now) > assignmentApi.recentArrivalMatchScore(scheduled,candidate,now));
});

test('no-position recovery checks recent arrivals before falling back to a stale last-known map point', () => {
  assert.match(client, /async function resolveRecentInboundOccurrence\(assignment\)/);
  assert.match(client, /tail:assignment\.tailNumber/);
  assert.match(client, /airport,/);
  assert.match(client, /carrier/);
  assert.match(client, /status !== 'found-inbound-occurrence'/);
  assert.match(client, /async function recoverNoPositionState\(assignment, registration, data\)/);
  assert.match(client, /occurrence\?\.flightStatus\?\.landed === true/);
  assert.match(client, /previousAircraftOccurrence:occurrence/);
  assert.match(client, /renderArrivedForTurn\(assignmentData\)/);
  assert.match(client, /const snapshot = loadLastKnownSnapshot\(registration\)/);
  assert.match(client, /renderLastKnownPosition\(assignment,snapshot\)/);
});

test('last-known aircraft position persists locally but is explicitly stale and bounded', () => {
  assert.match(client, /const LAST_KNOWN_MAX_AGE_MS = 12 \* 60 \* 60 \* 1000/);
  assert.match(client, /const LAST_KNOWN_STORAGE_PREFIX = 'flight-tracker:last-known:'/);
  assert.match(client, /function saveLastKnownSnapshot\(data\)/);
  assert.match(client, /localStorage\.setItem/);
  assert.match(client, /function loadLastKnownSnapshot\(registration\)/);
  assert.match(client, /Date\.now\(\) - parsed\.reportedAt > LAST_KNOWN_MAX_AGE_MS/);
  assert.match(client, /function renderLastKnownPosition\(assignment, snapshot\)/);
  assert.match(client, /This is not a live location/);
  assert.match(client, /LAST CONFIRMED AIRCRAFT POSITION/);
  assert.match(client, /classList\.add\('is-stale'\)/);
  assert.match(client, /classList\.remove\('is-stale'\)/);
  assert.match(html, /\.plane-marker\.is-stale\{opacity:\.55;border-style:dashed\}/);
});

test('flight page loads the last-known recovery client asset', () => {
  assert.match(html, /flight-tracker\.js\?v=20261007m/);
});
