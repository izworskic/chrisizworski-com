from pathlib import Path
import re

api = Path('api/kilauea-live.js')
s = api.read_text()
s = s.replace(
    "const NPS_ALERTS_URL = 'https://developer.nps.gov/api/v1/alerts?parkCode=havo&limit=50';",
    "const NPS_ALERTS_URL = 'https://developer.nps.gov/api/v1/alerts?parkCode=havo&limit=50';\nconst NPS_SITE_ALERTS_URL = 'https://www.nps.gov/havo/park-alerts-havo.json';"
)
s = s.replace(
    "const HAWAII_DOH_AIR_URL = 'https://air.doh.hawaii.gov/home/text/118';",
    "const HAWAII_DOH_AIR_URL = 'https://air.doh.hawaii.gov/HawaiiSO2/';"
)

nps = r'''function npsAlertIsCurrent(alert, now = new Date()) {
  if (!alert || alert.is_active === 0 || alert.is_active === false) return false;
  const start = alert.start_date ? new Date(alert.start_date) : null;
  const end = alert.end_date ? new Date(alert.end_date) : null;
  if (start && !Number.isNaN(start.getTime()) && start.getTime() > now.getTime()) return false;
  if (end && !Number.isNaN(end.getTime())) {
    end.setHours(23, 59, 59, 999);
    if (end.getTime() < now.getTime()) return false;
  }
  return true;
}

async function loadNps() {
  const fetchedAt = nowIso();
  let conditions = '';
  let viewing = '';
  const errors = [];

  try {
    const [conditionsResponse, viewingResponse] = await Promise.all([
      fetchWithTimeout(NPS_CONDITIONS_URL, { headers: { Accept: 'text/html' } }),
      fetchWithTimeout(NPS_VIEWING_URL, { headers: { Accept: 'text/html' } })
    ]);
    conditions = cleanText(await conditionsResponse.text()).slice(0, 60000);
    viewing = cleanText(await viewingResponse.text()).slice(0, 40000);
  } catch (err) {
    errors.push(`NPS pages: ${err.message}`);
  }

  let alerts = [];
  let alertFeedVerified = false;
  let alertFeed = null;

  try {
    const response = await fetchWithTimeout(NPS_SITE_ALERTS_URL, { headers: { Accept: 'application/json' } });
    const json = await response.json();
    if (!Array.isArray(json)) throw new Error('park alert feed was not an array');
    alerts = json.filter(a => npsAlertIsCurrent(a));
    alertFeedVerified = true;
    alertFeed = 'park-site';
  } catch (err) {
    errors.push(`NPS park alert feed: ${err.message}`);
  }

  if (!alertFeedVerified && process.env.NPS_API_KEY) {
    try {
      const response = await fetchWithTimeout(NPS_ALERTS_URL, { headers: { Accept: 'application/json', 'X-Api-Key': process.env.NPS_API_KEY } });
      const json = await response.json();
      if (!Array.isArray(json?.data)) throw new Error('alerts response missing data array');
      alerts = json.data;
      alertFeedVerified = true;
      alertFeed = 'developer-api';
    } catch (err) {
      errors.push(`NPS alerts API: ${err.message}`);
    }
  }

  const closureAlerts = alerts.filter(a => /closure/i.test(String(a?.category || '')));
  const alertText = closureAlerts.map(a => `${a?.title || ''} ${a?.description || ''}`).join(' ');
  const explicitParkClosed = parkWideClosure(alertText) || parkWideClosure(conditions);
  const closedViewpoints = [];
  const closureCorpus = `${alertText} ${conditions}`;
  if (localClosureWindow(closureCorpus, 'Uēkahuna')) closedViewpoints.push('uekahuna');
  if (localClosureWindow(closureCorpus, 'Kīlauea Overlook')) closedViewpoints.push('kilauea-overlook');
  if (localClosureWindow(closureCorpus, 'Keanakākoʻi')) closedViewpoints.push('keanakakoi');

  const webpageLoaded = conditions.length > 100 && /current conditions|national park service|hawai.?i volcanoes national park/i.test(conditions);
  const closureUnknown = !explicitParkClosed && !alertFeedVerified;
  const sourceStatus = alertFeedVerified ? 'ok' : webpageLoaded ? 'degraded' : 'offline';
  const note = alertFeed === 'park-site'
    ? 'Current HAVO park-alert JSON checked directly from NPS.gov; this is the alert feed rendered by the official Alerts & Conditions page.'
    : alertFeed === 'developer-api'
      ? 'Current NPS alerts API checked. The developer API can lag park-site alert changes by roughly two hours.'
      : webpageLoaded
        ? `NPS current-conditions page loaded, but the live alert feed could not be verified; access is treated as unconfirmed. ${errors.join(' ')}`
        : `NPS access could not be verified. ${errors.join(' ')}`;

  return {
    source: { name: 'National Park Service', status: sourceStatus, fetchedAt, observedAt: null, url: NPS_CONDITIONS_URL, note },
    access: {
      parkClosed: explicitParkClosed,
      closureUnknown,
      closureReason: explicitParkClosed ? 'National Park Service information indicates a park-wide closure. Follow NPS instructions before travel.' : null,
      closedViewpoints: [...new Set(closedViewpoints)],
      activeClosureAlerts: closureAlerts.map(a => ({ title:a?.title || null, category:a?.category || null, url:a?.url || null })).slice(0, 12),
      conditionsText: conditions.slice(0, 9000),
      viewingText: viewing.slice(0, 9000)
    }
  };
}
'''
s, count = re.subn(r'async function loadNps\(\) \{[\s\S]*?\n\}\n\nasync function loadWeather', nps + '\nasync function loadWeather', s, count=1)
assert count == 1, 'loadNps replacement failed'

