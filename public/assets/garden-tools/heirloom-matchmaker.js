/* Heirloom Variety Matchmaker: the variety list and the matching rules, shared by the page (runs in
 * the browser, no server call) and lib/matchmaker.js (kept for the /api/matchmaker contract).
 * Scores are a transparent rule of thumb, not a trial result. */
(function (root) {
  'use strict';
  const varieties = [
    {
      name: "Stupice Tomato",
      type: "Tomato",
      days: 55,
      zones: [3, 7],
      sun: 6,
      spaces: ["large", "medium", "raised"],
      difficulty: 0,
      goals: ["flavor", "yield", "seed"],
      note: "an early, cold-tolerant tomato that reliably ripens in short Great Lakes seasons",
      seed_saving: "Tomatoes mostly self-pollinate. Separate varieties by about 10 to 25 feet when practical, save seed from fully ripe fruit, ferment the seed and gel for 2 to 3 days, rinse, and dry thoroughly before storage.",
    },
    {
      name: "Brandywine Tomato",
      type: "Tomato",
      days: 80,
      zones: [5, 7],
      sun: 8,
      spaces: ["large", "medium", "raised"],
      difficulty: 1,
      goals: ["flavor", "rare"],
      note: "a classic slicing tomato prized for rich flavor when the season and space allow it",
      seed_saving: "Tomatoes mostly self-pollinate. Separate varieties by about 10 to 25 feet when practical, ferment seed from fully ripe fruit for 2 to 3 days, rinse clean, and dry for 2 to 3 weeks before storing cool and dark.",
    },
    {
      name: "Black Krim Tomato",
      type: "Tomato",
      days: 75,
      zones: [5, 7],
      sun: 7,
      spaces: ["large", "medium", "raised"],
      difficulty: 1,
      goals: ["flavor", "rare"],
      note: "a dark-fruited heirloom with a distinctive savory flavor and dependable midseason production",
      seed_saving: "Save seed from fully ripe, true-to-type fruit. Ferment the seed and pulp in a small jar for 2 to 3 days, rinse, then dry completely. Modest separation or blossom bagging helps keep varieties pure.",
    },
    {
      name: "Tiny Tim Tomato",
      type: "Tomato",
      days: 60,
      zones: [3, 7],
      sun: 6,
      spaces: ["raised", "balcony"],
      difficulty: 0,
      goals: ["yield", "flavor", "seed"],
      note: "a compact cherry tomato suited to containers, patios, and short northern seasons",
      seed_saving: "Choose a fully ripe fruit from a healthy plant, ferment its seed and gel for 2 to 3 days, rinse, and dry completely. Tomatoes are mostly self-pollinating, making this a good first seed-saving crop.",
    },
    {
      name: "Amish Paste Tomato",
      type: "Tomato",
      days: 80,
      zones: [5, 7],
      sun: 8,
      spaces: ["large", "medium", "raised"],
      difficulty: 1,
      goals: ["yield", "seed", "flavor"],
      note: "a meaty paste tomato that earns its space when sauce, canning, and preserving are the goal",
      seed_saving: "Select fully ripe fruit from vigorous plants, ferment the seed and gel for 2 to 3 days, rinse, and dry thoroughly. Keep some distance from other tomatoes or bag blossoms when strict purity matters.",
    },
    {
      name: "Jimmy Nardello's Pepper",
      type: "Pepper",
      days: 75,
      zones: [5, 7],
      sun: 8,
      spaces: ["large", "medium", "raised", "balcony"],
      difficulty: 1,
      goals: ["flavor", "yield", "seed"],
      note: "a sweet frying pepper with strong flavor and a manageable plant size",
      seed_saving: "Peppers can cross through insect pollination. Separate varieties substantially or bag blossoms for pure seed. Let peppers reach full mature color, remove seed, and air-dry it for 1 to 2 weeks before storage.",
    },
    {
      name: "Fish Pepper",
      type: "Pepper",
      days: 80,
      zones: [5, 7],
      sun: 7,
      spaces: ["medium", "raised", "balcony"],
      difficulty: 1,
      goals: ["rare", "flavor", "seed"],
      note: "a compact, variegated pepper with culinary history and genuine conversation value",
      seed_saving: "Bag blossoms or isolate from other peppers to prevent crossing. Allow fruit to reach full color, remove seed with gloves, and dry it completely for 1 to 2 weeks before labeling and storing.",
    },
    {
      name: "Provider Bush Bean",
      type: "Bean",
      days: 50,
      zones: [3, 7],
      sun: 6,
      spaces: ["large", "medium", "raised", "balcony"],
      difficulty: 0,
      goals: ["yield", "seed", "flavor"],
      note: "a fast, productive bush bean that performs well for new gardeners and short seasons",
      seed_saving: "Beans mostly self-pollinate. Leave selected pods on healthy plants until they are brown and brittle, shell them, and dry the beans for another 1 to 2 weeks before cool, dry storage.",
    },
    {
      name: "Cherokee Trail of Tears Bean",
      type: "Bean",
      days: 65,
      zones: [4, 7],
      sun: 6,
      spaces: ["large", "medium", "raised"],
      difficulty: 1,
      goals: ["rare", "seed", "yield"],
      note: "a historically significant pole bean that produces edible pods and dry beans on a trellis",
      seed_saving: "Beans mostly self-pollinate, though some crossing is possible. Let pods dry fully on the vine, shell them, discard damaged seed, and dry the remainder thoroughly before labeling and storage.",
    },
    {
      name: "Suyo Long Cucumber",
      type: "Cucumber",
      days: 60,
      zones: [4, 7],
      sun: 7,
      spaces: ["large", "medium", "raised"],
      difficulty: 1,
      goals: ["flavor", "yield", "rare"],
      note: "a crisp, productive cucumber that grows especially well upward on a trellis",
      seed_saving: "Cucumbers cross readily with other cucumbers. Hand-pollinate and tape a flower closed, or isolate varieties. Let the fruit become fully mature and yellow, ferment the seed for 1 to 3 days, rinse, and dry.",
    },
    {
      name: "Black Seeded Simpson Lettuce",
      type: "Lettuce",
      days: 45,
      zones: [3, 7],
      sun: 4,
      spaces: ["large", "medium", "raised", "balcony"],
      difficulty: 0,
      goals: ["yield", "seed", "flavor"],
      note: "a quick loose-leaf lettuce that tolerates partial shade and repeated harvests",
      seed_saving: "Lettuce mostly self-pollinates. Let several plants bolt and flower, then collect the fluffy mature seed heads as they dry. Finish drying indoors and separate chaff before storage.",
    },
    {
      name: "Paris Market Carrot",
      type: "Carrot",
      days: 55,
      zones: [3, 7],
      sun: 5,
      spaces: ["medium", "raised", "balcony"],
      difficulty: 1,
      goals: ["flavor", "rare", "yield"],
      note: "a small round carrot that fits shallow soil and containers better than long-rooted types",
      seed_saving: "Carrots are biennial and cross with other carrots and wild Queen Anne's lace. Overwinter selected roots, replant in spring, isolate flowering plants, and harvest dry seed heads in the second season.",
    },
    {
      name: "Minnesota Midget Melon",
      type: "Melon",
      days: 65,
      zones: [4, 7],
      sun: 8,
      spaces: ["large", "medium", "raised"],
      difficulty: 1,
      goals: ["flavor", "rare"],
      note: "a compact, early melon bred for northern seasons where full-size melons often run out of time",
      seed_saving: "Melons cross readily with other melons of the same species. Hand-pollinate or isolate. Save seed from fully ripe fruit, rinse it free of pulp, and dry it thoroughly for 1 to 2 weeks.",
    },
    {
      name: "Aunt Molly's Ground Cherry",
      type: "Ground cherry",
      days: 70,
      zones: [4, 7],
      sun: 6,
      spaces: ["large", "medium", "raised", "balcony"],
      difficulty: 0,
      goals: ["rare", "flavor", "yield"],
      note: "a sweet husked fruit that drops when ripe and handles Great Lakes conditions surprisingly well",
      seed_saving: "Ground cherries mostly self-pollinate. Mash fully ripe fruit in water, allow good seed to settle, pour off pulp, rinse, and dry the seed on a screen or coffee filter before storage.",
    },
    {
      name: "Long Pie Pumpkin",
      type: "Winter squash",
      days: 100,
      zones: [5, 7],
      sun: 8,
      spaces: ["large"],
      difficulty: 2,
      goals: ["rare", "yield", "seed"],
      note: "an unusual long-necked pie pumpkin suited to gardeners with room and a reliably long season",
      seed_saving: "Squash crosses readily within its species. Hand-pollinate and tape blossoms closed or isolate varieties. Let fruit fully mature, cure it, scoop seed, wash it clean, and dry it for 2 to 3 weeks.",
    },
    {
      name: "Red Russian Kale",
      type: "Kale",
      days: 50,
      zones: [3, 7],
      sun: 4,
      spaces: ["large", "medium", "raised", "balcony"],
      difficulty: 0,
      goals: ["yield", "flavor", "seed"],
      note: "a cold-hardy leafy crop that remains useful when sun, heat, or season length are limited",
      seed_saving: "Kale is biennial and crosses with other Brassica napus crops. Overwinter several plants, isolate flowering plants in the second year, and harvest pods when they turn tan but before they shatter.",
    },
  ];

  // Answers may be short codes from the page (zone: '6a') or the long sentences older callers send.
  var SEASON = { '3-4': 110, '5': 140, '6a': 155, '6b-7': 180 };
  function norm(answers) {
    var t = function (k) { return String(answers[k] || '').toLowerCase(); };
    var z = t('zone'), su = t('sun'), sp = t('space'), ex = t('experience'), g = t('goal');
    var zone = /3-4|^3|^4/.test(z) ? '3-4' : /zone 5|^5/.test(z) ? '5' : /6a/.test(z) ? '6a' : '6b-7';
    var sun = /under 4|shade(d)?$|mostly shaded|^shade/.test(su) ? 3 : /4 to 6|partial/.test(su) ? 5 : /6 to 8|mostly sunny|^mostly/.test(su) ? 7 : 8;
    var space = /balcony|patio/.test(sp) ? 'balcony' : /raised|container/.test(sp) ? 'raised' : /medium/.test(sp) ? 'medium' : 'large';
    var experience = /expert/.test(ex) ? 3 : /experienced/.test(ex) ? 2 : /intermediate/.test(ex) ? 1 : 0;
    var goal = /seed/.test(g) ? 'seed' : /yield|productive/.test(g) ? 'yield' : /rare/.test(g) ? 'rare' : 'flavor';
    return { zone: zone, zoneNum: { '3-4': 3.5, '5': 5, '6a': 6, '6b-7': 6.75 }[zone], sun: sun, space: space, experience: experience, goal: goal, season: SEASON[zone] };
  }
  var SPACE = { large: 'a large in-ground garden', medium: 'a medium in-ground garden', raised: 'raised beds or big containers', balcony: 'a balcony or patio' };
  var GOAL = { flavor: 'flavor', seed: 'seed saving', yield: 'a big harvest', rare: 'something unusual' };
  var LEVEL = ['a first-season gardener', 'a gardener with a few seasons behind them', 'an experienced gardener', 'a variety keeper'];

  function rank(a) {
    return varieties.map(function (v) {
      var score = 0;
      score += a.zoneNum >= v.zones[0] && a.zoneNum <= v.zones[1] ? 4 : -8;
      score += a.sun >= v.sun ? 3 : -2 * (v.sun - a.sun);
      score += v.spaces.indexOf(a.space) >= 0 ? 4 : -6;
      score += a.experience >= v.difficulty ? 2 : -3 * (v.difficulty - a.experience);
      score += v.goals.indexOf(a.goal) >= 0 ? 6 - v.goals.indexOf(a.goal) : 0;
      if (a.zoneNum < 5 && v.days <= 65) score += 3;
      if (a.space === 'balcony' && v.spaces.indexOf('balcony') >= 0) score += 3;
      return { variety: v, score: score };
    }).sort(function (x, y) { return y.score - x.score || x.variety.days - y.variety.days; });
  }
  function pick(ranked) {
    var selected = [];
    for (var i = 0; i < ranked.length && selected.length < 3; i++) {
      var e = ranked[i];
      var same = selected.filter(function (x) { return x.variety.type === e.variety.type; }).length;
      if (same >= 1 && selected.length < 2) continue;
      selected.push(e);
    }
    return selected;
  }
  // Plain reasons, each one tied to an answer, so a gardener can see why a variety made the list.
  function reasons(v, a) {
    var out = [], margin = a.season - v.days;
    out.push(margin >= 20 ? 'Ripens in about ' + v.days + ' days, well inside a zone ' + a.zone + ' season of about ' + a.season + ' frost-free days.' : margin >= 0 ? 'Ripens in about ' + v.days + ' days, which fits a zone ' + a.zone + ' season of about ' + a.season + ' days with little to spare. Start it early.' : 'Needs about ' + v.days + ' days, longer than a typical zone ' + a.zone + ' season. Start it indoors early and cover it in fall.');
    out.push(a.sun >= v.sun ? 'Wants ' + v.sun + '+ hours of sun, and your garden has that.' : 'Wants ' + v.sun + '+ hours of sun, more than your garden gets, so expect a lighter harvest.');
    out.push(v.spaces.indexOf(a.space) >= 0 ? 'Fits ' + SPACE[a.space] + '.' : 'Happier with more room than ' + SPACE[a.space] + ' gives it.');
    out.push(v.difficulty <= a.experience ? 'A good match for ' + LEVEL[a.experience] + '.' : 'A little demanding for ' + LEVEL[a.experience] + ', but worth it.');
    if (v.goals.indexOf(a.goal) >= 0) out.push('One of the strongest picks here for ' + GOAL[a.goal] + '.');
    return out;
  }
  function match(answers) {
    var a = norm(answers);
    return { answers: a, varieties: pick(rank(a)).map(function (e) { var v = e.variety; return { name: v.name, type: v.type, days: v.days, note: v.note, reasons: reasons(v, a), seed_saving: v.seed_saving, fits: { season: a.season - v.days >= 0, sun: a.sun >= v.sun, space: v.spaces.indexOf(a.space) >= 0 } }; }) };
  }
  // The original response shape: name, type, why, seed_saving.
  function chooseVarieties(answers) {
    return match(answers).varieties.map(function (v) {
      return { name: v.name, type: v.type, why: v.name + ' is ' + v.note + '. ' + v.reasons.join(' '), seed_saving: v.seed_saving };
    });
  }
  var api = { varieties: varieties, match: match, chooseVarieties: chooseVarieties, SEASON: SEASON };
  root.HeirloomMatch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
