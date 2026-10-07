"use strict";

const TC_FALLBACKS = {
  "old-mission": {
    "schemaVersion": 1,
    "adapter": "tcwine-snapshot",
    "region": {
      "id": "old-mission",
      "label": "Old Mission Peninsula",
      "publicLabel": "Old Mission Peninsula",
      "plannerUrl": "https://tcwine.chrisizworski.com/",
      "plannerOrigin": "Traverse City",
      "anchor": {
        "lat": 44.956,
        "lng": -85.515
      },
      "experience": {
        "compactness": "high",
        "scenery": "high",
        "villages": "low",
        "variety": "medium",
        "relaxedPace": "high",
        "firstTripAppeal": "high"
      }
    },
    "inventory": {
      "wineryCount": 11,
      "officialTrailMemberCount": 10,
      "knownHoursCount": 11,
      "unknownHoursCount": 0,
      "foodSignalCount": 9,
      "viewSignalCount": 11
    },
    "intentEvidence": {
      "first-trip": 7,
      "serious-wine": 3,
      "riesling": 8,
      "sparkling": 3,
      "reds": 8,
      "whites": 8,
      "food": 9,
      "views": 11,
      "quiet": 0
    },
    "localDrive": {
      "medianNearestNeighborMiles": 0.8,
      "spreadMiles": 10.2
    },
    "operatingByWeekday": {
      "Sunday": {
        "knownOpen": 11,
        "knownClosed": 0,
        "unknown": 0
      },
      "Monday": {
        "knownOpen": 11,
        "knownClosed": 0,
        "unknown": 0
      },
      "Tuesday": {
        "knownOpen": 10,
        "knownClosed": 1,
        "unknown": 0
      },
      "Wednesday": {
        "knownOpen": 10,
        "knownClosed": 1,
        "unknown": 0
      },
      "Thursday": {
        "knownOpen": 11,
        "knownClosed": 0,
        "unknown": 0
      },
      "Friday": {
        "knownOpen": 11,
        "knownClosed": 0,
        "unknown": 0
      },
      "Saturday": {
        "knownOpen": 11,
        "knownClosed": 0,
        "unknown": 0
      }
    },
    "freshness": {
      "wineryTruthReviewedAt": "2026-08-29",
      "hoursReviewedLabel": "July 2026",
      "officialMembershipVerifiedAt": "2026-08-29"
    },
    "truthRules": {
      "unknownIsFalse": false,
      "unknownHoursMeaning": "call-ahead / not verified, never treated as closed",
      "reservationAvailabilityKnown": false,
      "tastingFeesKnown": false
    },
    "handoff": {
      "plannerUrl": "https://tcwine.chrisizworski.com/",
      "plannerOrigin": "Traverse City",
      "area": "old-mission",
      "presets": {
        "first-trip": [
          "peninsula-cellars",
          "chateau-grand-traverse",
          "brys-estate"
        ],
        "serious-wine": [
          "peninsula-cellars",
          "tabone",
          "2-lads"
        ],
        "riesling": [
          "peninsula-cellars",
          "bowers-harbor",
          "tabone"
        ],
        "sparkling": [
          "2-lads",
          "tabone",
          "bonobo"
        ],
        "reds": [
          "black-star-farms-old-mission",
          "mari-vineyards",
          "peninsula-cellars"
        ],
        "whites": [
          "peninsula-cellars",
          "chateau-grand-traverse",
          "tabone"
        ],
        "food": [
          "tabone",
          "bowers-harbor",
          "brys-estate"
        ],
        "views": [
          "2-lads",
          "chateau-chantal",
          "brys-estate"
        ],
        "quiet": [
          "hawthorne-vineyards",
          "peninsula-cellars",
          "tabone"
        ]
      },
      "source": "owner-snapshot-fallback"
    }
  },
  "leelanau": {
    "schemaVersion": 1,
    "adapter": "tcwine-snapshot",
    "region": {
      "id": "leelanau",
      "label": "Leelanau Peninsula",
      "publicLabel": "Leelanau Peninsula",
      "plannerUrl": "https://tcwine.chrisizworski.com/",
      "plannerOrigin": "Traverse City",
      "anchor": {
        "lat": 44.993,
        "lng": -85.755
      },
      "experience": {
        "compactness": "medium",
        "scenery": "high",
        "villages": "high",
        "variety": "high",
        "relaxedPace": "medium",
        "firstTripAppeal": "high"
      }
    },
    "inventory": {
      "wineryCount": 30,
      "officialTrailMemberCount": 22,
      "knownHoursCount": 28,
      "unknownHoursCount": 2,
      "foodSignalCount": 19,
      "viewSignalCount": 30
    },
    "intentEvidence": {
      "first-trip": 21,
      "serious-wine": 10,
      "riesling": 16,
      "sparkling": 5,
      "reds": 17,
      "whites": 21,
      "food": 19,
      "views": 30,
      "quiet": 7
    },
    "localDrive": {
      "medianNearestNeighborMiles": 0.8,
      "spreadMiles": 23
    },
    "operatingByWeekday": {
      "Sunday": {
        "knownOpen": 27,
        "knownClosed": 1,
        "unknown": 2
      },
      "Monday": {
        "knownOpen": 25,
        "knownClosed": 3,
        "unknown": 2
      },
      "Tuesday": {
        "knownOpen": 25,
        "knownClosed": 3,
        "unknown": 2
      },
      "Wednesday": {
        "knownOpen": 26,
        "knownClosed": 2,
        "unknown": 2
      },
      "Thursday": {
        "knownOpen": 28,
        "knownClosed": 0,
        "unknown": 2
      },
      "Friday": {
        "knownOpen": 28,
        "knownClosed": 0,
        "unknown": 2
      },
      "Saturday": {
        "knownOpen": 28,
        "knownClosed": 0,
        "unknown": 2
      }
    },
    "freshness": {
      "wineryTruthReviewedAt": "2026-08-29",
      "hoursReviewedLabel": "July 2026",
      "officialMembershipVerifiedAt": "2026-08-29"
    },
    "truthRules": {
      "unknownIsFalse": false,
      "unknownHoursMeaning": "call-ahead / not verified, never treated as closed",
      "reservationAvailabilityKnown": false,
      "tastingFeesKnown": false
    },
    "handoff": {
      "plannerUrl": "https://tcwine.chrisizworski.com/",
      "plannerOrigin": "Traverse City",
      "area": "leelanau",
      "presets": {
        "first-trip": [
          "good-harbor",
          "laurentide-winery",
          "boathouse-vineyards"
        ],
        "serious-wine": [
          "laurentide-winery",
          "gilchrist-farm",
          "nathaniel-rose"
        ],
        "riesling": [
          "boathouse-vineyards",
          "soul-squeeze-cellars",
          "laurentide-winery"
        ],
        "sparkling": [
          "mawby",
          "ciccone",
          "shady-lane-cellars"
        ],
        "reds": [
          "blustone",
          "boathouse-vineyards",
          "laurentide-winery"
        ],
        "whites": [
          "boathouse-vineyards",
          "laurentide-winery",
          "good-harbor"
        ],
        "food": [
          "good-harbor",
          "laurentide-winery",
          "gilchrist-farm"
        ],
        "views": [
          "blustone",
          "boathouse-vineyards",
          "laurentide-winery"
        ],
        "quiet": [
          "chateau-fontaine",
          "big-little-wines",
          "three-trees"
        ]
      },
      "source": "owner-snapshot-fallback"
    }
  }
};

