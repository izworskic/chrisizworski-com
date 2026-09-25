(function () {
  'use strict';
  // In-article ads between full sections only. Never inside a card, grid, flex
  // row, list, table, map, form or dialog. Never above the reader, so nothing
  // they are looking at moves. Pages may opt into explicit safe seams with
  // data-in-article-ad-break; otherwise headings are discovered automatically.
  // Settings come from this script tag's data-*.
  var me = document.currentScript;
  if (!me || !['chrisizworski.com', 'www.chrisizworski.com'].includes(location.hostname)) return;
  var CLIENT = me.dataset.client, SLOT = me.dataset.slot, MAX = +me.dataset.max || 3;
  if (!/^ca-pub-\d+$/.test(CLIENT || '') || !/^\d+$/.test(SLOT || '')) return;
  if (document.querySelector('meta[name="in-article-ads"][content="off"]')) return;

  var SKIP = 'header,nav,footer,aside,form,dialog,[role="dialog"],table,li,dl,details,figure,button,label,[data-no-ads],.leaflet-container,.maplibregl-map,.mapboxgl-map';

  function style(el) { return getComputedStyle(el); }
  function looksLikeCard(el) {
    var s = style(el);
    var radius = parseFloat(s.borderTopLeftRadius) || 0;
    var bordered = ['Top', 'Right', 'Bottom', 'Left'].filter(function (k) { return parseFloat(s['border' + k + 'Width']) > 0; }).length >= 3;
    var filled = s.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(s.backgroundColor);
    return (radius >= 4 && (bordered || filled)) || s.boxShadow !== 'none';
  }
  // The block to place before: the heading, the section it opens, or an explicit seam.
  function blockFor(h) {
    var block = h;
    while (block.parentElement && block.parentElement !== document.body &&
           /^(SECTION|ARTICLE|DIV)$/.test(block.parentElement.tagName) &&
           block.parentElement.firstElementChild === block) block = block.parentElement;
    return block;
  }
  function usable(block) {
    var parent = block.parentElement;
    if (!parent || block.closest(SKIP) || !block.previousElementSibling) return false;
    if (!/^(block|flow-root)$/.test(style(parent).display)) return false;
    var width = parent.getBoundingClientRect().width;
    if (width < 300 || width < Math.min(560, document.documentElement.clientWidth * 0.6)) return false;
    for (var el = parent; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      var d = style(el).display;
      if (/grid|flex/.test(d) && el.children.length > 1 && el.getBoundingClientRect().width > width * 1.4) return false;
      if (looksLikeCard(el)) return false;
    }
    return true;
  }
  function top(el) { return el.getBoundingClientRect().top + scrollY; }

  // The tool itself (map, camera, chart, embed, form) is never interrupted: the
  // first ad goes after the last one that starts in the top 60% of the page,
  // and never in the first two screens.
  var TOOL = '.leaflet-container,.maplibregl-map,.mapboxgl-map,canvas,iframe,video,form,[data-tool],[class*="map"],[class*="live-"],[class*="tool"]';
  function toolBottom() {
    var bottom = 0, limit = document.documentElement.scrollHeight * 0.6;
    document.querySelectorAll(TOOL).forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.height > 120 && r.top + scrollY < limit) bottom = Math.max(bottom, r.bottom + scrollY);
    });
    return bottom;
  }
  var placed = [], firstMin = 0;
  function roomFor(block) {
    var y = top(block), vh = innerHeight;
    var docH = document.documentElement.scrollHeight;
    if (y < firstMin || y > docH - 400) return false;                     // after the tool, not at the very end
    if (y < scrollY + vh) return false;                                  // never insert where the reader is
    var gap = Math.max(vh * 1.5, 1000);
    return placed.every(function (ad) { return Math.abs(top(ad) - y) >= gap; });
  }
  function insert(block) {
    if (placed.length >= MAX || !block.isConnected || !roomFor(block)) return;
    var parent = block.parentElement;
    var explicit = block.hasAttribute('data-in-article-ad-break');
    var aside = document.createElement('aside');
    aside.className = 'in-article-ad';
    aside.setAttribute('aria-label', 'Advertisement');
    aside.innerHTML = '<span class="in-article-ad__label">Advertisement</span>' +
      '<ins class="adsbygoogle" style="display:block;text-align:center" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="' + CLIENT + '" data-ad-slot="' + SLOT + '"></ins>';
    parent.insertBefore(aside, block);
    if (explicit) block.remove();
    placed.push(aside);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) { /* ads never break a tool */ }
  }

  function start() {
    var css = document.createElement('style');
    css.textContent = '.in-article-ad{display:block;clear:both;box-sizing:border-box;width:100%;max-width:760px;margin:40px auto;padding:14px 0 18px;border-top:1px solid color-mix(in srgb,currentColor 18%,transparent);border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent)}' +
      '.in-article-ad__label{display:block;margin:0 0 10px;font:600 10px/14px system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-align:center;opacity:.55}' +
      '.in-article-ad:has(ins[data-ad-status="unfilled"]){display:none}@media print{.in-article-ad{display:none}}';
    document.head.appendChild(css);
    var explicit = [];
    document.querySelectorAll('[data-in-article-ad-break]').forEach(function (marker) {
      if (usable(marker)) explicit.push(marker);
    });
    var blocks = explicit;
    if (!blocks.length) {
      blocks = [];
      document.querySelectorAll('h2').forEach(function (h) {
        var b = blockFor(h);
        if (blocks.indexOf(b) < 0 && usable(b)) blocks.push(b);
      });
    }
    if (!blocks.length) return;
    firstMin = Math.max(innerHeight * 2, toolBottom() + 200, 1200);
    if (!('IntersectionObserver' in window)) return;               // no lazy placement, no ads
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { insert(e.target); io.unobserve(e.target); } });
      if (placed.length >= MAX) io.disconnect();
    }, { rootMargin: '0px 0px 1200px 0px' });
    blocks.forEach(function (b) { io.observe(b); });
  }
  // Tools render after load; wait for them to settle before measuring.
  function later() { setTimeout(start, 1500); }
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
})();
