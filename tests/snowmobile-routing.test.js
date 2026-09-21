import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrailGraph, nearestNode, shortestPath, planRoute, haversineMiles } from '../lib/snowmobile/routing.mjs';

// Small grid of real-ish Michigan-latitude coordinates. 0.01 degrees of
// latitude is close enough to a fixed ~0.69 mi at this latitude for
// predictable fixture math; exact distances are computed with the same
// haversineMiles the module itself uses, not hardcoded, so the assertions
// stay correct even if the constant changes.
const A = [-85.0000, 44.0000];
const B = [-85.0000, 44.0100]; // straight north of A
const D = [-85.0000, 44.0200]; // straight north of B
const C = [-84.8000, 44.0100]; // far east detour point
const FAR_AWAY = [-83.0000, 43.0000]; // well outside snap tolerance of anything above

function feature(id, coords, props = {}) {
  return { type: 'Feature', properties: { id, trailNetwork: id, band: 'GOOD', score: 80, miles: null, officialStatus: 'Open', legalState: 'DNR_STATUS_OPEN_NO_TEMP_CLOSURE_MATCH', ...props }, geometry: { type: 'LineString', coordinates: coords } };
}
function fc(features) { return { type: 'FeatureCollection', features }; }

test('buildTrailGraph connects two segments that share an endpoint into one routable network', () => {
  const graph = buildTrailGraph(fc([feature('s1', [A, B]), feature('s2', [B, D])]));
  // A, B, D collapse to 3 distinct junction nodes (B is shared, not duplicated)
  assert.equal(graph.nodes.size, 3);
  assert.equal(graph.edges.length, 2);
  assert.equal(graph.closedSegmentsExcluded, 0);
});

test('buildTrailGraph merges near-but-not-identical endpoints within snap tolerance', () => {
  const bNear = [B[0] + 0.00005, B[1]]; // a few meters off from B, well under the 20m tolerance
  const graph = buildTrailGraph(fc([feature('s1', [A, B]), feature('s2', [bNear, D])]));
  assert.equal(graph.nodes.size, 3, 'the two near-identical B endpoints should merge into a single junction node');
});

test('buildTrailGraph excludes a segment closed via band, independent of legalState or officialStatus wording', () => {
  const graph = buildTrailGraph(fc([
    feature('s1', [A, B], { band: 'CLOSED', legalState: 'CLOSED_TEMPORARY_LAYER' }),
    feature('s2', [B, D]),
  ]));
  assert.equal(graph.edges.length, 1, 'only the non-closed segment should become a routable edge');
  assert.equal(graph.closedSegmentsExcluded, 1);
});

test('buildTrailGraph excludes an off-season temporary closure that scoreSegment could only express through legalState, not band', () => {
  // Mirrors engine.mjs scoreSegment's off-season short-circuit: band comes
  // back 'OFF_SEASON' even when a temporary closure matched, and the match
  // only survives in legalState.
  const graph = buildTrailGraph(fc([
    feature('s1', [A, B], { band: 'OFF_SEASON', score: null, legalState: 'CLOSED' }),
    feature('s2', [B, D]),
  ]));
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.closedSegmentsExcluded, 1);
});

test('buildTrailGraph excludes an explicit DNR closed status even off-season, where band and legalState alone would say open/not-in-season', () => {
  const graph = buildTrailGraph(fc([
    feature('s1', [A, B], { band: 'OFF_SEASON', score: null, legalState: 'NOT_IN_SEASON', officialStatus: 'Closed - Washout' }),
    feature('s2', [B, D]),
  ]));
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.closedSegmentsExcluded, 1);
});

test('a closed MultiLineString feature is only counted once in closedSegmentsExcluded, not once per part', () => {
  const multi = { type: 'Feature', properties: { id: 'm1', trailNetwork: 'm1', band: 'CLOSED' }, geometry: { type: 'MultiLineString', coordinates: [[A, B], [B, D]] } };
  const graph = buildTrailGraph(fc([multi]));
  assert.equal(graph.edges.length, 0);
  assert.equal(graph.closedSegmentsExcluded, 1);
});

test('a MultiLineString feature that is open contributes one routable edge per part', () => {
  const multi = { type: 'Feature', properties: { id: 'm1', trailNetwork: 'm1', band: 'GOOD', score: 80 }, geometry: { type: 'MultiLineString', coordinates: [[A, B], [C, D]] } };
  const graph = buildTrailGraph(fc([multi]));
  assert.equal(graph.edges.length, 2);
});

test('shortestPath picks the geometrically shorter of two connected paths between the same two points', () => {
  const graph = buildTrailGraph(fc([
    feature('short-1', [A, B]), feature('short-2', [B, D]), // short path via B
    feature('long-1', [A, C]), feature('long-2', [C, D]),   // long detour via C
  ]));
  const fromNode = nearestNode(graph, A[1], A[0]).nodeKey;
  const toNode = nearestNode(graph, D[1], D[0]).nodeKey;
  const result = shortestPath(graph, fromNode, toNode);
  const directMiles = haversineMiles(A, B) + haversineMiles(B, D);
  const detourMiles = haversineMiles(A, C) + haversineMiles(C, D);
  assert.ok(detourMiles > directMiles * 3, 'fixture sanity check: the detour must actually be much longer');
  assert.ok(Math.abs(result.miles - directMiles) < 0.01, 'Dijkstra should choose the short path, not the long detour');
});

