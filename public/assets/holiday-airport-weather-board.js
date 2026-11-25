/* National holiday airport weather board. The existing holiday planner owns flight odds. */
(function () {
  'use strict';
  var status = document.getElementById('airport-weather-status');
  var scroll = document.getElementById('airport-weather-scroll');
  var links = document.getElementById('airport-weather-planner-links');
  if (!status || !scroll || !links) return;
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  }); }
  function label(date) {
    return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
      timeZone: 'UTC', month: 'short', day: 'numeric'
    });
  }
  function issue(iso) {
    if (!iso) return 'Issue time unavailable';
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'UTC', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }) + ' UTC';
  }
  function historyNote() {
    var th = document.querySelector('#best-days tr[data-holiday="th"][data-offset="3"]');
    var xm = document.querySelector('#best-days tr[data-holiday="xm"][data-offset="1"]');
    if (!th || !xm) return '<p>See the historical worst travel days in the best-days comparison below.</p>';
    var thCells = th.querySelectorAll('td'), xmCells = xm.querySelectorAll('td');
    return '<p>Historical worst days in the existing BTS comparison: Sunday after Thanksgiving (' +
      esc(thCells[0].textContent.trim()) + ' average, ' + esc(thCells[1].textContent.trim()) +
      ' worst season) and December 26 (' + esc(xmCells[0].textContent.trim()) +
      ' average, ' + esc(xmCells[1].textContent.trim()) +
      ' worst season). <a href="#best-days">See the complete comparison</a>.</p>';
  }
  function noGrid(message) {
    scroll.hidden = true;
    scroll.innerHTML = '';
    links.innerHTML = '';
    status.innerHTML = message + historyNote();
  }
  function render(board) {
    if (!board.active) {
      var next = board.nextOpening;
      var opening = next ? (next.holiday === 'thanksgiving' ? 'Thanksgiving' : 'Christmas') +
        ' on ' + label(next.start) + ', ' + next.year : 'the next holiday travel window';
      noGrid('<p>The NWS airport weather board opens for ' + esc(opening) +
        '. It covers the Friday before through Tuesday after Thanksgiving, and December 18 through January 2 for Christmas.</p>');
      return;
    }
    var sorted = board.airports.slice().sort(function (a, b) {
      var af = a.days.filter(function (d) { return d.status === 'flagged'; }).length;
      var bf = b.days.filter(function (d) { return d.status === 'flagged'; }).length;
      return bf - af || b.flights - a.flights;
    });
    var missing = sorted.filter(function (a) { return a.errors.length > 0; }).length;
    var flagged = sorted.filter(function (a) {
      return a.days.some(function (d) { return d.status === 'flagged'; });
    });
    var name = board.holiday === 'thanksgiving' ? 'Thanksgiving' : 'Christmas';
    if (missing === sorted.length) {
      noGrid('<p>National Weather Service data is unavailable for the 30 airports right now. No airport is confirmed clear. Check the <a href="https://www.weather.gov/">official NWS forecast</a> before traveling.</p>');
      return;
    }
    var latestIssue = sorted.map(function (a) { return a.issuedAt; }).filter(Boolean).sort().pop();
    status.innerHTML = '<p><strong>' + esc(name) + ' ' + board.year + ':</strong> ' +
      flagged.length + ' of 30 airports have at least one qualifying NWS signal. ' +
      missing + ' airports have incomplete NWS data. Dates: ' + label(board.start) + ' to ' +
      label(board.end) + '. Forecast issue times vary by airport; latest reported: ' +
      esc(issue(latestIssue)) + '. This is not a delay forecast.</p>';
    var head = '<thead><tr><th scope="col" class="aw-airport">Airport and NWS issue time</th>' +
      board.dates.map(function (d) { return '<th scope="col"><time datetime="' + d + '">' + label(d) + '</time></th>'; }).join('') +
      '</tr></thead>';
    var body = sorted.map(function (a) {
      var cells = a.days.map(function (d) {
        var title = a.code + ', ' + label(d.date) + ': ';
        var content = '·', style = 'aw-clear';
        if (d.status === 'flagged') {
          style = 'aw-flag';
          content = d.warnings.length ? 'W' : 'WX';
          title += d.warnings.length ? 'NWS warning: ' + d.warnings.join(', ') : '';
          if (d.forecast.length) title += (d.warnings.length ? '; ' : '') + 'NWS forecast: ' + d.forecast.join('; ');
        } else if (d.status === 'unknown') {
          style = 'aw-unknown'; content = '?'; title += 'Forecast coverage or NWS data unavailable';
          if (d.forecast.length) title += '; available NWS forecast: ' + d.forecast.join('; ');
        } else title += 'No qualifying warning or weather phrase; NWS forecast: ' + d.forecast.join('; ');
        return '<td class="' + style + '" title="' + esc(title) + '" aria-label="' + esc(title) +
          '"><span aria-hidden="true">' + content + '</span></td>';
      }).join('');
      return '<tr><th scope="row" class="aw-airport"><strong>' + esc(a.code) + '</strong> ' +
        esc(a.city) + '<small>' + esc(issue(a.issuedAt)) + '</small></th>' + cells + '</tr>';
    }).join('');
    scroll.innerHTML = '<table class="aw-table"><caption>30 busiest airports by historical BTS holiday flights, sorted by flagged days. W means NWS warning, WX means a named forecast weather hazard, question mark means unknown.</caption>' +
      head + '<tbody>' + body + '</tbody></table>';
    scroll.hidden = false;
    if (flagged.length) {
      var holiday = board.holiday === 'thanksgiving' ? 'th' : 'xm';
      links.innerHTML = '<h3>Check a flagged airport in your flight plan</h3><p>These links set the origin in the existing planner. They do not change historical BTS odds based on a forecast.</p><div class="aw-links">' +
        flagged.map(function (a) {
          var destination = a.code === 'MCO' ? 'ORD' : 'MCO';
          return '<a href="/holiday-travel/?h=' + holiday + '&amp;m=fly&amp;d=there&amp;from=' +
            encodeURIComponent(a.code) + '&amp;to=' + destination + '#trip-planner">' +
            esc(a.code) + ' flight plan</a>';
        }).join('') + '</div>';
    } else links.innerHTML = '<p>There are no qualifying flags in the NWS periods currently available. Unavailable dates are not clear-weather confirmations.</p>';
  }
  fetch('/api/holiday-airport-weather').then(function (r) {
    if (!r.ok) throw new Error('NWS board unavailable');
    return r.json();
  }).then(render).catch(function () {
    noGrid('<p>Live National Weather Service airport conditions could not be loaded. No clear-weather conclusion is possible right now.</p>');
  });
})();
