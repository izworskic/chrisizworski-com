'use strict';
const { normalize } = require('./soo-ais');
const BBOX = [41, -93, 49, -76];
// 82 square degrees, within the provider's anonymous 100-square-degree cap.
const BOXES = [[46, -93, 49, -84], [41, -88, 46, -81], [41, -81, 45, -76]];

async function loadFreighterFeed(timeoutMs = 9000) {
  const headers = {Accept:'application/geo+json,application/json','User-Agent':'GreatLakesShipTracker/1.0 (+https://chrisizworski.com/great-lakes-freighter-tracking/)'};
  if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.OPEN_WATERS_API_TOKEN;
  const upstream = await fetch('https://ais.openwaters.io/v1/vessels?' + BOXES.map(box => 'bbox=' + box.join(',')).join('&'), {headers,signal:AbortSignal.timeout(timeoutMs)});
  if (!upstream.ok) throw new Error('AIS provider unavailable');
  return normalize(await upstream.json(), Date.now(), BBOX);
}
module.exports = { loadFreighterFeed };