test('planRoute never routes through a closed segment even when it is the only geometrically direct path', () => {
  const geometry = fc([
    feature('blocked', [A, B], { band: 'CLOSED' }),
    feature('rejoin', [B, D]),
    feature('detour-1', [A, C]),
    feature('detour-2', [C, D]),
  ]);
  const route = planRoute(geometry, { fromLat: A[1], fromLon: A[0], toLat: D[1], toLon: D[0] });
  assert.equal(route.routable, true);
  const detourMiles = haversineMiles(A, C) + haversineMiles(C, D);
  assert.ok(Math.abs(route.distanceMiles - detourMiles) < 0.02, 'the returned route must be the long detour, not the blocked short path');
  assert.ok(!route.trailsVia.includes('blocked'), 'the closed segment must not appear in the returned route at all');
});

test('planRoute reports not routable, with a plain reason, when the only path is blocked and there is no detour', () => {
  // A2 keeps A itself present as a real, snappable graph node (via an open
  // dead-end spur) after the closed A-B segment is excluded, so this
  // exercises "A survives in the graph but cannot reach D" rather than
  // the different case of "A snaps to some other nearby node" covered by
  // the closed-segment-detour tests above.
  const A2 = [A[0] - 0.01, A[1]];
  const geometry = fc([
    feature('blocked', [A, B], { band: 'CLOSED' }),
    feature('rejoin', [B, D]),
    feature('deadend', [A, A2]),
  ]);
  const route = planRoute(geometry, { fromLat: A[1], fromLon: A[0], toLat: D[1], toLon: D[0] });
  assert.equal(route.routable, false);
  assert.equal(typeof route.reason, 'string');
  assert.ok(route.reason.length > 0);
});

test('planRoute reports not routable when the two points sit on genuinely disconnected trail clusters', () => {
  const geometry = fc([
    feature('island-1', [A, B]),
    feature('island-2', [[10, 10], [10.01, 10.01]]), // nowhere near the first cluster
  ]);
  const route = planRoute(geometry, { fromLat: A[1], fromLon: A[0], toLat: 10.005, toLon: 10.005 });
  assert.equal(route.routable, false);
  assert.match(route.reason, /separate|unconnected|disconnected/i);
});

test('planRoute reports not routable when a requested point is far from every mapped trail', () => {
  const geometry = fc([feature('s1', [A, B]), feature('s2', [B, D])]);
  const route = planRoute(geometry, { fromLat: FAR_AWAY[1], fromLon: FAR_AWAY[0], toLat: D[1], toLon: D[0] });
  assert.equal(route.routable, false);
  assert.match(route.reason, /trail junction/i);
});

test('planRoute reports not routable, with a specific reason, when both points snap to the same trail junction', () => {
  const geometry = fc([feature('s1', [A, B]), feature('s2', [B, D])]);
  const route = planRoute(geometry, { fromLat: A[1], fromLon: A[0], toLat: A[1] + 0.00001, toLon: A[0] });
  assert.equal(route.routable, false);
  assert.match(route.reason, /same trail junction/i);
});

test('planRoute geometry is a single continuous line with no seam gap or duplicate point at each junction', () => {
  const geometry = fc([feature('s1', [A, B]), feature('s2', [B, D])]);
  const route = planRoute(geometry, { fromLat: A[1], fromLon: A[0], toLat: D[1], toLon: D[0] });
  const coords = route.geometry.coordinates;
  // No two consecutive points should be identical (that would mean a
  // duplicated seam vertex where two edges were joined).
  for (let i = 1; i < coords.length; i++) {
    assert.ok(!(coords[i][0] === coords[i - 1][0] && coords[i][1] === coords[i - 1][1]), `duplicate consecutive point at index ${i}`);
  }
  // The assembled line should actually start at A and end at D.
  assert.deepEqual(coords[0], A);
  assert.deepEqual(coords[coords.length - 1], D);
});

test('planRoute distanceMiles matches the sum of haversine lengths of the edges actually traversed', () => {
  const geometry = fc([feature('s1', [A, B]), feature('s2', [B, D])]);
  const route = planRoute(geometry, { fromLat: A[1], fromLon: A[0], toLat: D[1], toLon: D[0] });
  const expected = haversineMiles(A, B) + haversineMiles(B, D);
  assert.ok(Math.abs(route.distanceMiles - expected) < 0.01);
});

test('planRoute worstSegmentOnRoute reflects the lowest-scoring segment actually traversed, not the lowest in the region', () => {
  const geometry = fc([
    feature('s1', [A, B], { score: 40, band: 'MARGINAL' }),
    feature('s2', [B, D], { score: 90, band: 'EXCELLENT' }),
    feature('unrelated-poor', [C, [C[0], C[1] + 0.05]], { score: 5, band: 'POOR' }),
  ]);
  const route = planRoute(geometry, { fromLat: A[1], fromLon: A[0], toLat: D[1], toLon: D[0] });
  assert.equal(route.worstSegmentOnRoute.segmentId, 's1');
  assert.equal(route.worstSegmentOnRoute.score, 40);
});

test('planRoute estimatedMinutes is derived from distance and a clearly labeled assumed speed, not asserted independently', () => {
  const geometry = fc([feature('s1', [A, B]), feature('s2', [B, D])]);
  const route = planRoute(geometry, { fromLat: A[1], fromLon: A[0], toLat: D[1], toLon: D[0] });
  const expectedMinutes = Math.round((route.distanceMiles / route.assumedAvgMph) * 60);
  assert.equal(route.estimatedMinutes, expectedMinutes);
  assert.ok(Number.isFinite(route.assumedAvgMph) && route.assumedAvgMph > 0);
});