air = r'''function parseHawaiiSo2Timestamp(value) {
  const m = String(value || '').match(/^(20\d{2})\/(\d{2})\/(\d{2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]) + 10, Number(m[5]))).toISOString();
}

function parseDohSo2Html(raw) {
  const match = String(raw || '').match(/var\s+Data\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  let stations;
  try { stations = JSON.parse(match[1]); } catch { return []; }
  if (!Array.isArray(stations)) return [];
  return stations.flatMap(station => {
    if (!station || station.Active === 0 || station.display === false) return [];
    const monitor = asArray(station.monitors).find(m => /SO2/i.test(String(m?.Pollutantname || m?.name || '')) && String(m?.unit || '').toLowerCase() === 'ppm');
    if (!monitor) return [];
    const rawValue = String(monitor.value ?? '').trim();
    const valuePpm = rawValue === '' ? null : Number(rawValue);
    const rawIndex = monitor.indexVal ?? station.IndexValue;
    const advisoryIndex = rawIndex == null || String(rawIndex).trim() === '' ? null : Number(rawIndex);
    return [{
      station: monitor.stationName || station.name || 'Unknown station',
      valuePpm: Number.isFinite(valuePpm) ? valuePpm : null,
      advisoryIndex: Number.isFinite(advisoryIndex) ? advisoryIndex : null,
      airQuality: monitor.indexName || station.IndexName || 'No Index',
      observedAt: parseHawaiiSo2Timestamp(station.DateVal),
      latitude: Number.isFinite(Number(station.latitude)) ? Number(station.latitude) : null,
      longitude: Number.isFinite(Number(station.longitude)) ? Number(station.longitude) : null
    }];
  });
}

async function loadAir() {
  const fetchedAt = nowIso();
  try {
    const response = await fetchWithTimeout(HAWAII_DOH_AIR_URL, { headers: { Accept: 'text/html' } }, 3000);
    const raw = await response.text();
    const readings = parseDohSo2Html(raw);
    const numeric = readings.filter(r => r.valuePpm != null && r.observedAt);
    const observedAt = numeric.map(r => r.observedAt).sort().at(-1) || null;
    const ageMs = observedAt ? Date.now() - new Date(observedAt).getTime() : Infinity;
    const fresh = numeric.length >= 3 && ageMs >= -15 * 60 * 1000 && ageMs <= 2 * 60 * 60 * 1000;
    const ranked = [...numeric].sort((a,b) => (b.advisoryIndex ?? -1) - (a.advisoryIndex ?? -1) || (b.valuePpm ?? -1) - (a.valuePpm ?? -1));
    const worst = ranked[0] || null;
    const advisoryDetected = numeric.some(r => (r.advisoryIndex ?? 0) >= 101 || /unhealthy|hazardous/i.test(String(r.airQuality || '')));
    const elevatedDetected = numeric.some(r => (r.advisoryIndex ?? 0) >= 51 || /moderate|unhealthy|hazardous/i.test(String(r.airQuality || '')));
    const status = fresh ? 'ok' : readings.length ? 'degraded' : 'offline';
    const note = fresh
      ? 'Current 15-minute Hawaiʻi Island SO₂ station table parsed from Hawaiʻi DOH. Regional exposure context; not a summit-crater gas measurement.'
      : readings.length
        ? 'Hawaiʻi DOH SO₂ station data parsed, but too few current numeric readings or the newest station timestamp is older than two hours.'
        : 'Hawaiʻi DOH page loaded, but its current SO₂ station table could not be parsed.';
    return {
      source: { name: 'Hawaiʻi DOH short-term SO₂ network', status, fetchedAt, observedAt, url: HAWAII_DOH_AIR_URL, note },
      air: {
        advisoryDetected,
        elevatedDetected,
        numericVerified: numeric.length >= 3,
        readings: numeric,
        worst,
        text: numeric.slice(0, 9).map(r => `${r.station}: ${r.valuePpm} ppm (${r.airQuality})`).join('; ')
      }
    };
  } catch (err) {
    return { source: { name: 'Hawaiʻi DOH short-term SO₂ network', status: 'offline', fetchedAt, observedAt: null, url: HAWAII_DOH_AIR_URL, note: err.message }, air: { advisoryDetected: false, elevatedDetected: false, numericVerified: false, readings: [], worst: null } };
  }
}
'''
s, count = re.subn(r'async function loadAir\(\) \{[\s\S]*?\n\}\n\nfunction profileFromQuery', air + '\nfunction profileFromQuery', s, count=1)
assert count == 1, 'loadAir replacement failed'
api.write_text(s)

