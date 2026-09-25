'use strict';

const PATHS = Object.freeze({
  circle: '/lake-superior-circle-tour/index.html',
  live: '/mackinac-bridge-live/index.html',
  toll: '/mackinac-bridge-tolls/index.html',
});

function replaceOnce(html, from, to, label) {
  if (html.includes(to)) return html;
  if (!html.includes(from)) {
    throw new Error(`Trip journey link anchor missing: ${label}`);
  }
  return html.replace(from, to);
}

function connectCircleTour(html) {
  if (html.includes('data-journey-link="mackinac-live"')) return html;

  const from = `        <div class="p-card"><strong>Driving up through Mackinac?</strong>If your route to or from the tour crosses the Straits, check <a href="/mackinac-bridge-live/">Mackinac Bridge Live</a> for the official status, both cameras, NWS radar, RV or trailer rules, approach-road events, and tolls.</div>`;
  const to = `        <div class="p-card" data-journey-link="mackinac-live"><strong>Lower Michigan gateway · Right now</strong>The Mackinac Bridge is not one of the 31 Circle Tour stops, but it is the practical gateway for many travelers driving up from Lower Michigan. Before committing to the drive north, check <a href="/mackinac-bridge-live/">Mackinac Bridge Live</a> for the official status, cameras, wind restrictions, radar, and approach-road events.</div>\n        <div class="p-card" data-journey-link="mackinac-toll"><strong>Lower Michigan gateway · Cost</strong>Budget the crossing separately from the Circle Tour itself. The <a href="/mackinac-bridge-tolls/">Mackinac Bridge toll guide</a> gives the current passenger-car fare, round-trip context, payment methods, and the RV/trailer calculator.</div>`;
  return replaceOnce(html, from, to, 'Circle Tour Mackinac gateway card');
}

function connectLiveBridge(html) {
  if (html.includes('data-journey-link="circle-tour"')) return html;

  const from = `<p class="section-intro" style="margin:22px 0 4px"><em>Crossing on the way north? <a href="/up-north-michigan/">Check the rest of the trip</a>.</em></p></main>`;
  const to = `<p class="section-intro" style="margin:22px 0 4px" data-journey-link="circle-tour"><em>Crossing north for Lake Superior? <a href="/lake-superior-circle-tour/" data-growth-cta="mackinac-live-circle-tour">Continue into the Lake Superior Circle Tour planner</a>. Staying in the U.P.? <a href="/up-north-michigan/">Check the rest of the trip</a>.</em></p></main>`;
  return replaceOnce(html, from, to, 'Mackinac Bridge Live northbound handoff');
}

function connectTollGuide(html) {
  if (html.includes('data-journey-link="circle-tour"')) return html;

  const from = `        <a href="/mackinac-bridge-driver-assistance/"><strong>Driver assistance</strong><span>Current charge, Bridge Services number and request locations</span></a>\n      </div>`;
  const to = `        <a href="/mackinac-bridge-driver-assistance/"><strong>Driver assistance</strong><span>Current charge, Bridge Services number and request locations</span></a>\n        <a href="/lake-superior-circle-tour/" data-growth-cta="mackinac-toll-circle-tour" data-journey-link="circle-tour"><strong>Lake Superior Circle Tour</strong><span>Crossing north for Lake Superior? Continue into the 31-stop, 7–15 day trip planner.</span></a>\n      </div>`;
  return replaceOnce(html, from, to, 'Mackinac toll Circle Tour handoff');
}

function tripJourneyLinks(html, pathname) {
  if (pathname === PATHS.circle) return connectCircleTour(html);
  if (pathname === PATHS.live) return connectLiveBridge(html);
  if (pathname === PATHS.toll) return connectTollGuide(html);
  return html;
}

tripJourneyLinks.PATHS = PATHS;
module.exports = tripJourneyLinks;