const PETOSKEY_FALLBACK = {
  "schemaVersion": 1,
  "adapter": "petoskey-wine-region",
  "region": {
    "id": "petoskey",
    "label": "Petoskey / Tip of the Mitt",
    "publicLabel": "Petoskey Wine Region",
    "plannerUrl": "https://chrisizworski.com/petoskey-wine/",
    "plannerOrigin": "Petoskey",
    "officialGeography": [
      {
        "type": "AVA",
        "name": "Tip of the Mitt AVA",
        "authority": "TTB"
      },
      {
        "type": "wine-region",
        "name": "Petoskey Wine Region",
        "authority": "official association"
      }
    ],
    "anchor": {
      "lat": 45.35,
      "lng": -84.96
    },
    "experience": {
      "compactness": "medium",
      "scenery": "high",
      "villages": "high",
      "variety": "medium",
      "relaxedPace": "high",
      "firstTripAppeal": "medium"
    }
  },
  "inventory": {
    "wineryCount": 15,
    "officialTrailMemberCount": 13,
    "knownHoursCount": 10,
    "unknownHoursCount": 5,
    "foodSignalCount": 12,
    "viewSignalCount": 12
  },
  "intentEvidence": {
    "first-trip": 11,
    "serious-wine": 10,
    "riesling": 0,
    "sparkling": 1,
    "reds": 4,
    "whites": 2,
    "food": 11,
    "views": 9,
    "quiet": 10
  },
  "localDrive": {
    "medianNearestNeighborMiles": 3.7,
    "spreadMiles": 36.7
  },
  "freshness": {
    "wineryTruthReviewedAt": "2026-09-18",
    "hoursReviewedLabel": "September 18, 2026",
    "officialMembershipVerifiedAt": "2026-09-18"
  },
  "truthRules": {
    "unknownIsFalse": false,
    "unknownHoursMeaning": "call-ahead / not verified, never treated as closed",
    "reservationAvailabilityKnown": false,
    "tastingFeesKnown": false
  },
  "handoff": {
    "plannerUrl": "https://chrisizworski.com/petoskey-wine/",
    "plannerOrigin": "Petoskey",
    "area": "any",
    "presets": {
      "first-trip": [
        "petoskey-farms",
        "mackinaw-trail",
        "walloon-lake-winery"
      ],
      "serious-wine": [
        "petoskey-farms",
        "mackinaw-trail",
        "boyne-valley-vineyards"
      ],
      "riesling": [
        "petoskey-farms",
        "mackinaw-trail",
        "boyne-valley-vineyards"
      ],
      "sparkling": [
        "walloon-lake-winery",
        "rudbeckia",
        "mackinaw-trail"
      ],
      "reds": [
        "petoskey-farms",
        "mackinaw-trail",
        "boyne-valley-vineyards"
      ],
      "whites": [
        "petoskey-farms",
        "boyne-valley-vineyards",
        "mackinaw-trail"
      ],
      "food": [
        "petoskey-farms",
        "mackinaw-trail",
        "boyne-valley-vineyards"
      ],
      "views": [
        "petoskey-farms",
        "boyne-valley-vineyards",
        "walloon-lake-winery"
      ],
      "quiet": [
        "walloon-lake-winery",
        "rudbeckia",
        "spare-key"
      ]
    },
    "source": "owner-validated-regional-presets"
  },
  "operatingByWeekday": {
    "Sunday": {
      "knownOpen": 10,
      "knownClosed": 0,
      "unknown": 5
    },
    "Monday": {
      "knownOpen": 6,
      "knownClosed": 4,
      "unknown": 5
    },
    "Tuesday": {
      "knownOpen": 5,
      "knownClosed": 5,
      "unknown": 5
    },
    "Wednesday": {
      "knownOpen": 7,
      "knownClosed": 3,
      "unknown": 5
    },
    "Thursday": {
      "knownOpen": 8,
      "knownClosed": 2,
      "unknown": 5
    },
    "Friday": {
      "knownOpen": 9,
      "knownClosed": 1,
      "unknown": 5
    },
    "Saturday": {
      "knownOpen": 9,
      "knownClosed": 1,
      "unknown": 5
    }
  }
};

