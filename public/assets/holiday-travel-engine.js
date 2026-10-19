/* Holiday Travel odds engine. Pure functions over public/holiday-travel/data/national.json
 * (built by scripts/holiday-travel/build-flight-history.py from BTS flight records).
 * "Major disruption" = cancelled, diverted, or left 60+ minutes late.
 * All rates here are fractions 0..1. Nothing in this file touches the DOM or the network. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HolidayTravelEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ROUGH = 0.2; // a season counts as "rough" for a trip when its disruption chance reaches 20%
  var CAP = 0.95;
  var CONVENTIONAL = { th: { out: -1, ret: 3 }, xm: { out: -2, ret: 3 } }; // Wed->Sun; Dec 23->Dec 28

  function median(values) {
    var v = values.filter(function (x) { return x !== null && isFinite(x); }).sort(function (a, b) { return a - b; });
    if (!v.length) return null;
    var m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }
  function mean(values) {
    var v = values.filter(function (x) { return x !== null && isFinite(x); });
    return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
  }
  function combine(a, b) { return a === null || b === null ? null : 1 - (1 - a) * (1 - b); }

  function create(data) {
    var byCode = {};
    data.airports.forEach(function (a) { byCode[a.code] = a; });
    var groups = data.meta.bandGroups;
    var seasons = data.meta.seasons;

    function factor(code, hol, band, metric) {
      var a = code && byCode[code];
      return a ? a.f[hol][metric][groups[band]] : 1;
    }

    // One flight leg: chance of a major disruption (plus late/cancel means) for a given
    // holiday-relative day, scheduled-departure band and departure airport.
    function leg(hol, offset, band, code) {
      var i = offset + 6, nat = data.holidays[hol].nat;
      if (i < 0 || i >= 13) throw new RangeError('offset out of window: ' + offset);
      var fMajor = factor(code, hol, band, 'major');
      var out = {
        major: Math.min(CAP, nat.major[i][band] / 100 * fMajor),
        late: Math.min(CAP, nat.late[i][band] / 100 * factor(code, hol, band, 'late')),
        cancel: Math.min(CAP, nat.cancel[i][band] / 100 * factor(code, hol, band, 'cancel')),
        seasons: nat.majorSeason[i][band].map(function (v) { return v === null ? null : Math.min(CAP, v / 100 * fMajor); }),
        factor: fMajor
      };
      return out;
    }

    // A round trip: outbound leg from `from`, return leg from `to` (the destination airport).
    function trip(o) {
      var out = leg(o.hol, o.outOffset, o.outBand, o.from);
      var ret = leg(o.hol, o.retOffset, o.retBand, o.to);
      var perSeason = out.seasons.map(function (v, k) { return combine(v, ret.seasons[k]); });
      var known = perSeason.filter(function (x) { return x !== null; });
      return {
        hol: o.hol, outOffset: o.outOffset, retOffset: o.retOffset, outBand: o.outBand, retBand: o.retBand,
        mean: combine(out.major, ret.major),
        late: combine(out.late, ret.late),
        cancel: combine(out.cancel, ret.cancel),
        perSeason: perSeason,
        median: median(perSeason),
        worst: known.length ? Math.max.apply(null, known) : null,
        rough: known.filter(function (x) { return x >= ROUGH; }).length,
        seasonsUsed: known.length,
        out: out, ret: ret
      };
    }

    // Every outbound day that leaves room for `len` nights inside the observed window.
    function rank(o) {
      var list = [];
      for (var d = -6; d + o.len <= 6; d++) {
        list.push(trip({ hol: o.hol, from: o.from, to: o.to, outOffset: d, retOffset: d + o.len, outBand: o.outBand, retBand: o.retBand }));
      }
      list.sort(function (a, b) { return a.mean - b.mean || a.worst - b.worst || a.outOffset - b.outOffset; });
      return list;
    }

    function conventional(o) {
      var c = CONVENTIONAL[o.hol];
      return trip({ hol: o.hol, from: o.from, to: o.to, outOffset: c.out, retOffset: c.ret, outBand: o.outBand, retBand: o.retBand });
    }

    return {
      leg: leg, trip: trip, rank: rank, conventional: conventional,
      airport: function (code) { return byCode[code] || null; },
      airports: data.airports, seasons: seasons, bands: data.meta.bands, meta: data.meta,
      anchor: function (hol, season) { return data.holidays[hol].anchors[String(season)]; }
    };
  }

  return { create: create, median: median, mean: mean, combine: combine, ROUGH: ROUGH, CONVENTIONAL: CONVENTIONAL };
});
