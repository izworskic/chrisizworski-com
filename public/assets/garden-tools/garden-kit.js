/* Garden tool kit: shared pieces for the chrisizworski.com garden tools.
 * DOM builders (text only, never HTML strings), year-agnostic dates, copy-a-link,
 * calendar (.ics) download and a season timeline chart. No libraries, no storage, no network.
 */
(function (root) {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MLONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

  function h(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    for (var i = 2; i < arguments.length; i++) add(n, arguments[i]);
    return n;
  }
  function s(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    for (var i = 2; i < arguments.length; i++) add(n, arguments[i]);
    return n;
  }
  function add(n, k) {
    if (k === null || k === undefined || k === false) return;
    if (Array.isArray(k)) { k.forEach(function (x) { add(n, x); }); return; }
    n.append(k);
  }

  // Dates are day-of-year in a common (non-leap) year: 0 = Jan 1, 364 = Dec 31.
  function parse(md) { var p = String(md).split(' '); var m = MN.indexOf(p[0]); return CUM[m] + Number(p[1]) - 1; }
  function wrapDay(d) { return ((Math.round(d) % 365) + 365) % 365; }
  function fmt(d) { d = wrapDay(d); for (var m = 0; m < 12; m++) if (d < CUM[m + 1]) return MN[m] + ' ' + (d - CUM[m] + 1); return 'Dec 31'; }
  function fmtLong(d) { d = wrapDay(d); for (var m = 0; m < 12; m++) if (d < CUM[m + 1]) return MLONG[m] + ' ' + (d - CUM[m] + 1); return 'December 31'; }
  function range(a, b) { return fmt(a) + ' to ' + fmt(b); }
  function fromDate(dt) { return CUM[dt.getMonth()] + Math.min(dt.getDate(), dt.getMonth() === 1 ? 28 : 31) - 1; }
  function fromISO(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); if (!m) return null; var mo = Number(m[2]) - 1, da = Number(m[3]); if (mo < 0 || mo > 11 || da < 1 || da > 31) return null; return CUM[mo] + Math.min(da, CUM[mo + 1] - CUM[mo]) - 1; }
  function toISO(d, year) { d = wrapDay(d); for (var m = 0; m < 12; m++) if (d < CUM[m + 1]) return year + '-' + String(m + 1).padStart(2, '0') + '-' + String(d - CUM[m] + 1).padStart(2, '0'); }
  function today() { return fromDate(new Date()); }
  function weeks(n) { n = Math.round(n / 7); return n === 1 ? 'a week' : n + ' weeks'; }
  function days(n) { n = Math.round(n); return n === 1 ? '1 day' : n + ' days'; }

  // Copy a link, falling back to a visible, selected text box when the clipboard is unavailable.
  function copyLink(text, btn, box, done) {
    var label = btn && btn.textContent;
    function fallback() { if (box) { box.hidden = false; box.value = text; box.focus(); box.select(); } if (btn) btn.textContent = 'Copy the link below'; }
    if (root.navigator && navigator.clipboard && root.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { if (box) box.hidden = true; if (btn) { btn.textContent = 'Link copied ✓'; setTimeout(function () { btn.textContent = done || label; }, 2500); } }, fallback);
    } else fallback();
  }

  // Calendar file: all-day events. Windows that have already ended this year go on next year.
  function ics(events, name) {
    var now = new Date(), year = now.getFullYear(), t = today();
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//chrisizworski.com//garden tools//EN', 'CALSCALE:GREGORIAN'];
    events.forEach(function (e, i) {
      var y = e.to < t ? year + 1 : year;
      var start = toISO(e.from, y).replace(/-/g, ''), end = toISO(e.to + 1, e.to + 1 > 364 ? y + 1 : y).replace(/-/g, '');
      lines.push('BEGIN:VEVENT', 'UID:' + y + '-' + i + '-' + String(e.title).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '@chrisizworski.com', 'DTSTAMP:' + year + '0101T000000Z', 'DTSTART;VALUE=DATE:' + start, 'DTEND;VALUE=DATE:' + end, 'SUMMARY:' + String(e.title).replace(/[,;]/g, '\\$&'), 'DESCRIPTION:' + String(e.note || '').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n'), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    var text = lines.join('\r\n');
    var url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    var a = h('a', { href: url, download: name || 'garden-calendar.ics' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return text;
  }

  function width(el, fallback) { var w = el && el.getBoundingClientRect ? el.getBoundingClientRect().width : 0; return w > 0 ? w : fallback; }

  // What each kind of window means and how it is drawn. Indoor starts are outlined so the
  // difference does not rest on color alone; the legend names every kind in words.
  var KINDS = {
    indoor: { label: 'Start indoors', color: '#8a6fc4', outline: true },
    transplant: { label: 'Plant out', color: '#c4623f' },
    sow: { label: 'Sow outside', color: '#3f7f5a' },
    fall: { label: 'Fall sowing', color: '#3f7392' },
    harden: { label: 'Harden off', color: '#d9a64a', outline: true }
  };

  /* Season timeline. rows: [{id,label,bars:[{kind,from,to}]}]
   * opts: {spring, fall, today, onRow(id), active, title} */
  function timeline(svg, rows, opts) {
    opts = opts || {};
    var W = Math.round(Math.max(300, Math.min(900, width(svg, 760)))), narrow = W < 560;
    var L = narrow ? 8 : 150, R = W - 10, top = 34, rowH = narrow ? 36 : 24, barH = narrow ? 12 : 12;
    // Optional zoom: opts.from / opts.to (day of year). Bars and marks outside are clipped.
    var D0 = opts.from || 0, D1 = opts.to || 365, span = D1 - D0;
    var X = function (d) { return L + (Math.max(D0, Math.min(D1, d)) - D0) / span * (R - L); };
    var zoomed = span < 300;
    var H = top + rows.length * rowH + 44;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var kids = [];
    if (opts.spring !== undefined && opts.fall !== undefined) {
      kids.push(s('rect', { x: X(opts.spring), y: top - 6, width: Math.max(0, X(opts.fall) - X(opts.spring)), height: rows.length * rowH + 6, fill: '#eef5ef', class: 'tl-season' }));
      kids.push(s('text', { x: (X(opts.spring) + X(opts.fall)) / 2, y: H - 4, 'text-anchor': 'middle', class: 'tl-note' }, 'Frost-free season, ' + days(opts.fall - opts.spring)));
    }
    for (var m = 0; m < 12; m++) {
      if (CUM[m] < D0 - 1 || CUM[m] > D1) continue;
      var x = X(CUM[m]);
      kids.push(s('line', { x1: x, y1: top - 6, x2: x, y2: top + rows.length * rowH, class: 'tl-grid' }));
      if (CUM[m] + 15 <= D1) kids.push(s('text', { x: X(CUM[m] + 15), y: top - 14, 'text-anchor': 'middle', class: 'tl-month' }, narrow && !zoomed ? MN[m].charAt(0) : MN[m]));
    }
    rows.forEach(function (r, i) {
      var y = top + i * rowH, by = narrow ? y + 18 : y + (rowH - barH) / 2;
      var words = r.bars.map(function (b) { return KINDS[b.kind].label.toLowerCase() + ' ' + range(b.from, b.to); }).join(', ');
      var g = s('g', { class: 'tl-row' + (opts.active === r.id ? ' active' : ''), tabindex: opts.onRow ? '0' : null, role: opts.onRow ? 'button' : null, 'aria-label': r.label + ': ' + (words || 'no dates') });
      if (opts.active === r.id) g.append(s('rect', { x: 0, y: y + 1, width: W, height: rowH - 2, rx: 6, class: 'tl-hl' }));
      g.append(narrow ? s('text', { x: L, y: y + 12, class: 'tl-label' }, r.label) : s('text', { x: L - 10, y: by + barH - 2, 'text-anchor': 'end', class: 'tl-label' }, r.label));
      r.bars.forEach(function (b) {
        var k = KINDS[b.kind], segs = b.to >= b.from ? [[b.from, b.to]] : [[b.from, 364], [0, b.to]];
        segs.forEach(function (sg) {
          if (sg[1] < D0 || sg[0] > D1) return;
          g.append(s('rect', { x: X(sg[0]), y: by, width: Math.max(4, X(sg[1] + 1) - X(sg[0])), height: barH, rx: 4, fill: k.outline ? '#fff' : k.color, stroke: k.color, 'stroke-width': k.outline ? 2 : 0, class: 'tl-bar tl-' + b.kind }));
        });
      });
      if (opts.onRow) {
        g.addEventListener('click', function () { opts.onRow(r.id); });
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { if (e.preventDefault) e.preventDefault(); opts.onRow(r.id); } });
      }
      kids.push(g);
    });
    function mark(d, cls, label, anchorY) {
      if (d < D0 || d > D1) return;
      kids.push(s('line', { x1: X(d), y1: top - 8, x2: X(d), y2: top + rows.length * rowH + 2, class: cls }));
      if (label) kids.push(s('text', { x: Math.min(R - 4, Math.max(L + 4, X(d))), y: anchorY, 'text-anchor': X(d) > R - 60 ? 'end' : X(d) < L + 60 ? 'start' : 'middle', class: cls + '-label' }, label));
    }
    if (opts.spring !== undefined) mark(opts.spring, 'tl-frost', narrow && !zoomed ? null : 'Last frost ' + fmt(opts.spring), top + rows.length * rowH + 16);
    if (opts.fall !== undefined) mark(opts.fall, 'tl-frost', narrow && !zoomed ? null : 'First fall frost ' + fmt(opts.fall), top + rows.length * rowH + 16);
    if (opts.today !== undefined) mark(opts.today, 'tl-today', 'Today', 10);
    svg.replaceChildren.apply(svg, kids);
    return { width: W, height: H };
  }

  function legend(kinds) {
    return h('ul', { class: 'gk-legend' }, kinds.map(function (k) {
      var K = KINDS[k];
      return h('li', null, s('svg', { viewBox: '0 0 24 12', 'aria-hidden': 'true' }, s('rect', { x: 1, y: 1, width: 22, height: 10, rx: 3, fill: K.outline ? '#fff' : K.color, stroke: K.color, 'stroke-width': K.outline ? 2 : 0 })), K.label);
    }));
  }

  root.GardenKit = { h: h, s: s, parse: parse, fmt: fmt, fmtLong: fmtLong, range: range, fromDate: fromDate, fromISO: fromISO, toISO: toISO, today: today, weeks: weeks, days: days, wrapDay: wrapDay, copyLink: copyLink, ics: ics, timeline: timeline, legend: legend, KINDS: KINDS, width: width };
})(typeof window !== 'undefined' ? window : globalThis);