const SOUTHWEST_VENUES = [
  {
    "id": "domaine-berrien",
    "name": "Domaine Berrien",
    "address": "398 E Lemon Creek Rd, Berrien Springs, MI 49103",
    "cluster": "south-berrien",
    "trailMember": true,
    "url": "https://www.domaineberrien.com/"
  },
  {
    "id": "lemon-creek",
    "name": "Lemon Creek Winery",
    "address": "533 E Lemon Creek Rd, Berrien Springs, MI 49103",
    "cluster": "south-berrien",
    "trailMember": true,
    "url": "https://lemoncreekwinery.com/"
  },
  {
    "id": "golden-muse",
    "name": "Golden Muse Winery",
    "address": "8903 Stevensville-Baroda Rd, Baroda, MI 49101",
    "cluster": "south-berrien",
    "trailMember": true,
    "url": "https://goldenmusewinery.com/"
  },
  {
    "id": "hickory-creek",
    "name": "Hickory Creek Winery",
    "address": "750 Browntown Rd, Buchanan, MI 49107",
    "cluster": "south-berrien",
    "trailMember": true,
    "url": "https://www.hickorycreekwinery.com/"
  },
  {
    "id": "solasta",
    "name": "Solasta Winery",
    "address": "11945 Red Arrow Hwy, Sawyer, MI 49125",
    "cluster": "south-berrien",
    "trailMember": true,
    "url": "https://solastawinery.com/"
  },
  {
    "id": "twelve-corners",
    "name": "12 Corners Vineyards",
    "address": "1201 N Benton Center Rd, Benton Harbor, MI 49022",
    "cluster": "st-joseph-coloma",
    "trailMember": true,
    "url": "https://12corners.com/"
  },
  {
    "id": "lake-michigan-vintners",
    "name": "Lake Michigan Vintners",
    "address": "2774 E Empire Ave, Benton Harbor, MI 49022",
    "cluster": "st-joseph-coloma",
    "trailMember": true,
    "url": "https://lakemichiganvintners.com/"
  },
  {
    "id": "white-pine",
    "name": "White Pine Winery",
    "address": "317 State St, St Joseph, MI 49085",
    "cluster": "st-joseph-coloma",
    "trailMember": true,
    "url": "https://www.whitepinewinery.com/"
  },
  {
    "id": "contessa",
    "name": "Contessa Wine Cellars",
    "address": "3235 Friday Rd, Coloma, MI 49038",
    "cluster": "st-joseph-coloma",
    "trailMember": true,
    "url": "https://contessawinecellars.com/"
  },
  {
    "id": "filkins",
    "name": "Filkins Vineyards",
    "address": "6991 Ryno Rd, Coloma, MI 49038",
    "cluster": "st-joseph-coloma",
    "trailMember": true,
    "url": "https://filkinsvineyards.com/"
  },
  {
    "id": "fenn-valley",
    "name": "Fenn Valley Vineyards",
    "address": "6130 122nd Ave, Fennville, MI 49408",
    "cluster": "fennville-south-haven",
    "trailMember": true,
    "url": "https://www.fennvalley.com/"
  },
  {
    "id": "modales",
    "name": "Modales Wines",
    "address": "2128 62nd St, Fennville, MI 49408",
    "cluster": "fennville-south-haven",
    "trailMember": false,
    "url": "https://modaleswines.com/",
    "hoursVerified": true
  },
  {
    "id": "cogdal",
    "name": "Cogdal Vineyards",
    "address": "7143 107th Ave, South Haven, MI 49090",
    "cluster": "fennville-south-haven",
    "trailMember": false,
    "url": "https://www.cogdalvineyards.com/",
    "hoursVerified": true
  },
  {
    "id": "st-julian",
    "name": "St. Julian Winery — Paw Paw",
    "address": "716 S Kalamazoo St, Paw Paw, MI 49079",
    "cluster": "paw-paw-kalamazoo",
    "trailMember": false,
    "url": "https://www.stjulian.com/locations/paw-paw/",
    "hoursVerified": true
  },
  {
    "id": "warner",
    "name": "Warner Vineyards — Paw Paw",
    "address": "706 S Kalamazoo St, Paw Paw, MI 49079",
    "cluster": "paw-paw-kalamazoo",
    "trailMember": false,
    "url": "https://warnerwines.com/winery-paw-paw/",
    "hoursVerified": true
  },
  {
    "id": "lawton-ridge",
    "name": "Lawton Ridge Winery",
    "address": "8456 Stadium Dr, Kalamazoo, MI 49009",
    "cluster": "paw-paw-kalamazoo",
    "trailMember": true,
    "url": "https://lawtonridgewinery.com/"
  },
  {
    "id": "cody-kresta",
    "name": "Cody Kresta Vineyard & Winery",
    "address": "45727 27th St, Mattawan, MI 49071",
    "cluster": "paw-paw-kalamazoo",
    "trailMember": true,
    "url": "https://codykrestawinery.com/"
  }
];

