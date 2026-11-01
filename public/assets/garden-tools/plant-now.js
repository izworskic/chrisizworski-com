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
    msuDill: { title: 'Native Plant Facts: Dill', who: 'MSU Extension', date: 'plant facts', url: 'https://www.canr.msu.edu/nativeplants/uploads/files/Dill2013.pdf' },
    msuCorn: { title: 'How to grow sweet corn', who: 'MSU Extension', date: 'home garden guide', url: 'https://www.canr.msu.edu/uploads/resources/pdfs/sweetcorn2011.pdf' },
    msuBasil: { title: 'Herbs, Michigan Organic Vegetable Production Guide', who: 'Michigan State University', date: 'production guide', url: 'https://www.canr.msu.edu/foodsystems/uploads/files/full-pdf.pdf' },
    msuPotato: { title: 'Planting and Harvesting of Potatoes in Your Garden', who: 'MSU Potato Breeding and Genetics Program', date: 'home garden guide', url: 'https://www.canr.msu.edu/potatobg/Files/Potato-Home-Gardening/Grow%20Potato%20MSU_2pager.pdf' },
    msuPlant: { title: 'How to Plant Vegetables', who: 'MSU Extension (L. Taylor; adapted G. Voyle; revised K. Hahn, L. Whitlock, M. Wilson)', date: 'updated April 29, 2009', url: 'https://www.canr.msu.edu/uploads/resources/pdfs/plantingveg.pdf' },
    msuFall: { title: 'Fall Vegetable Crops for Your Garden', who: 'MSU Extension', date: 'May 2012', url: 'https://www.canr.msu.edu/uploads/files/E3172_-_Fall_Vegetable_Crops_for_your_Garden.pdf' },
    msuGarlic: { title: 'Organic Garlic Production', who: 'MSU Extension', date: '2018', url: 'https://www.canr.msu.edu/uploads/resources/pdfs/e3371_wcag_2.08.pdf' },
    msuTomato: { title: 'Tips for growing tomatoes in your home garden', who: 'Kendra Wills, MSU Extension', date: 'May 17, 2022', url: 'https://www.canr.msu.edu/news/tips_for_growing_tomatoes_in_your_home_garden' },
    msuFrost: { title: 'Freeze probabilities for 78 Michigan stations', who: 'Michigan State Climatologist Office, via MSU Extension', date: 'as published on /michigan-frost-dates/', url: 'https://www.canr.msu.edu/resources/frost-free-dates' },
    noaaFall: { title: 'Typical first fall frost, 1991 to 2020 climate normals', who: 'NOAA, as published on /michigan-frost-dates/ for 42 places', date: '1991 to 2020', url: 'https://chrisizworski.com/michigan-frost-dates/' }
  };
  // The MSU sentences each rule rests on, quoted so the page can show them.
  var RULES = {
    dillFrost: { source: 'msuDill', quote: 'Sow dill seeds where they will be grown about the time of the last expected frost.' },
    cilantroCool: { source: 'msuBasil', quote: 'This annual plant does best in cool weather and should be planted in the early spring or in the fall.' },
    cornGuide: { source: 'msuCorn', quote: 'Direct sow: May to July' },
    fallGarden: { source: 'msuFall', quote: 'When to plant depends on when the first frost generally occurs. ... You must consider how many days it takes for your particular vegetable to mature.' },
    garlicFall: { source: 'msuGarlic', quote: 'Plant 3 to 5 weeks before a hard freeze settles in, providing enough time for root development in the fall. In Michigan, this is typically in October–November.' },
    basilFrost: { source: 'msuBasil', quote: 'Basil can be direct-seeded or transplanted to the field in late spring after all danger of frost is over.' },
    potato45: { source: 'msuPotato', quote: 'Plant seed pieces in spring when the soil temp. is 45F or above.' },
    hardy: { source: 'msuPlant', quote: 'Some cool season vegetables such as onions, peas and spinach, are very hardy and can be planted as soon as the ground can be worked in the spring. This is usually late March or early April in southern Michigan and one to three weeks later further north.' },
    afterFrost: { source: 'msuPlant', quote: 'Warm season vegetables ... will be killed by frost. They cannot be safely planted outdoors until the danger of frost is past.' },
    soil60: { source: 'msuPlant', quote: 'Some seeds, like certain extra-sweet corn cultivars, will not germinate well unless the soil temperature at planting depth exceeds 60°F.' },
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
    { id: 'lettuce', name: 'Leaf lettuce', kind: 'coolGuide' },
    { id: 'broccoli', name: 'Broccoli', kind: 'coolGuide' },
    { id: 'brussels-sprouts', name: 'Brussels sprouts', kind: 'coolGuide' },
    { id: 'cabbage', name: 'Cabbage', kind: 'coolGuide' },
    { id: 'chinese-cabbage', name: 'Chinese cabbage', kind: 'coolGuide' },
    { id: 'cauliflower', name: 'Cauliflower', kind: 'coolGuide' },
    { id: 'collards', name: 'Collards', kind: 'coolGuide' },
    { id: 'kale', name: 'Kale', kind: 'coolGuide' },
    { id: 'kohlrabi', name: 'Kohlrabi', kind: 'coolGuide' },
    { id: 'mustard', name: 'Mustard greens', kind: 'coolGuide' },
    { id: 'rutabaga', name: 'Rutabaga', kind: 'coolGuide' },
    { id: 'chard', name: 'Swiss chard', kind: 'coolGuide' },
    { id: 'turnips', name: 'Turnips', kind: 'soil40' },
    { id: 'eggplant', name: 'Eggplant', kind: 'transplant', tender: true },
    { id: 'melon', name: 'Melons', kind: 'warmSow', tender: true },
    { id: 'pumpkin', name: 'Pumpkins', kind: 'warmSow', tender: true },
    { id: 'potatoes', name: 'Potatoes', kind: 'potato' },
    { id: 'garlic', name: 'Garlic', kind: 'garlic' },
    { id: 'basil', name: 'Basil', kind: 'basil' },
    { id: 'cilantro', name: 'Cilantro', kind: 'cilantro' },
    { id: 'sweet-corn', name: 'Sweet corn', kind: 'corn' },
    { id: 'zucchini', name: 'Zucchini', kind: 'warmSow', tender: true },
    { id: 'winter-squash', name: 'Winter squash', kind: 'warmSow', tender: true },
    { id: 'watermelon', name: 'Watermelon', kind: 'warmSow', tender: true },
    { id: 'parsley', name: 'Parsley', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'dill', name: 'Dill', kind: 'dill' },
    { id: 'chives', name: 'Chives', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'oregano', name: 'Oregano', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'thyme', name: 'Thyme', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'sage', name: 'Sage', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'rosemary', name: 'Rosemary', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'zinnias', name: 'Zinnias', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'marigolds', name: 'Marigolds', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'sunflowers', name: 'Sunflowers', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'cosmos', name: 'Cosmos', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'nasturtiums', name: 'Nasturtiums', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'sweet-peas', name: 'Sweet peas', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'snapdragons', name: 'Snapdragons', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'petunias', name: 'Petunias', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'calendula', name: 'Calendula', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' },
    { id: 'morning-glories', name: 'Morning glories', kind: 'none', why: 'No verified local planting window is available here; consult your seed packet.' }
  ];

  var STATUS = {
    START_INDOORS: 'Start indoors now', HARDEN_OFF: 'Harden off now', TRANSPLANT: 'Transplant now', PLANT: 'Plant now',
    READY_WHEN: 'Plant when the soil is ready', WAIT: 'Wait', WAIT_SOIL: 'Wait for the soil', DONE: 'Typical fall frost season',
    NEXT_SPRING: 'Next spring', PLAN_GARLIC: 'Check fall garlic timing', PLAN_FALL: 'Plan a fall crop', GUIDE: 'Growing guide', NOT_REPORTED: 'Not reported'
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
    // E3172 names these fall crops. This is a planning prompt, not a local sowing deadline.
    var fallCrops = ['beets','broccoli','brussels-sprouts','cabbage','chinese-cabbage','carrots','cauliflower','collards','kale','kohlrabi','lettuce','mustard','peas','radishes','rutabaga','spinach','chard','turnips'];
    if (fallCrops.indexOf(crop.id) >= 0 && d >= K.parse('Jul 15') && d <= K.parse('Sep 30')) {
      out.rules = ['fallGarden'];
      return set('PLAN_FALL', 'Consider ' + crop.name.toLowerCase() + ' for fall', 'Check the days to maturity on your seed packet, allow for germination and slower autumn growth, and count back from your local frost reference. ' + (fr.fallText ? 'The typical first fall frost at this station is ' + fr.fallText + ', not a forecast.' : 'A sourced fall frost reference is unavailable for this station.')); 
    }
    if (crop.kind === 'cilantro') {
      out.rules=['cilantroCool'];
      return set('GUIDE','Cilantro likes cool weather','MSU recommends planting cilantro in early spring or fall. Check your packet and local conditions; hot weather can send it to flower quickly.');
    }
    if (crop.kind === 'dill') {
      out.rules=['dillFrost'];
      return set('GUIDE','Sow dill where it will grow','MSU suggests sowing around the last expected spring frost. Your station date is a historical reference, not a forecast; check local weather and your packet.');
    }
    if (crop.kind === 'corn') {
      out.rules=['cornGuide'];
      return set('GUIDE','Give sweet corn a warm start','MSU lists May through July for direct sowing. Timing varies by location and variety; extra-sweet varieties need warmer soil, and a late sowing may not mature before frost. Check your packet and forecast.');
    }
    if (crop.kind === 'basil') {
      out.rules=['basilFrost'];
      return set('GUIDE','Basil: wait for settled warmth','MSU describes basil as tender and says to direct-seed or transplant after frost danger has passed. The station date is only a climate reference; check the forecast and your own garden before planting.');
    }
    if (crop.kind === 'potato') {
      out.rules=['potato45'];out.windows=[{kind:'sow',condition:'soil45'}];
      if (d < K.parse('Mar 1') || d > SPRING_END) return set('NEXT_SPRING','Potatoes: plan for spring','MSU recommends planting seed potatoes in spring when the soil is at least 45°F. Check soil at planting depth and use certified disease-free seed potatoes.');
      if (soil !== null && soil < 45) return set('WAIT_SOIL','Wait for warmer soil for potatoes',soil+'°F is below the 45°F soil temperature in MSU’s spring guidance.');
      if (soil !== null && cond.workable === false) return set('WAIT_SOIL','Wait until the bed can be worked','The soil temperature meets the 45°F minimum, but your bed is not workable yet.');
      if (soil !== null && cond.workable === true) return set('PLANT','Plant seed potatoes','Your soil reading meets MSU’s 45°F minimum and you reported that the bed is workable. Follow your seed potato instructions.');
      if (soil !== null) return set('READY_WHEN','Check whether the bed is workable','Your '+soil+'°F reading meets MSU’s 45°F minimum. Check the bed before planting.');
      return set('READY_WHEN','Check your soil before planting potatoes','In spring, MSU recommends planting seed potatoes when soil is at least 45°F. Check the bed at planting depth.');
    }
    if (crop.kind === 'coolGuide') {
      out.rules = ['fallGarden'];
      return set('GUIDE', crop.name + ': a cool-season crop', 'MSU includes this crop in its fall garden guide. For spring and fall, check your seed packet, growing conditions and days to maturity; this tool does not have a verified local sowing date.');
    }
    if (crop.kind === 'garlic') {
      out.rules = ['garlicFall'];
      if (d >= K.parse('Oct 1') && d <= K.parse('Nov 30')) return set('PLAN_GARLIC', 'Plan your garlic planting', 'MSU says to plant 3 to 5 weeks before a hard freeze settles in, typically October or November in Michigan. Check your soil and local conditions; the first fall frost is not the date the ground freezes.');
      return set('WAIT', 'Save a bed for fall garlic', 'MSU recommends planting 3 to 5 weeks before a hard freeze settles in, typically October or November in Michigan. Your local ground-freeze date is not predicted here.');
    }
    if (crop.kind === 'none') { out.rules = []; return set('NOT_REPORTED', crop.name + ': not reported', crop.why); }
    if (crop.kind === 'transplant') {
      var open = fr.cautious, inF = open - 56, inT = open - 42, hF = open - 10, hT = open - 1;
      out.rules = ['indoor', 'harden', 'afterFrost'].concat(crop.extra || []);
      out.windows = [{ kind: 'indoor', from: inF, to: inT }, { kind: 'harden', from: hF, to: hT }, { kind: 'transplant', from: open, to: null }];
      if (crop.extra && crop.extra.indexOf('memorial') >= 0) out.notes.push('MSU Extension notes many Michigan gardeners set tomatoes out around Memorial Day.');
      if (afterFall) return set('DONE', crop.name + ': watch for fall frost', 'Tender plants can be killed by frost. The typical first fall frost is ' + fr.fallText + '; check what has actually happened in your garden.');
      if (d > SPRING_END) return set('NEXT_SPRING', crop.name + ': next spring', 'Start seeds indoors ' + K.range(inF, inT) + ' and plant out from ' + K.fmt(open) + '.' + (fr.fall !== null ? ' Plants already in the ground may be damaged by frost; the typical first fall frost is around ' + fr.fallText + '.' : ''));
      if (d < inF) return set('WAIT', 'Start ' + crop.name.toLowerCase() + ' indoors ' + K.range(inF, inT), 'Six to eight weeks before they go out on ' + K.fmt(open) + '. Seed starting opens ' + soonWords(inF - d) + '.');
      if (d <= inT) return set('START_INDOORS', 'Start ' + crop.name.toLowerCase() + ' indoors now', 'Window ' + K.range(inF, inT) + ', six to eight weeks before planting out on ' + K.fmt(open) + '.');
      if (d < hF) return set('WAIT', 'Grow ' + crop.name.toLowerCase() + ' on under lights', 'Harden them off from ' + K.fmt(hF) + ' (' + soonWords(hF - d) + ') and plant out from ' + K.fmt(open) + '.');
      if (d < open) return set('HARDEN_OFF', 'Harden off ' + crop.name.toLowerCase() + ' now', 'Seven to ten days outside before planting out on ' + K.fmt(open) + '.');
      return set('TRANSPLANT', 'Plant ' + crop.name.toLowerCase() + ' out' + (d - open > 28 ? ' (window open since ' + K.fmt(open) + ')' : ''), 'The cautious spring reference is ' + K.fmt(open) + ' (about 1 spring in 4 still freezes on or after that date; the latest on record was ' + st.lx + '). MSU gives no last planting date' + (fr.fall !== null ? '; count the days to maturity on your packet back from the first fall frost, ' + fr.fallText + '.' : '.'));
    }
    if (crop.kind === 'warmSow') {
      var o = fr.cautious;
      out.rules = ['afterFrost', 'soil60'].concat(crop.succession ? ['succession'] : []);
      out.windows = [{ kind: 'sow', from: o, to: null }];
      if (crop.succession) out.notes.push('Sow again every two weeks for a longer harvest.');
      if (afterFall) return set('DONE', crop.name + ': watch for fall frost', 'Tender plants can be killed by frost. The typical first fall frost is ' + fr.fallText + '; check what has actually happened in your garden.');
      if (d > SPRING_END) return set('NEXT_SPRING', crop.name + ': next spring', 'Sow outside from ' + K.fmt(o) + ', once the soil is above 60°F.' + (fr.fall !== null ? ' Plants already growing may be damaged by frost; the typical first fall frost is around ' + fr.fallText + '.' : ''));
      if (d < o) return set('WAIT', 'Sow ' + crop.name.toLowerCase() + ' outside from ' + K.fmt(o), 'After the spring reference, ' + soonWords(o - d) + ', once the soil at planting depth is above 60°F.');
      if (soil === null) return set('READY_WHEN','Check the soil before sowing '+crop.name.toLowerCase(),'The spring frost reference has passed, but frost is still possible. Check the forecast and soil at planting depth; this tool uses above 60°F as a conservative warm-soil check. Your variety may need warmer soil.');
      if (soil !== null && soil <= 60) return set('WAIT_SOIL', 'Wait for warmer soil for ' + crop.name.toLowerCase(), soil + '°F does not exceed the 60°F soil threshold. Wait for warmer soil and check the forecast.');
      return set('PLANT', 'Sow ' + crop.name.toLowerCase() + ' outside', (soil !== null ? 'Soil is ' + soil + '°F and the spring reference (' + K.fmt(o) + ') has passed, but frost is still possible. Check the forecast. ' : 'The spring reference has passed (' + K.fmt(o) + '), but frost is still possible. Check that the soil at planting depth is above 60°F. ') + 'MSU gives no last sowing date' + (fr.fall !== null ? '; frost usually arrives around ' + fr.fallText + '.' : '.'));
    }
    // March 1 is a conservative display boundary for spring-only soil advice, not a regional planting deadline.
    if (crop.kind === 'hardy') {
      out.rules = ['hardy'];
      out.windows = [{ kind: 'sow', condition: 'workable' }];
      if (d < K.parse('Mar 1') || d > SPRING_END) return set('NEXT_SPRING', crop.name + ': next spring', 'Plant as soon as the ground can be worked in spring: usually late March or early April in southern Michigan, one to three weeks later farther north.');
      if (cond.workable === true) return set('PLANT', 'Plant ' + crop.name.toLowerCase(), 'You can work the soil, and ' + crop.name.toLowerCase() + ' are very hardy.');
      if (cond.workable === false) return set('WAIT_SOIL', 'Wait until the ground can be worked', 'Wet or frozen soil first has to crumble in your hand.');
      return set('READY_WHEN', 'Plant ' + crop.name.toLowerCase() + ' as soon as the ground can be worked', 'Usually late March or early April in southern Michigan, one to three weeks later farther north.');
    }
    if (crop.kind === 'soil40') {
      out.rules = ['soil40'];
      out.windows = [{ kind: 'sow', condition: 'soil40' }];
      if (d < K.parse('Mar 1') || afterFall || d > SPRING_END) return set('NEXT_SPRING', crop.name + ': next spring', 'Sow once the soil at planting depth reaches 40°F.');
      if (soil !== null && soil < 40) return set('WAIT_SOIL', 'Wait for 40°F soil', soil + '°F is below the 40°F the seed needs to germinate.');
      if (soil !== null) return set('PLANT', 'Sow ' + crop.name.toLowerCase(), 'Soil at ' + soil + '°F; the seed germinates from 40°F.');
      return set('READY_WHEN', 'Sow ' + crop.name.toLowerCase() + ' once the soil is 40°F', 'The seed germinates at a minimum of 40°F at planting depth.');
    }
    return set('NOT_REPORTED', crop.name + ': not reported', 'No rule.');
  }

  var RANK = { START_INDOORS: 0, HARDEN_OFF: 1, TRANSPLANT: 2, PLANT: 2, READY_WHEN: 4, WAIT_SOIL: 5, WAIT: 6, DONE: 8, NEXT_SPRING: 8, PLAN_FALL: 3, PLAN_GARLIC: 3, GUIDE: 7, NOT_REPORTED: 9 };
  /* The whole answer: a ranked "do this week" list, then every crop. Windows that opened more than
   * four weeks ago stay in the table but drop off the weekly list, so it shows what is new. */
  function plan(st, d, cond) {
    var all = CROPS.map(function (c) { return cropStatus(c, st, d, cond); });
    var fr = frostOf(st);
    function age(r) { var w = r.windows.filter(function (x) { return x.kind === 'transplant' || x.kind === 'sow'; })[0]; return w && typeof w.from === 'number' ? d - w.from : 0; }
    var week = all.filter(function (r) {
      if (r.code === 'PLAN_FALL' || r.code === 'PLAN_GARLIC') return true;
      if (r.code === 'START_INDOORS' || r.code === 'HARDEN_OFF') return true;
      if (r.code === 'TRANSPLANT' || r.code === 'PLANT') return age(r) <= 28 || r.crop.kind === 'hardy' || r.crop.kind === 'soil40' || r.crop.kind === 'potato';
      if (r.code === 'READY_WHEN' || r.code === 'WAIT_SOIL') return true;
      if (r.code === 'WAIT') { var w = r.windows.filter(function (x) { return typeof x.from === 'number' && x.from >= d; })[0]; return w && w.from - d <= 21; }
      return false;
    }).sort(function (a, b) { return RANK[a.code] - RANK[b.code] || a.crop.name.localeCompare(b.crop.name); });
    return { station: st, day: d, frost: fr, week: week, crops: all.slice().sort(function (a, b) { return RANK[a.code] - RANK[b.code] || CROPS.indexOf(a.crop) - CROPS.indexOf(b.crop); }) };
  }

  // MSU E3172, p. 2: approximate days from germination, not sowing. Variety and weather vary.
  var FALL_REFERENCE_DAYS = {beets:60,broccoli:60,'brussels-sprouts':100,cabbage:80,'chinese-cabbage':80,carrots:60,cauliflower:65,collards:100,kale:60,kohlrabi:60,lettuce:50,mustard:60,peas:60,radishes:30,rutabaga:80,spinach:60,chard:60,turnips:60};
  function fallReference(id) {
    if (!Object.prototype.hasOwnProperty.call(FALL_REFERENCE_DAYS,id)) return null;
    return {days:FALL_REFERENCE_DAYS[id],basis:'days after germination',source:'msuFall',referenceCrop:id==='peas'?'sugar peas':id==='lettuce'?'leaf lettuce':id==='cabbage'?'head cabbage':id==='radishes'?'radish (not daikon)':id,limitation:'Approximate; variety and cool weather change the timing. Allow separately for germination. Head cabbage: MSU recommends transplants.'};
  }
  // Packet-based arithmetic is a planning aid, not a latest-safe planting date.
  // A visitor-supplied frost date is explicitly distinct from a historical station median.
  function fallPlan(st, options) {
    options=options||{};
    var year=options.year, maturity=options.maturityDays, buffer=options.bufferDays;
    if (!Number.isInteger(year)||year<1900||year>2200||!Number.isInteger(maturity)||maturity<1||maturity>365||!Number.isInteger(buffer)||buffer<0||buffer>120) return {ok:false,reason:'invalid_input'};
    var custom=options.frostISO, iso=null, basis;
    if (custom !== undefined && custom !== null && custom !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(custom)||Number(custom.slice(0,4))!==year) return {ok:false,reason:'invalid_frost_date'};
      var check=new Date(custom+'T00:00:00Z');
      if (!isFinite(check.getTime())||check.toISOString().slice(0,10)!==custom) return {ok:false,reason:'invalid_frost_date'};
      iso=custom;basis='visitor_supplied';
    } else {
      if (!st) return {ok:false,reason:'station_required'};
      var frost=frostOf(st);if(frost.fall===null) return {ok:false,reason:'fall_frost_unavailable'};
      iso=K.toISO(frost.fall,year);basis='station_typical';
    }
    var dt=new Date(iso+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()-maturity-buffer);
    return {ok:true,referenceDate:iso,referenceBasis:basis,planningDate:dt.toISOString().slice(0,10),maturityDays:maturity,bufferDays:buffer,source:'msuFall',limitation:'Planning estimate, not a last safe planting date or harvest forecast; packet conventions, germination, frost tolerance and weather vary.'};
  }

  // Reusable multi-crop contract: caller supplies crop IDs, optional packet data, place and date.
  // Never substitute a generic research table value for a gardener's own packet.
  function gardenPlan(st, items, options) {
    options=options||{};var iso=options.dateISO;
    if (!st) return {ok:false,reason:'station_required'};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||''))) return {ok:false,reason:'invalid_date'};
    var dt=new Date(iso+'T00:00:00Z');
    if (!isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==iso) return {ok:false,reason:'invalid_date'};
    if (!Array.isArray(items)||items.length>100) return {ok:false,reason:'invalid_items'};
    var seen={},out=[],errors=[],timeline=[], year=Number(iso.slice(0,4));
    // Spring references are displayed for the upcoming season after July, with real calendar arithmetic.
    var springYear=K.fromISO(iso)>SPRING_END?year+1:year;
    var springDate=new Date(K.toISO(frostOf(st).cautious,springYear)+'T00:00:00Z');
    function springISO(offset) { var d=new Date(springDate.getTime());d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10); }
    items.forEach(function(item,index){
      if (typeof item==='string') item={cropId:item};
      if (!item||typeof item.cropId!=='string') {errors.push({index:index,reason:'invalid_item'});return;}
      var c=CROPS.filter(function(x){return x.id===item.cropId})[0];
      if (!c) {errors.push({index:index,reason:'unknown_crop',cropId:item.cropId});return;}
      if (seen[c.id]) {errors.push({index:index,reason:'duplicate_crop',cropId:c.id});return;} seen[c.id]=true;
      var current=cropStatus(c,st,K.fromISO(iso),options.conditions||{}), packet=null;
      if (item.maturityDays!==undefined) packet=c.kind==='garlic'?{ok:false,reason:'overwinter_crop'}:(!fallReference(c.id)&&c.id!=='beans')?{ok:false,reason:'fall_sowing_unverified'}:fallPlan(st,{year:Number(iso.slice(0,4)),maturityDays:item.maturityDays,bufferDays:item.bufferDays===undefined?14:item.bufferDays,frostISO:options.frostISO});
      if (c.kind==='transplant') {
        timeline.push({cropId:c.id,kind:'indoor',fromISO:springISO(-56),toISO:springISO(-42),source:'indoor'});
        timeline.push({cropId:c.id,kind:'harden',fromISO:springISO(-10),toISO:springISO(-1),source:'harden'});
        timeline.push({cropId:c.id,kind:'transplant',fromISO:springISO(0),toISO:null,source:'afterFrost'});
      } else if(c.kind==='warmSow') timeline.push({cropId:c.id,kind:'sow',fromISO:springISO(0),toISO:null,source:'afterFrost',condition:'soil above 60°F'});
      if(packet&&packet.ok) timeline.push({cropId:c.id,kind:'fall_reference',fromISO:packet.planningDate,toISO:null,source:'fallGarden',referenceBasis:packet.referenceBasis});
      out.push({cropId:c.id,crop:c,current:current,fallReference:fallReference(c.id),fallPlan:packet});
    });
    timeline.sort(function(a,b){return a.fromISO.localeCompare(b.fromISO)||a.cropId.localeCompare(b.cropId)});
    return {ok:true,station:st.s,dateISO:iso,crops:out,timeline:timeline,errors:errors,limitation:'Station frost dates are historical references. Soil, weather, variety and packet instructions matter.'};
  }

  // When nothing is current, the next dated window anywhere in the year.
  function nextUp(st, d) {
    var fr = frostOf(st), best = null;
    CROPS.forEach(function (c) { if (c.kind !== 'transplant' && c.kind !== 'warmSow') return; var from = c.kind === 'transplant' ? fr.cautious - 56 : fr.cautious; var n = ((from - d) % 365 + 365) % 365; if (!best || n < best.inDays) best = { crop: c, from: from, inDays: n, what: c.kind === 'transplant' ? 'start ' + c.name.toLowerCase() + ' indoors' : 'sow ' + c.name.toLowerCase() + ' outside' }; });
    return best;
  }
  var api = { SOURCES: SOURCES, RULES: RULES, CROPS: CROPS, STATUS: STATUS, FALL_PUBLISHED: FALL_PUBLISHED, locate: locate, towns: towns, nearestStation: nearestStation, detroitToday: detroitToday, cropStatus: cropStatus, plan: plan, nextUp: nextUp, frostOf: frostOf, miles: miles, fallReference: fallReference, fallPlan: fallPlan, gardenPlan: gardenPlan };
  root.PlantNow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
