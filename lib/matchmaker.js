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

function classify(input) {
  const value = String(input || "").toLowerCase();
  return value;
}

function chooseVarieties(answers) {
  const zoneText = classify(answers.zone);
  const zone = zoneText.includes("3-4") ? 3.5 : zoneText.includes("zone 5") ? 5 : zoneText.includes("6a") ? 6 : 6.75;
  const sunText = classify(answers.sun);
  const sun = sunText.includes("under 4") ? 3 : sunText.includes("4 to 6") ? 5 : sunText.includes("6 to 8") ? 7 : 8;
  const spaceText = classify(answers.space);
  const space = spaceText.includes("balcony") ? "balcony" : spaceText.includes("raised") ? "raised" : spaceText.includes("medium") ? "medium" : "large";
  const experienceText = classify(answers.experience);
  const experience = experienceText.includes("expert") ? 3 : experienceText.includes("experienced") ? 2 : experienceText.includes("intermediate") ? 1 : 0;
  const goalText = classify(answers.goal);
  const goal = goalText.includes("seed") ? "seed" : goalText.includes("yield") || goalText.includes("productive") ? "yield" : goalText.includes("rare") ? "rare" : "flavor";

  const ranked = varieties
    .map((variety) => {
      let score = 0;
      score += zone >= variety.zones[0] && zone <= variety.zones[1] ? 4 : -8;
      score += sun >= variety.sun ? 3 : -2 * (variety.sun - sun);
      score += variety.spaces.includes(space) ? 4 : -6;
      score += experience >= variety.difficulty ? 2 : -3 * (variety.difficulty - experience);
      score += variety.goals.includes(goal) ? 6 - variety.goals.indexOf(goal) : 0;
      if (zone < 5 && variety.days <= 65) score += 3;
      if (space === "balcony" && variety.spaces.includes("balcony")) score += 3;
      return { variety, score };
    })
    .sort((a, b) => b.score - a.score || a.variety.days - b.variety.days);

  const selected = [];
  for (const entry of ranked) {
    const sameTypeCount = selected.filter((item) => item.variety.type === entry.variety.type).length;
    if (sameTypeCount >= 1 && selected.length < 2) continue;
    selected.push(entry);
    if (selected.length === 3) break;
  }

  return selected.map(({ variety }) => ({
    name: variety.name,
    type: variety.type,
    why: `${variety.name} is ${variety.note}. It fits the selected growing space and available sun, and its roughly ${variety.days}-day maturity is a practical match for the season described. It also ranks strongly for the gardener's main goal without requiring more experience than the answers suggest.`,
    seed_saving: variety.seed_saving,
  }));
}

module.exports = { chooseVarieties, varieties };