page = Path('public/labs/kilauea-live/index.html')
h = page.read_text()
old = """    if(d.access?.closureUnknown) hurting.push('NPS access status could not be confirmed.');
    if(d.sources?.air?.status!=='ok') hurting.push('A stable machine-readable summit SO₂ reading is not yet verified in this build.');"""
new = """    if(d.access?.closureUnknown) hurting.push('NPS access status could not be confirmed.');
    if(d.air?.advisoryDetected) hurting.push(`Hawaiʻi DOH reports an unhealthy short-term SO₂ signal${d.air?.worst?.station?` at ${d.air.worst.station}`:''}.`);
    else if(d.sources?.air?.status==='ok') helping.push('Hawaiʻi DOH’s short-term SO₂ network is current with no unhealthy advisory signal across reporting stations.');
    else hurting.push('Hawaiʻi DOH short-term SO₂ network is stale or unavailable.');"""
assert old in h, 'frontend air language target missing'
page.write_text(h.replace(old, new))

tests = Path('tests/kilauea-live.test.js')
t = tests.read_text()
install = r'''function hawaiiNowStamp() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'Pacific/Honolulu',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(Date.now() - 10 * 60 * 1000)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

function dohFixture() {
  const stamp = hawaiiNowStamp();
  const station=(name,value,indexVal,indexName)=>({name,Active:1,display:true,DateVal:stamp,latitude:'19.5',longitude:'-155.1',monitors:[{name:'SO2',Pollutantname:'SO2',unit:'ppm',value:String(value),stationName:name,indexVal,indexName,Active:1}]});
  return `<html><script>var Data=${JSON.stringify([station('Hilo',0.001,0,'Good'),station('Kona',0.002,1,'Good'),station('Pahala',0.015,20,'Good')])};</script></html>`;
}

function installOfficialFetch({dailyText,messageText}) {
  const originalFetch = global.fetch;
  const originalKey = process.env.NPS_API_KEY;
  delete process.env.NPS_API_KEY;
  global.fetch = async (url) => {
    url=String(url);
    if (url.includes('/volcano-updates/volcano-messages')) return fakeResponse(`<main>${messageText}</main>`);
    if (url.endsWith('/volcano-updates')) return fakeResponse(`<main>${dailyText}</main>`);
    if (url.includes('/havo/park-alerts-havo.json')) return fakeResponse([{site_code:'havo',is_active:1,category:'Danger',title:'Kīlauea eruption',description:'Volcanic eruptions can be hazardous. Stay out of closed areas and monitor air quality.',url:'https://www.nps.gov/havo/planyourvisit/lava2.htm'}], true);
    if (url.includes('developer.nps.gov/api/v1/alerts')) throw new Error('developer API fallback should not be needed when NPS park alert feed is healthy');
    if (url.includes('/planyourvisit/conditions.htm')) return fakeResponse('<main>National Park Service Current Conditions for Hawaiʻi Volcanoes National Park. Visitors should check official alerts before travel.</main>');
    if (url.includes('/planyourvisit/eruption-viewing.htm')) return fakeResponse('<main>National Park Service eruption viewing information.</main>');
    if (url.includes('api.weather.gov/points/')) return fakeResponse({properties:{forecastHourly:'https://api.weather.gov/gridpoints/HFO/1,1/forecast/hourly'}}, true);
    if (url.includes('/forecast/hourly')) return fakeResponse({properties:{updateTime:new Date().toISOString(),periods:[{number:1,startTime:new Date(Date.now()-5*60*1000).toISOString(),endTime:new Date(Date.now()+55*60*1000).toISOString(),temperature:61,temperatureUnit:'F',probabilityOfPrecipitation:{value:60},windSpeed:'8 mph',windDirection:'NE',shortForecast:'Rain Showers and Fog',isDaytime:true},{number:2,startTime:new Date(Date.now()+60*60*1000).toISOString(),endTime:new Date(Date.now()+2*60*60*1000).toISOString(),temperature:60,temperatureUnit:'F',probabilityOfPrecipitation:{value:10},windSpeed:'6 mph',windDirection:'NE',shortForecast:'Partly Cloudy',isDaytime:true}]}}, true);
    if (url.includes('air.doh.hawaii.gov/HawaiiSO2/')) return fakeResponse(dohFixture());
    if (url.includes('hans-public')) return fakeResponse({notice:'fallback should not be needed',sent:new Date().toISOString()}, true);
    throw new Error('unexpected URL '+url);
  };
  return () => {
    global.fetch = originalFetch;
    if (originalKey == null) delete process.env.NPS_API_KEY;
    else process.env.NPS_API_KEY = originalKey;
  };
}
'''
t, count = re.subn(r'function installOfficialFetch\(\{dailyText,messageText\}\) \{[\s\S]*?\n\}\n\ntest\(\'live API synthesizes', install + "\ntest('live API synthesizes", t, count=1)
assert count == 1, 'test fetch fixture replacement failed'
needle = """  assert.equal(payload.sources.nps.status,'ok');
  assert.match(payload.sources.hvo.note,/short message controls current activity/i);"""
replacement = """  assert.equal(payload.sources.nps.status,'ok');
  assert.equal(payload.sources.air.status,'ok');
  assert.equal(payload.air.numericVerified,true);
  assert.equal(payload.air.readings.length,3);
  assert.equal(payload.sourceHealth,'ok');
  assert.match(payload.sources.nps.note,/park-alert JSON checked directly/i);
  assert.match(payload.sources.air.note,/15-minute Hawaiʻi Island SO₂ station table/i);
  assert.match(payload.sources.hvo.note,/short message controls current activity/i);"""
assert needle in t, 'API assertion insertion target missing'
tests.write_text(t.replace(needle, replacement))