const SOUTHWEST_CONTRACT = {
  "schemaVersion": 1,
  "adapter": "michigan-wine-day-southwest",
  "region": {
    "id": "southwest",
    "label": "Southwest Michigan / Lake Michigan Shore",
    "publicLabel": "Southwest Michigan Wine Country",
    "plannerUrl": "https://chrisizworski.com/michigan-wine-day/southwest/",
    "plannerOrigin": "cluster",
    "anchor": {
      "lat": 42.18,
      "lng": -86.25
    },
    "experience": {
      "compactness": "clustered",
      "scenery": "high",
      "villages": "high",
      "variety": "high",
      "relaxedPace": "medium",
      "firstTripAppeal": "high"
    },
    "clusters": {
      "south-berrien": {
        "id": "south-berrien",
        "label": "Baroda / Berrien Springs",
        "anchor": {
          "lat": 41.96,
          "lng": -86.48
        },
        "compactness": "high",
        "presets": {
          "first-trip": [
            "domaine-berrien",
            "lemon-creek",
            "golden-muse"
          ],
          "serious-wine": [
            "domaine-berrien",
            "hickory-creek",
            "lemon-creek"
          ],
          "riesling": [
            "domaine-berrien",
            "hickory-creek",
            "lemon-creek"
          ],
          "sparkling": [
            "golden-muse",
            "domaine-berrien",
            "lemon-creek"
          ],
          "reds": [
            "domaine-berrien",
            "hickory-creek",
            "lemon-creek"
          ],
          "whites": [
            "domaine-berrien",
            "hickory-creek",
            "lemon-creek"
          ],
          "food": [
            "domaine-berrien",
            "golden-muse",
            "lemon-creek"
          ],
          "views": [
            "domaine-berrien",
            "golden-muse",
            "hickory-creek"
          ],
          "quiet": [
            "hickory-creek",
            "domaine-berrien",
            "solasta"
          ]
        }
      },
      "st-joseph-coloma": {
        "id": "st-joseph-coloma",
        "label": "St. Joseph / Benton Harbor / Coloma",
        "anchor": {
          "lat": 42.1,
          "lng": -86.45
        },
        "compactness": "medium",
        "presets": {
          "first-trip": [
            "white-pine",
            "lake-michigan-vintners",
            "twelve-corners"
          ],
          "serious-wine": [
            "white-pine",
            "lake-michigan-vintners",
            "filkins"
          ],
          "riesling": [
            "white-pine",
            "lake-michigan-vintners",
            "twelve-corners"
          ],
          "sparkling": [
            "twelve-corners",
            "white-pine",
            "filkins"
          ],
          "reds": [
            "white-pine",
            "lake-michigan-vintners",
            "filkins"
          ],
          "whites": [
            "white-pine",
            "lake-michigan-vintners",
            "twelve-corners"
          ],
          "food": [
            "white-pine",
            "twelve-corners",
            "contessa"
          ],
          "views": [
            "twelve-corners",
            "lake-michigan-vintners",
            "contessa"
          ],
          "quiet": [
            "filkins",
            "contessa",
            "lake-michigan-vintners"
          ]
        }
      },
      "fennville-south-haven": {
        "id": "fennville-south-haven",
        "label": "Fennville / South Haven",
        "anchor": {
          "lat": 42.53,
          "lng": -86.17
        },
        "compactness": "medium",
        "presets": {
          "first-trip": [
            "fenn-valley",
            "modales",
            "cogdal"
          ],
          "serious-wine": [
            "modales",
            "fenn-valley",
            "cogdal"
          ],
          "riesling": [
            "fenn-valley",
            "modales",
            "cogdal"
          ],
          "sparkling": [
            "fenn-valley",
            "modales",
            "cogdal"
          ],
          "reds": [
            "modales",
            "fenn-valley",
            "cogdal"
          ],
          "whites": [
            "fenn-valley",
            "modales",
            "cogdal"
          ],
          "food": [
            "modales",
            "fenn-valley",
            "cogdal"
          ],
          "views": [
            "modales",
            "cogdal",
            "fenn-valley"
          ],
          "quiet": [
            "cogdal",
            "modales",
            "fenn-valley"
          ]
        }
      },
      "paw-paw-kalamazoo": {
        "id": "paw-paw-kalamazoo",
        "label": "Paw Paw / Kalamazoo",
        "anchor": {
          "lat": 42.22,
          "lng": -85.89
        },
        "compactness": "medium",
        "presets": {
          "first-trip": [
            "st-julian",
            "warner",
            "lawton-ridge"
          ],
          "serious-wine": [
            "st-julian",
            "warner",
            "cody-kresta"
          ],
          "riesling": [
            "st-julian",
            "warner",
            "cody-kresta"
          ],
          "sparkling": [
            "warner",
            "st-julian",
            "lawton-ridge"
          ],
          "reds": [
            "st-julian",
            "warner",
            "cody-kresta"
          ],
          "whites": [
            "st-julian",
            "cody-kresta",
            "lawton-ridge"
          ],
          "food": [
            "warner",
            "st-julian",
            "lawton-ridge"
          ],
          "views": [
            "cody-kresta",
            "lawton-ridge",
            "st-julian"
          ],
          "quiet": [
            "cody-kresta",
            "lawton-ridge",
            "st-julian"
          ]
        }
      }
    }
  },
  "inventory": {
    "modeledStopCount": 17,
    "officialTrailMemberCount": 14,
    "knownHoursCount": 4,
    "unknownHoursCount": 13,
    "foodSignalCount": 3,
    "viewSignalCount": 5
  },
  "intentEvidence": {
    "first-trip": 5,
    "serious-wine": 7,
    "riesling": 4,
    "sparkling": 3,
    "reds": 7,
    "whites": 7,
    "food": 3,
    "views": 5,
    "quiet": 5
  },
  "operatingByWeekday": {
    "Sunday": {
      "knownOpen": 4,
      "knownClosed": 0,
      "unknown": 13
    },
    "Monday": {
      "knownOpen": 4,
      "knownClosed": 0,
      "unknown": 13
    },
    "Tuesday": {
      "knownOpen": 4,
      "knownClosed": 0,
      "unknown": 13
    },
    "Wednesday": {
      "knownOpen": 4,
      "knownClosed": 0,
      "unknown": 13
    },
    "Thursday": {
      "knownOpen": 4,
      "knownClosed": 0,
      "unknown": 13
    },
    "Friday": {
      "knownOpen": 4,
      "knownClosed": 0,
      "unknown": 13
    },
    "Saturday": {
      "knownOpen": 4,
      "knownClosed": 0,
      "unknown": 13
    }
  },
  "localDrive": {
    "medianNearestNeighborMiles": null,
    "spreadMiles": null,
    "note": "Region is intentionally evaluated by visitor cluster rather than one statewide-style loop."
  },
  "freshness": {
    "wineryTruthReviewedAt": "2026-10-06",
    "hoursReviewedLabel": "Mixed coverage; four current official weekly schedules verified October 6, 2026",
    "officialMembershipVerifiedAt": "2026-10-06"
  },
  "truthRules": {
    "unknownIsFalse": false,
    "unknownHoursMeaning": "not verified; confirm on the winery's official site before leaving",
    "reservationAvailabilityKnown": false,
    "tastingFeesKnown": false
  },
  "handoff": {
    "plannerUrl": "https://chrisizworski.com/michigan-wine-day/southwest/",
    "plannerOrigin": "cluster",
    "area": "cluster",
    "source": "southwest-cluster-adapter"
  },
  "evidenceSources": [
    "https://miwinetrail.com/memberwineries",
    "https://miwinetrail.com/directory",
    "https://www.domaineberrien.com/our-vineyards",
    "https://www.fennvalley.com/",
    "https://modaleswines.com/",
    "https://www.cogdalvineyards.com/",
    "https://www.stjulian.com/locations/paw-paw/",
    "https://warnerwines.com/winery-paw-paw/"
  ]
};

function southwestCluster(id) {
  return SOUTHWEST_CONTRACT.region.clusters[id] || null;
}

function southwestPlan(clusterId, intent = "first-trip") {
  const cluster = southwestCluster(clusterId);
  if (!cluster) return null;
  const selectedIds = cluster.presets[intent] || cluster.presets["first-trip"];
  const byId = new Map(SOUTHWEST_VENUES.map((venue) => [venue.id, venue]));
  return {
    cluster: { id: cluster.id, label: cluster.label },
    intent,
    venues: selectedIds.map((id) => byId.get(id)).filter(Boolean),
    truthNote: "Hours and reservation rules vary by winery. Unknown means unverified, not closed.",
  };
}

module.exports = {
  TC_FALLBACKS,
  PETOSKEY_FALLBACK,
  SOUTHWEST_CONTRACT,
  SOUTHWEST_VENUES,
  southwestCluster,
  southwestPlan,
};
