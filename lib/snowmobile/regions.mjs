/*
 * Statewide region roster for Michigan Snowmobile Conditions.
 *
 * Grounded in the Michigan DNR DNRTrailsOPENDATA County field (queried live
 * Sep 20 2026): 4,373 designated snowmobile trail segments across 55
 * counties. These seven regions cover the state's primary, snow-reliable
 * riding belt (Upper Peninsula + northern Lower Peninsula), roughly 3,600 of
 * those 4,373 segments (~83%). The remaining ~750 segments sit in southern
 * and scattered counties (Cass, Allegan, Van Buren, Berrien, Barry, Kent,
 * Montcalm, Sanilac, Huron, Kalamazoo, Ottawa, Mecosta, Gladwin, Clare,
 * Osceola, Mason, Muskegon) that are largely ORV/rail-trail connectors
 * outside the reliable-snow belt. They are deliberately out of scope for a
 * riding-conditions product rather than silently dropped: see
 * OUT_OF_SCOPE_NOTE below, which the UI states plainly.
 *
 * "grayling-gaylord" is the original, deeply-built corridor (bbox-based
 * fetch, four lat-banded sections, two verified MISORVA club reports, an
 * MDOT camera). It keeps its existing fetch path unchanged in sources.mjs.
 * The other six regions use a county-filtered statewide fetch and do not
 * yet have a verified local club-report source or camera wired in; the API
 * and UI say so honestly rather than fabricating one.
 */

export const OUT_OF_SCOPE_NOTE = 'Coverage is the state\u2019s primary snowmobiling belt: the Upper Peninsula and northern Lower Peninsula. Scattered downstate trail segments outside this belt are not scored because that area rarely holds a reliable riding season.';

export const REGIONS = [
  {
    key: 'eastern-up',
    label: 'Eastern Upper Peninsula',
    shortLabel: 'Eastern U.P.',
    hubTown: 'Sault Ste. Marie',
    hubLat: 46.4953,
    hubLon: -84.3453,
    counties: ['Chippewa', 'Mackinac', 'Luce', 'Schoolcraft', 'Alger'],
    mapCenter: [46.35, -85.6],
    description: 'The state\u2019s single largest trail concentration, anchored by Sault Ste. Marie and the Trail 8/Trail 415 network toward Naubinway and St. Ignace.'
  },
  {
    key: 'keweenaw-copper-country',
    label: 'Keweenaw & Copper Country',
    shortLabel: 'Keweenaw',
    hubTown: 'Houghton',
    hubLat: 47.1211,
    hubLon: -88.5699,
    counties: ['Houghton', 'Keweenaw', 'Ontonagon', 'Baraga'],
    mapCenter: [47.0, -88.6],
    description: 'The lake-effect snowbelt of the Keweenaw Peninsula, usually the deepest and most reliable natural snowpack in the state.'
  },
  {
    key: 'central-western-up',
    label: 'Central & Western Upper Peninsula',
    shortLabel: 'Central/Western U.P.',
    hubTown: 'Marquette',
    hubLat: 46.5436,
    hubLon: -87.3954,
    counties: ['Marquette', 'Dickinson', 'Iron', 'Delta', 'Menominee', 'Gogebic'],
    mapCenter: [46.2, -88.0],
    description: 'Marquette to the Wisconsin border, including the Iron Range and the Gogebic Range around Ironwood and Bessemer.'
  },
  {
    key: 'grayling-gaylord',
    label: 'Grayling \u2192 Frederic \u2192 Waters \u2192 Gaylord',
    shortLabel: 'Grayling\u2013Gaylord',
    hubTown: 'Grayling',
    hubLat: 44.6614,
    hubLon: -84.7148,
    counties: ['Crawford', 'Otsego'],
    mapCenter: [44.84, -84.68],
    description: 'The original corridor build: bottleneck-aware section scoring, two verified club reports and a live MDOT camera.',
    legacyCorridor: true,
    clubs: {
      grayling: { misorvaKey: 'grayling', name: 'Greater Grayling Snowmobile Association', sections: ['grayling', 'frederic'] },
      gaylord: { misorvaKey: 'gaylord', name: 'Gaylord Area Snowmobile Trails Council', sections: ['waters', 'gaylord'] }
    },
    cameraId: 'i75-grayling'
  },
  {
    key: 'northeast-sunrise',
    label: 'Northeast Michigan / Sunrise Side',
    shortLabel: 'Sunrise Side',
    hubTown: 'Cheboygan',
    hubLat: 45.6478,
    hubLon: -84.4750,
    counties: ['Cheboygan', 'Montmorency', 'Presque Isle', 'Alpena', 'Alcona', 'Oscoda', 'Iosco'],
    mapCenter: [44.9, -83.9],
    description: 'The Lake Huron side of the northern Lower Peninsula, from Cheboygan down through Atlanta and Mio to Oscoda.'
  },
  {
    key: 'northwest-michigan',
    label: 'Northwest Michigan',
    shortLabel: 'Northwest MI',
    hubTown: 'Petoskey',
    hubLat: 45.3733,
    hubLon: -84.9553,
    counties: ['Emmet', 'Antrim', 'Charelvoix', 'Grand Traverse', 'Kalkaska'],
    mapCenter: [45.0, -85.1],
    description: 'Petoskey, Boyne, and Traverse City country, running south into the Kalkaska trail network.'
  },
  {
    key: 'west-michigan',
    label: 'West Michigan (Cadillac\u2013Manistee\u2013Baldwin)',
    shortLabel: 'West Michigan',
    hubTown: 'Cadillac',
    hubLat: 44.2520,
    hubLon: -85.4012,
    counties: ['Wexford', 'Manistee', 'Missaukee', 'Lake', 'Newaygo', 'Oceana'],
    mapCenter: [44.1, -85.7],
    description: 'The Cadillac and Baldwin trail systems, Michigan\u2019s southernmost concentration of reliably groomed snowmobile trail.'
  }
];

export function regionByKey(key) {
  return REGIONS.find((r) => r.key === key) || null;
}
