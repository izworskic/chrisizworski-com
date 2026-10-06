'use strict';

const CENSUS_GEOCODER = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';
const CENSUS_ACS = 'https://api.census.gov/data/2024/acs/acs5';
const FEMA_NFHL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query';
const FRED_CSV = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US';
let mortgageCache = null;

async function fetchText(url, { timeoutMs = 6500, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'chrisizworski.com-house-fit/1.0', Accept: 'application/json,text/plain,*/*', ...headers },
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.text();
  } finally { clearTimeout(timer); }
}
async function fetchJson(url, options) { return JSON.parse(await fetchText(url, options)); }

async function geocodeAddress(address) {
  const clean = String(address || '').trim();
  if (clean.length < 6) return { status: 'INVALID', matched: false };
  const params = new URLSearchParams({ address: clean, benchmark: 'Public_AR_Current', vintage: 'Current_Current', format: 'json' });
  try {
    const data = await fetchJson(CENSUS_GEOCODER + '?' + params);
    const match = data?.result?.addressMatches?.[0];
    if (!match) return { status: 'NO_MATCH', matched: false, source: 'U.S. Census Geocoder' };
    const geos = match.geographies || {};
    const county = geos.Counties?.[0] || null;
    const state = geos.States?.[0] || null;
    const tract = geos['Census Tracts']?.[0] || null;
    return {
      status: 'MATCHED', matched: true, matchedAddress: match.matchedAddress || clean,
      lon: Number(match.coordinates?.x), lat: Number(match.coordinates?.y),
      stateFips: state?.STATE || county?.STATE || tract?.STATE || null,
      countyFips: county?.COUNTY || tract?.COUNTY || null,
      countyName: county?.NAME || null, tract: tract?.TRACT || null,
      source: 'U.S. Census Geocoder',
      sourceUrl: 'https://www.census.gov/programs-surveys/geography/technical-documentation/complete-technical-documentation/census-geocoder.html',
    };
  } catch (error) {
    return { status: 'UNAVAILABLE', matched: false, source: 'U.S. Census Geocoder', error: String(error.message || error) };
  }
}

async function fetchTaxPlanning(addressInfo) {
  if (!addressInfo?.stateFips || !addressInfo?.countyFips) return { status: 'UNAVAILABLE' };
  const params = new URLSearchParams({
    get: 'NAME,B25103_001E,B25077_001E',
    for: 'county:' + addressInfo.countyFips,
    in: 'state:' + addressInfo.stateFips,
  });
  try {
    const data = await fetchJson(CENSUS_ACS + '?' + params);
    if (!Array.isArray(data) || data.length < 2) throw new Error('Unexpected ACS response');
    const values = Object.fromEntries(data[0].map((key, i) => [key, data[1][i]]));
    const medianTax = Number(values.B25103_001E);
    const medianValue = Number(values.B25077_001E);
    if (!(medianTax > 0) || !(medianValue > 0)) throw new Error('ACS tax/value estimate unavailable');
    return {
      status: 'AVAILABLE', medianAnnualTax: medianTax, medianOwnerOccupiedValue: medianValue,
      effectiveRatePct: (medianTax / medianValue) * 100, geography: values.NAME,
      sourceDate: '2024 ACS 5-year', source: 'U.S. Census Bureau American Community Survey',
      sourceUrl: 'https://api.census.gov/data/2024/acs/acs5/groups/B25103.html',
      caveat: 'County medians are a planning proxy, not a parcel tax bill or prediction of post-sale reassessment.',
    };
  } catch (error) {
    return { status: 'UNAVAILABLE', source: 'U.S. Census Bureau American Community Survey', error: String(error.message || error) };
  }
}

async function fetchFloodZone(addressInfo) {
  const lat = Number(addressInfo?.lat), lon = Number(addressInfo?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { status: 'UNAVAILABLE' };
  const params = new URLSearchParams({
    geometry: lon + ',' + lat, geometryType: 'esriGeometryPoint', inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects', outFields: 'FLD_ZONE,SFHA_TF,ZONE_SUBTY,STATIC_BFE',
    returnGeometry: 'false', f: 'json',
  });
  try {
    const data = await fetchJson(FEMA_NFHL + '?' + params, { timeoutMs: 8000 });
    const attrs = data?.features?.[0]?.attributes;
    if (!attrs) return {
      status: 'NO_FEATURE', sfha: false, source: 'FEMA National Flood Hazard Layer',
      sourceUrl: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28',
      note: 'No NFHL flood-hazard polygon was returned for this point. Verify with FEMA Map Service Center before relying on this result.',
    };
    const zone = attrs.FLD_ZONE || 'Unknown';
    const sfha = String(attrs.SFHA_TF || '').toUpperCase() === 'T' || /^(A|V)/i.test(zone);
    const bfe = Number(attrs.STATIC_BFE);
    return {
      status: 'AVAILABLE', zone, subtype: attrs.ZONE_SUBTY || null, sfha,
      staticBfe: Number.isFinite(bfe) && bfe > -9000 ? bfe : null,
      source: 'FEMA National Flood Hazard Layer',
      sourceUrl: 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28',
      note: sfha
        ? 'This point is in a FEMA Special Flood Hazard Area. A lender may require flood insurance; this service does not provide an insurance premium.'
        : 'FEMA flood-zone information is supporting context, not a property survey or insurance quote.',
    };
  } catch (error) {
    return { status: 'UNAVAILABLE', source: 'FEMA National Flood Hazard Layer', error: String(error.message || error) };
  }
}

async function fetchCurrentMortgageRate() {
  const now = Date.now();
  if (mortgageCache && now - mortgageCache.cachedAt < 21600000) return mortgageCache.value;
  try {
    const csv = await fetchText(FRED_CSV, { headers: { Accept: 'text/csv,text/plain,*/*' } });
    const lines = csv.trim().split(/\r?\n/).slice(1);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const parts = lines[i].split(',');
      const rate = Number(parts[1]);
      if (parts[0] && Number.isFinite(rate)) {
        const value = {
          status: 'AVAILABLE', ratePct: rate, observationDate: parts[0], series: 'MORTGAGE30US',
          provenance: 'GOVERNMENT SOURCED', source: 'Freddie Mac PMMS via FRED',
          sourceUrl: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
        };
        mortgageCache = { cachedAt: now, value };
        return value;
      }
    }
    throw new Error('No valid FRED observation');
  } catch (error) {
    return {
      status: 'UNAVAILABLE', ratePct: 6.5, observationDate: null, series: 'MORTGAGE30US',
      provenance: 'MODELED', source: 'Fallback planning assumption', error: String(error.message || error),
    };
  }
}

async function enrichHouse(address) {
  const mortgageRatePromise = fetchCurrentMortgageRate();
  const addressInfo = await geocodeAddress(address);
  let tax = { status: 'UNAVAILABLE' }, flood = { status: 'UNAVAILABLE' };
  if (addressInfo.matched) [tax, flood] = await Promise.all([fetchTaxPlanning(addressInfo), fetchFloodZone(addressInfo)]);
  return { address: addressInfo, tax, flood, mortgageRate: await mortgageRatePromise };
}

module.exports = { CENSUS_GEOCODER, CENSUS_ACS, FEMA_NFHL, FRED_CSV, geocodeAddress, fetchTaxPlanning, fetchFloodZone, fetchCurrentMortgageRate, enrichHouse };
