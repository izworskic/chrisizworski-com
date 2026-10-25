/* What to Plant Now in Michigan: the engine.
 *
 * Every status comes from a cited Michigan rule applied to the visitor's nearest frost station.
 * Where no Michigan source gives a rule, the field is NOT REPORTED and the crop says so. Nothing is
 * interpolated between stations, borrowed from another state, or smoothed. One reading is the
 * site's own and is disclosed wherever it is used: MSU's "after the danger of frost is past" is
 * taken as the station's cautious date, after which only 1 spring in 4 still freezes.
 *
 * Requires garden-kit.js (dates), michigan-frost.js (stations) and michigan-places.js (locations).
 * Also loaded in Node by lib/plant-now/index.js.
 */
(function (root) {
  'use strict';
  var K = root.GardenKit, F = root.MIFrost, P = root.MIPlaces;

  var SOURCES = {
    msuPlant: { title: 'How to Plant Vegetables', who: 'MSU Extension (L. Taylor; adapted G. Voyle; revised K. Hahn, L. Whitlock, M. Wilson)', date: 'updated April 29, 2009', url: 'https://www.canr.msu.edu/uploads/resources/pdfs/plantingveg.pdf' },
    msuTomato: { title: 'Tips for growing tomatoes in your home garden', who: 'Kendra Wills, MSU Extension', date: 'May 17, 2022', url: 'https://www.canr.msu.edu/news/tips_for_growing_tomatoes_in_your_home_garden' },
    msuFrost: { title: 'Freeze probabilities for 78 Michigan stations', who: 'Michigan State Climatologist Office, via MSU Extension', date: 'as published on /michigan-frost-dates/', url: 'https://www.canr.msu.edu/resources/frost-free-dates' },
    noaaFall: { title: 'Typical first fall frost, 1991 to 2020 climate normals', who: 'NOAA, as published on /michigan-frost-dates/ for 42 places', date: '1991 to 2020', url: 'https://chrisizworski.com/michigan-frost-dates/' }
  };
  // The MSU sentences each rule rests on, quoted so the page can show them.
  var RULES = {
    hardy: { source: 'msuPlant', quote: 'Some cool season vegetables such as onions, peas and spinach, are very hardy and can be planted as soon as the ground can be worked in the spring. This is usually late March or early April in southern Michigan and one to three weeks later further north.' },
    afterFrost: { source: 'msuPlant', quote: 'Warm season vegetables ... will be killed by frost. They cannot be safely planted outdoors until the danger of frost is past.' },
    soil60: { source: 'msuPlant', quote: 'Seeds of warm season crops germinate poorly in cool soil ... will not germinate well unless the soil temperature at planting depth exceeds 60°F.' },
    soil40: { source: 'msuPlant', quote: 'Beets, carrots, radishes and turnips, on the other hand, will germinate at a minimum of 40°F.' },
    indoor: { source: 'msuPlant', quote: 'Start your seeds ... about six to eight weeks before you want to move plants to the garden.' },
    harden: { source: 'msuPlant', quote: 'Allow a short transition period (also known as hardening off) outdoors for seven to 10 days before planting.' },
    succession: { source: 'msuPlant', quote: 'Three or four small plantings of corn, beans and lettuce two weeks apart will be better than a single large planting.' },
    memorial: { source: 'msuTomato', quote: 'Many Michigan gardeners set out tomato transplants around Memorial Day, at the end of May.' }
  };

  // Places with a published first fall frost (the 42 rows of the fall table on /michigan-frost-dates/).
  var FALL_PUBLISHED = ['alpena', 'ann-arbor', 'bad-axe', 'battle-creek', 'bay-city', 'big-rapids', 'cadillac', 'cheboygan', 'detroit-city', 'detroit-metro', 'east-tawas', 'escanaba', 'flint', 'gladwin', 'grand-haven', 'grand-rapids', 'grayling', 'holland', 'houghton', 'houghton-lake', 'iron-mountain', 'ironwood', 'jackson', 'kalamazoo', 'lansing', 'ludington', 'marquette-wso', 'midland', 'monroe', 'mt-clemens', 'mt-pleasant', 'munising', 'muskegon', 'newberry', 'pontiac', 'port-huron', 'saginaw', 'sault-ste-marie', 'south-haven', 'traverse-city', 'vanderbilt', 'west-branch'];

  /* Crops. kind: transplant (start indoors, harden off, plant out after frost), warmSow (sow outside
   * after frost in soil above 60 F), hardy (as soon as the ground can be worked), soil40 (sow once the
   * soil is 40 F), none (no Michigan rule found). */
  var CROPS = [
    { id: 'tomatoes', name: 'Tomatoes', kind: 'transplant', tender: true, extra: ['memorial'] },
    { id: 'peppers', name: 'Peppers', kind: 'transplant', tender: true },
    { id: 'cucumbers', name: 'Cucumbers', kind: 'warmSow', tender: true },
    { id: 'squash', name: 'Squash', kind: 'warmSow', tender: true },
    { id: 'beans', name: 'Snap beans', kind: 'warmSow', tender: true, succession: true },
    { id: 'peas', name: 'Peas', kind: 'hardy' },
    { id: 'spinach', name: 'Spinach', kind: 'hardy' },
    { id: 'onions', name: 'Onions', kind: 'hardy' },
    { id: 'carrots', name: 'Carrots', kind: 'soil40' },
    { id: 'beets', name: 'Beets', kind: 'soil40' },
    { id: 'radishes', name: 'Radishes', kind: 'soil40' },
    { id: 'lettuce', name: 'Lettuce and greens', kind: 'none', succession: true, why: 'MSU names lettuce a cool-season crop and says to sow it in plantings two weeks apart, but gives no spring starting rule for it.' },
    { id: 'potatoes', name: 'Potatoes', kind: 'none', why: 'No current MSU planting rule for potatoes was found. The only dated one is a 1985 bulletin marked not for current use.' },
    { id: 'garlic', name: 'Garlic', kind: 'none', why: 'MSU publishes fall garlic articles, but they could not be read for this tool yet, and the 1985 bulletin disagrees with them.' },
    { id: 'basil', name: 'Basil', kind: 'none', why: 'No Michigan extension source with basil timing was found.' },
    { id: 'cilantro', name: 'Cilantro', kind: 'none', why: 'No Michigan extension source with cilantro timing was found.' }
  ];

  var STATUS = {
    START_INDOORS: 'Start indoors now', HARDEN_OFF: 'Harden off now', TRANSPLANT: 'Transplant now', PLANT: 'Plant now',
    READY_WHEN: 'Plant when the soil is ready', WAIT: 'Wait', WAIT_SOIL: 'Wait for the soil', DONE: 'Done for the season',
    NEXT_SPRING: 'Next spring', NOT_REPORTED: 'Not reported'
  };

  // ---------- place and date ----------
  function miles(a, b) { var R = 3958.8, toR = Math.PI / 180, dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR; var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  function nearestStation(pt) {
    var best = null;
    F.STATIONS.forEach(function (st) { var q = P.STATION_POINTS[st.s]; if (!q) return; var d = miles(pt, q); if (!best || d < best.miles) best = { station: st, miles: d }; });
    return best;
  }
  // A place is a ZIP, a station slug, or a Michigan town name.
  function locate(input) {
    var q = String(input || '').trim();
    if (/^\d{5}$/.test(q)) { var z = P.ZIPS.filter(function (r) { return r[0] === q; })[0]; if (!z) return null; var n = nearestStation([z[1], z[2]]); return { label: z[3] + ' ' + z[0], zip: z[0], station: n.station, miles: n.miles }; }
    var st = F.station(q); if (st) return { label: st.n, station: st, miles: 0 };
    var key = q.toLowerCase().replace(/^st\.? /, 'saint ').replace(/^mt\.? /, 'mount ');
    var hits = P.ZIPS.filter(function (r) { return r[3].toLowerCase() === key; });
    if (!hits.length) { var sts = F.STATIONS.filter(function (x) { return x.n.toLowerCase() === q.toLowerCase(); }); return sts.length ? { label: sts[0].n, station: sts[0], miles: 0 } : null; }
    var lat = 0, lon = 0; hits.forEach(function (r) { lat += r[1]; lon += r[2]; }); var c = [lat / hits.length, lon / hits.length], nn = nearestStation(c);
    return { label: hits[0][3], station: nn.station, miles: nn.miles };
  }
  function towns() { var seen = {}, out = []; P.ZIPS.forEach(function (r) { if (!seen[r[3]]) { seen[r[3]] = 1; out.push(r[3]); } }); return out.sort(); }
  // Today in Michigan, whatever the visitor's clock says. An ISO override (YYYY-MM-DD) is for links and tests.
  function detroitToday(override) {
    if (override && K.fromISO(override) !== null) return { iso: override, day: K.fromISO(override) };
    var iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return { iso: iso, day: K.fromISO(iso) };
  }

  // ---------- statuses ----------
  function frostOf(st) {
    var cautious = K.parse(st.p25), fallOk = FALL_PUBLISHED.indexOf(st.s) >= 0;
    return { median: K.parse(st.p50), cautious: cautious, latest: K.parse(st.lx), fall: fallOk ? K.parse(st.ff) : null, fallText: fallOk ? st.ff : null };
  }
  function soonWords(n) { return n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; }
  /* Every rule used here is a spring planting rule (MSU's fall guidance is general: plan the fall garden
   * July through September). After July 31 the tool stops presenting spring rules as current and shows
   * next spring's dates instead. That date is a presentation boundary, not a planting deadline. */
  var SPRING_END = K.parse('Jul 31');

  function cropStatus(crop, st, d, cond) {
    cond = cond || {};
    var fr = frostOf(st), soil = typeof cond.soilF === 'number' && isFinite(cond.soilF) ? cond.soilF : null, out = { crop: crop, rules: [], windows: [], notes: [] };
    var afterFall = fr.fall !== null && d > fr.fall;
    function set(code, title, detail) { out.code = code; out.status = STATUS[code]; out.title = title; out.detail = detail; return out; }
    if (crop.kind === 'none') { out.rules = []; return set('NOT_REPORTED', crop.name + ': not reported', crop.why); }
    if (crop.kind === 'transplant') {
      var open = fr.cautious, inF = open - 56, inT = open - 42, hF = open - 10, hT = open - 1;
      out.rules = ['indoor', 'harden', 'afterFrost'].concat(crop.extra || []);
      out.windows = [{ kind: 'indoor', from: inF, to: inT }, { kind: 'harden', from: hF, to: hT }, { kind: 'transplant', from: open, to: null }];
      if (crop.extra && crop.extra.indexOf('memorial') >= 0) out.notes.push('MSU Extension notes many Michigan gardeners set tomatoes out around Memorial Day.');
      if (afterFall) return set('DONE', crop.name + ': done for the season', 'Frost kills them, and the typical first fall frost here is ' + fr.fallText + '.');
      if (d > SPRING_END) return set('NEXT_SPRING', crop.name + ': next spring', 'Start seeds indoors ' + K.range(inF, inT) + ' and plant out from ' + K.fmt(open) + '.' + (fr.fall !== null ? ' Plants already in the ground keep going until the first fall frost, around ' + fr.fallText + '.' : ''));
      if (d < inF) return set('WAIT', 'Start ' + crop.name.toLowerCase() + ' indoors ' + K.range(inF, inT), 'Six to eight weeks before they go out on ' + K.fmt(open) + '. Seed starting opens ' + soonWords(inF - d) + '.');
      if (d <= inT) return set('START_INDOORS', 'Start ' + crop.name.toLowerCase() + ' indoors now', 'Window ' + K.range(inF, inT) + ', six to eight weeks before planting out on ' + K.fmt(open) + '.');
      if (d < hF) return set('WAIT', 'Grow ' + crop.name.toLowerCase() + ' on under lights', 'Harden them off from ' + K.fmt(hF) + ' (' + soonWords(hF - d) + ') and plant out from ' + K.fmt(open) + '.');
      if (d < open) return set('HARDEN_OFF', 'Harden off ' + crop.name.toLowerCase() + ' now', 'Seven to ten days outside before planting out on ' + K.fmt(open) + '.');
      return set('TRANSPLANT', 'Plant ' + crop.name.toLowerCase() + ' out' + (d - open > 28 ? ' (window open since ' + K.fmt(open) + ')' : ''), 'The danger of frost is past here from ' + K.fmt(open) + ' (only 1 spring in 4 freezes later; the latest on record was ' + st.lx + '). MSU gives no last planting date' + (fr.fall !== null ? '; count the days to maturity on your packet back from the first fall frost, ' + fr.fallText + '.' : '.'));
    }
    if (crop.kind === 'warmSow') {
      var o = fr.cautious;
      out.rules = ['afterFrost', 'soil60'].concat(crop.succession ? ['succession'] : []);
      out.windows = [{ kind: 'sow', from: o, to: null }];
      if (crop.succession) out.notes.push('Sow again every two weeks for a longer harvest.');
      if (afterFall) return set('DONE', crop.name + ': done for the season', 'Frost kills them, and the typical first fall frost here is ' + fr.fallText + '.');
      if (d > SPRING_END) return set('NEXT_SPRING', crop.name + ': next spring', 'Sow outside from ' + K.fmt(o) + ', once the soil is above 60°F.' + (fr.fall !== null ? ' Plants already growing keep going until the first fall frost, around ' + fr.fallText + '.' : ''));
      if (d < o) return set('WAIT', 'Sow ' + crop.name.toLowerCase() + ' outside from ' + K.fmt(o), 'After the danger of frost, ' + soonWords(o - d) + ', once the soil at planting depth is above 60°F.');
      if (soil !== null && soil < 60) return set('WAIT_SOIL', 'Wait for warmer soil for ' + crop.name.toLowerCase(), soil + '°F is too cold: the seed germinates poorly below 60°F and can rot.');
      return set('PLANT', 'Sow ' + crop.name.toLowerCase() + ' outside', (soil !== null ? 'Soil at ' + soil + '°F and past the danger of frost (' + K.fmt(o) + '). ' : 'Past the danger of frost (' + K.fmt(o) + '). Check that the soil at planting depth is above 60°F. ') + 'MSU gives no last sowing date' + (fr.fall !== null ? '; frost usually arrives around ' + fr.fallText + '.' : '.'));
    }
    if (crop.kind === 'hardy') {
      out.rules = ['hardy'];
      out.windows = [{ kind: 'sow', condition: 'workable' }];
      if (d > SPRING_END) return set('NEXT_SPRING', crop.name + ': next spring', 'Plant as soon as the ground can be worked in spring: usually late March or early April in southern Michigan, one to three weeks later farther north.');
      if (cond.workable === true) return set('PLANT', 'Plant ' + crop.name.toLowerCase(), 'You can work the soil, and ' + crop.name.toLowerCase() + ' are very hardy.');
      if (cond.workable === false) return set('WAIT_SOIL', 'Wait until the ground can be worked', 'Wet or frozen soil first has to crumble in your hand.');
      return set('READY_WHEN', 'Plant ' + crop.name.toLowerCase() + ' as soon as the ground can be worked', 'Usually late March or early April in southern Michigan, one to three weeks later farther north.');
    }
    if (crop.kind === 'soil40') {
      out.rules = ['soil40'];
      out.windows = [{ kind: 'sow', condition: 'soil40' }];
      if (afterFall || d > SPRING_END) return set('NEXT_SPRING', crop.name + ': next spring', 'Sow once the soil at planting depth reaches 40°F.');
      if (soil !== null && soil < 40) return set('WAIT_SOIL', 'Wait for 40°F soil', soil + '°F is below the 40°F the seed needs to germinate.');
      if (soil !== null) return set('PLANT', 'Sow ' + crop.name.toLowerCase(), 'Soil at ' + soil + '°F; the seed germinates from 40°F.');
      return set('READY_WHEN', 'Sow ' + crop.name.toLowerCase() + ' once the soil is 40°F', 'The seed germinates at a minimum of 40°F at planting depth.');
    }
    return set('NOT_REPORTED', crop.name + ': not reported', 'No rule.');
  }

  var RANK = { START_INDOORS: 0, HARDEN_OFF: 1, TRANSPLANT: 2, PLANT: 2, READY_WHEN: 4, WAIT_SOIL: 5, WAIT: 6, DONE: 8, NEXT_SPRING: 8, NOT_REPORTED: 9 };
  /* The whole answer: a ranked "do this week" list, then every crop. Windows that opened more than
   * four weeks ago stay in the table but drop off the weekly list, so it shows what is new. */
  function plan(st, d, cond) {
    var all = CROPS.map(function (c) { return cropStatus(c, st, d, cond); });
    var fr = frostOf(st);
    function age(r) { var w = r.windows.filter(function (x) { return x.kind === 'transplant' || x.kind === 'sow'; })[0]; return w && typeof w.from === 'number' ? d - w.from : 0; }
    var week = all.filter(function (r) {
      if (r.code === 'START_INDOORS' || r.code === 'HARDEN_OFF') return true;
      if (r.code === 'TRANSPLANT' || r.code === 'PLANT') return age(r) <= 28 || r.crop.kind === 'hardy' || r.crop.kind === 'soil40';
      if (r.code === 'READY_WHEN' || r.code === 'WAIT_SOIL') return true;
      if (r.code === 'WAIT') { var w = r.windows.filter(function (x) { return typeof x.from === 'number' && x.from >= d; })[0]; return w && w.from - d <= 21; }
      return false;
    }).sort(function (a, b) { return RANK[a.code] - RANK[b.code] || a.crop.name.localeCompare(b.crop.name); });
    return { station: st, day: d, frost: fr, week: week, crops: all.slice().sort(function (a, b) { return RANK[a.code] - RANK[b.code] || CROPS.indexOf(a.crop) - CROPS.indexOf(b.crop); }) };
  }

  // When nothing is current, the next dated window anywhere in the year.
  function nextUp(st, d) {
    var fr = frostOf(st), best = null;
    CROPS.forEach(function (c) { if (c.kind !== 'transplant' && c.kind !== 'warmSow') return; var from = c.kind === 'transplant' ? fr.cautious - 56 : fr.cautious; var n = ((from - d) % 365 + 365) % 365; if (!best || n < best.inDays) best = { crop: c, from: from, inDays: n, what: c.kind === 'transplant' ? 'start ' + c.name.toLowerCase() + ' indoors' : 'sow ' + c.name.toLowerCase() + ' outside' }; });
    return best;
  }
  var api = { SOURCES: SOURCES, RULES: RULES, CROPS: CROPS, STATUS: STATUS, FALL_PUBLISHED: FALL_PUBLISHED, locate: locate, towns: towns, nearestStation: nearestStation, detroitToday: detroitToday, cropStatus: cropStatus, plan: plan, nextUp: nextUp, frostOf: frostOf, miles: miles };
  root.PlantNow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
