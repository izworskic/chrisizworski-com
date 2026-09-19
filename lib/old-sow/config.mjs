export const EASTPORT_TIDE_STATION = Object.freeze({
  id: '8410140',
  name: 'Eastport, ME',
  kind: 'tide',
  timeZone: 'America/New_York',
  source: 'NOAA CO-OPS'
});

export const CURRENT_STATIONS = Object.freeze([
  { id: 'ACT0101', name: 'Western Passage, off Kendall Head', role: 'primary-provisional' },
  { id: 'ACT0091', name: 'Eastport, Friar Roads', role: 'comparison' },
  { id: 'EPT0003', name: 'Estes Head, Eastport', role: 'dense-series-comparison' }
]);

export const VIEWPOINTS = Object.freeze([
  {
    id: 'deer-point',
    name: 'Deer Island Point Park',
    shortName: 'Deer Point',
    country: 'Canada',
    timeZone: 'America/Moncton',
    lat: 44.926838,
    lon: -66.984882,
    accessPrecision: 'park-location',
    note: 'Best credible land view. The exact whirlpool location shifts with the current; this pin marks the park, not the vortex.',
    directionsUrl: 'https://www.google.com/maps/search/?api=1&query=Deer+Island+Point+Park+New+Brunswick'
  },
  {
    id: 'eastport',
    name: 'Eastport waterfront',
    shortName: 'Eastport',
    country: 'United States',
    timeZone: 'America/New_York',
    lat: 44.9065,
    lon: -66.9893,
    accessPrecision: 'area',
    note: 'Farther from Old Sow than Deer Point. Use this as an Eastport-side orientation area, not a promise of an unobstructed vortex view.',
    directionsUrl: 'https://www.google.com/maps/search/?api=1&query=Eastport+Maine+waterfront'
  }
]);

export const AREA = Object.freeze({
  lat: 44.9239,
  lon: -66.9866,
  mapZoom: 13
});

// NWS points must resolve inside the U.S. forecast grid. This Eastport land
// point is used only as nearby official visibility/weather context and is
// labeled as such; it is not treated as weather observed at Old Sow.
export const WEATHER_POINT = Object.freeze({
  lat: 44.9066,
  lon: -66.9910,
  label: 'Eastport, Maine NWS grid point'
});

export const ENGINE_VERSION = 'old-sow-engine/1.0.0';
export const CACHE_TTL_MS = 5 * 60 * 1000;
export const STALE_LIMIT_MS = 6 * 60 * 60 * 1000;
export const NOAA_APP = 'OldSowLive';

export const PUBLIC_SOURCES = Object.freeze({
  noaaOldSow: 'https://oceanservice.noaa.gov/facts/old-sow.html',
  noaaApi: 'https://api.tidesandcurrents.noaa.gov/api/prod/',
  noaaStation: 'https://tidesandcurrents.noaa.gov/stationhome.html?id=8410140',
  noaaCurrentMetadata: 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=currentpredictions',
  nws: 'https://api.weather.gov/',
  tourismListing: 'https://tourismnewbrunswick.ca/listing/old-sow-whirlpool',
  tourismStory: 'https://tourismnewbrunswick.ca/story/perfect-weekend-deer-island-through-eyes-local',
  deerIslandFerry: 'https://deerisland.coastaltransport.ca/',
  campobelloFerry: 'https://eastcoastferriesltd.com/'
});
