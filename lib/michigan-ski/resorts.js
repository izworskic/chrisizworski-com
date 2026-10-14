'use strict';
// Ski destinations: location coordinates and drive minutes are APPROXIMATE planning inputs,
// not surveyed resort entrance points, live routing, or road-time guarantees.
// Prices are 2026-27 posted adult DAY-session rates when unambiguous; dynamic prices stay null.
const RESORTS=[
  {
    "slug": "boyne-mountain",
    "name": "Boyne Mountain",
    "location": "Boyne Falls",
    "lat": 45.163,
    "lon": -84.93,
    "region": "northern-lower",
    "driveMinutes": {
      "detroit": 255,
      "grandRapids": 185
    },
    "tickets": "https://www.boynemountain.com/lift-tickets",
    "snow": "https://www.boynemountain.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "Family terrain, substantial snowmaking and multiple lift options",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "the-highlands",
    "name": "The Highlands (formerly Boyne Highlands)",
    "location": "Harbor Springs",
    "lat": 45.47,
    "lon": -84.935,
    "region": "northern-lower",
    "driveMinutes": {
      "detroit": 280,
      "grandRapids": 220
    },
    "tickets": "https://www.highlandsharborsprings.com/lift-tickets",
    "snow": "https://www.highlandsharborsprings.com/mountain-report",
    "priceNote": "from $36",
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "Harbor Springs mountain; verify snowmaking and trail openings",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "crystal-mountain",
    "name": "Crystal Mountain",
    "location": "Thompsonville",
    "lat": 44.52,
    "lon": -85.992,
    "region": "northern-lower",
    "driveMinutes": {
      "detroit": 260,
      "grandRapids": 135
    },
    "tickets": "https://www.crystalmountain.com/ski/",
    "snow": "https://www.crystalmountain.com/ski/cams-conditions/mountain-report",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "Northern Lower Peninsula family ski destination",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "nubs-nob",
    "name": "Nub's Nob",
    "location": "Harbor Springs",
    "lat": 45.47,
    "lon": -84.9,
    "region": "northern-lower",
    "driveMinutes": {
      "detroit": 285,
      "grandRapids": 225
    },
    "tickets": "https://shop.nubsnob.com/tickets",
    "snow": "https://www.nubsnob.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "Independent Harbor Springs hill; check grooming and operating schedule",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "shanty-creek",
    "name": "Shanty Creek (Schuss Mountain)",
    "location": "Mancelona",
    "lat": 44.948,
    "lon": -85.144,
    "region": "northern-lower",
    "driveMinutes": {
      "detroit": 260,
      "grandRapids": 175
    },
    "tickets": "https://www.shantycreek.com/ski/lift-tickets-season-passes/",
    "snow": "https://www.shantycreek.com/ski/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": 115,
      "sun": 95
    },
    "kind": "downhill",
    "note": "Schuss Mountain skiing; distinguish from Shanty Creek lodging villages",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "caberfae-peaks",
    "name": "Caberfae Peaks",
    "location": "Cadillac",
    "lat": 44.245,
    "lon": -85.72,
    "region": "northern-lower",
    "driveMinutes": {
      "detroit": 225,
      "grandRapids": 100
    },
    "tickets": "https://caberfaepeaks.com/home/lift-rates/",
    "snow": "https://caberfaepeaks.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": 84,
      "sun": 74
    },
    "kind": "downhill",
    "note": "Value-oriented downhill destination near Cadillac",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "treetops",
    "name": "Treetops Resort",
    "location": "Gaylord",
    "lat": 45.026,
    "lon": -84.596,
    "region": "northern-lower",
    "driveMinutes": {
      "detroit": 240,
      "grandRapids": 205
    },
    "tickets": "https://www.treetops.com/",
    "snow": "https://www.treetops.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "Gaylord skiing with nearby Lake Michigan and Lake Huron snow-belt influences",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "garland-lodge",
    "name": "Garland Lodge Nordic Center",
    "location": "Lewiston",
    "lat": 44.841,
    "lon": -84.298,
    "region": "northern-lower",
    "driveMinutes": {
      "detroit": 250,
      "grandRapids": 225
    },
    "tickets": "https://golfgarland.com/winter/nordic-center/",
    "snow": "https://golfgarland.com/winter/nordic-center/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "nordic",
    "note": "Cross-country skiing only; no verified lift-served downhill operation",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "mt-holly",
    "name": "Mt. Holly",
    "location": "Holly",
    "lat": 42.83,
    "lon": -83.595,
    "region": "southern-lower",
    "driveMinutes": {
      "detroit": 55,
      "grandRapids": 140
    },
    "tickets": "https://skimtholly.com/lift-tickets/",
    "snow": "https://skimtholly.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": 73,
      "sun": 73
    },
    "kind": "downhill",
    "note": "Southeast Michigan day-session hill; full-day ticket differs from day ticket",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "pine-knob",
    "name": "Pine Knob",
    "location": "Clarkston",
    "lat": 42.745,
    "lon": -83.378,
    "region": "southern-lower",
    "driveMinutes": {
      "detroit": 45,
      "grandRapids": 155
    },
    "tickets": "https://skipineknob.com/lift-tickets/",
    "snow": "https://skipineknob.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": 73,
      "sun": 73
    },
    "kind": "downhill",
    "note": "Oakland County option; verify day versus full-day admission",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "alpine-valley",
    "name": "Alpine Valley",
    "location": "White Lake",
    "lat": 42.648,
    "lon": -83.514,
    "region": "southern-lower",
    "driveMinutes": {
      "detroit": 65,
      "grandRapids": 155
    },
    "tickets": "https://skialpinevalley.com/lift-tickets/",
    "snow": "https://skialpinevalley.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": 73,
      "sun": 73
    },
    "kind": "downhill",
    "note": "Southeast Michigan day-session slope",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "cannonsburg",
    "name": "Cannonsburg",
    "location": "Belmont",
    "lat": 43.055,
    "lon": -85.5,
    "region": "southern-lower",
    "driveMinutes": {
      "detroit": 165,
      "grandRapids": 25
    },
    "tickets": "https://cannonsburg.com/",
    "snow": "https://cannonsburg.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "Closest in this list to Grand Rapids; operating schedule matters",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "mt-bohemia",
    "name": "Mount Bohemia",
    "location": "Lac La Belle",
    "lat": 47.39,
    "lon": -88.02,
    "region": "western-up",
    "driveMinutes": {
      "detroit": 595,
      "grandRapids": 565
    },
    "tickets": "https://www.mtbohemia.com/",
    "snow": "https://www.mtbohemia.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "Ungroomed expert-focused natural snow terrain; not a beginner destination",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "marquette-mountain",
    "name": "Marquette Mountain",
    "location": "Marquette",
    "lat": 46.501,
    "lon": -87.423,
    "region": "central-up",
    "driveMinutes": {
      "detroit": 460,
      "grandRapids": 395
    },
    "tickets": "https://www.marquettemountain.com/",
    "snow": "https://www.marquettemountain.com/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "Marquette hill exposed to Lake Superior snow patterns",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "big-powderhorn",
    "name": "Big Powderhorn",
    "location": "Bessemer",
    "lat": 46.506,
    "lon": -90.087,
    "region": "western-up",
    "driveMinutes": {
      "detroit": 550,
      "grandRapids": 480
    },
    "tickets": "https://bigpowderhorn.net/lift-tickets/",
    "snow": "https://bigpowderhorn.net/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": 99,
      "sun": 99
    },
    "kind": "downhill",
    "note": "Western U.P. ski area with significant lake-effect potential",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "snowriver",
    "name": "Snowriver Mountain Resort",
    "location": "Wakefield",
    "lat": 46.504,
    "lon": -89.969,
    "region": "western-up",
    "driveMinutes": {
      "detroit": 560,
      "grandRapids": 495
    },
    "tickets": "https://www.snowriver.com/plan-purchase/tickets-passes-1",
    "snow": "https://www.snowriver.com/",
    "priceNote": "from $67 early booking",
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "Jackson Creek Summit and Black River Basin; verify which lifts are operating",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "ski-brule",
    "name": "Ski Brule",
    "location": "Iron River",
    "lat": 46.025,
    "lon": -88.702,
    "region": "central-up",
    "driveMinutes": {
      "detroit": 485,
      "grandRapids": 430
    },
    "tickets": "https://skibrule.com/rates-specials/tickets-passes/",
    "snow": "https://skibrule.com/brule-mountain/snow-conditions/",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": 79,
      "sun": 79
    },
    "kind": "downhill",
    "note": "Resort-posted daily adult tickets and ski-condition reports",
    "verifiedPricesAsOf": "2026-10-14"
  },
  {
    "slug": "porcupine-mountains",
    "name": "Porcupine Mountains Winter Sports Complex",
    "location": "Ontonagon",
    "lat": 46.815,
    "lon": -89.63,
    "region": "western-up",
    "driveMinutes": {
      "detroit": 600,
      "grandRapids": 535
    },
    "tickets": "https://www.michigan.gov/skitheporkies",
    "snow": "https://www.michigan.gov/skitheporkies/the-mountain",
    "priceNote": null,
    "adultDayPrice2026": {
      "sat": null,
      "sun": null
    },
    "kind": "downhill",
    "note": "State-managed ski hill, Friday–Monday regular operations when in season",
    "verifiedPricesAsOf": "2026-10-14"
  }
];
module.exports={RESORTS,bySlug:(slug)=>RESORTS.find(r=>r.slug===slug)||null};
