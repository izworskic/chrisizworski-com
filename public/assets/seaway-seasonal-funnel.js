/* Seaway seasonal passage funnel.
 * GA4 events measure explicit behavior, not inferred trip completion.
 * No persistent visitor identifiers, location, ship IDs, or storage.
 */
(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    global.SeawaySeasonalFunnel = api;
    const run = () => api.mount(global.document, global);
    if (global.document.readyState === 'loading')
      global.document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  }
})(typeof window === 'object' ? window : this, function () {
  'use strict';

  const DESTINATIONS = Object.freeze({
    ship_watch: { kind: 'ship_watch', target: '#ship-watch' },
    eisenhower: { kind: 'lock_guide', target: '/eisenhower-lock/' },
    welland: { kind: 'ship_watch_tool', target: '/welland-canal/' },
    operator_hours: { kind: 'official_planning', target: 'https://www.seaway.dot.gov/explore/seaway-visitor-center' },
    official_queue: { kind: 'official_planning', target: 'https://seaway-greatlakes.com/vessel-transit/order-of-turn' },
    seaway_notices: { kind: 'official_planning', target: 'https://greatlakes-seaway.com/en/news-and-information/notices/seaway-notices/' }
  });

  function validDestination(link, windowLocation) {
    if (!link?.getAttribute) return null;
    const key = link.getAttribute('data-seasonal-destination');
    const item = DESTINATIONS[key];
    if (!item) return null;
    let resolved, expected;
    try {
      resolved = new URL(link.getAttribute('href'), windowLocation);
      expected = new URL(item.target, windowLocation);
    } catch (_) {
      return null;
    }
    if (resolved.origin !== expected.origin ||
        resolved.pathname !== expected.pathname ||
        resolved.hash !== expected.hash) return null;
    return { key, kind: item.kind };
  }

  function mount(doc, win) {
    const root = doc?.getElementById?.('seaway-seasonal-lens');
    if (!root || root.dataset.seawayFunnelMounted === '1') return false;
    root.dataset.seawayFunnelMounted = '1';
    let selectedMonth = null;
    let manualCompare = false;
    let exposed = false;

    function emit(name, props) {
      if (typeof win.gtag !== 'function') return false;
      // GA4's existing site tag, without additional third-party SDKs.
      win.gtag('event', name, Object.assign({
        page_family: 'seaway',
        feature: 'seasonal_fieldbook',
        transport_type: 'beacon'
      }, props));
      return true;
    }

    const heading = doc.getElementById('seaway-seasonal-title');
    if (heading && typeof win.IntersectionObserver === 'function') {
      const observer = new win.IntersectionObserver(entries => {
        if (exposed) return;
        if (!entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.5)) return;
        exposed = true;
        observer.disconnect();
        emit('seaway_seasonal_exposed', {});
      }, { threshold: 0.5 });
      observer.observe(heading);
    }

    root.addEventListener('click', event => {
      const origin = event.target;
      if (!origin || typeof origin.closest !== 'function') return;
      const button = origin.closest('[data-seaway-month]');
      if (button && root.contains(button)) {
        const month = Number(button.getAttribute('data-seaway-month'));
        if (!Number.isInteger(month) || month < 1 || month > 12) return;
        selectedMonth = String(month);
        manualCompare = true;
        emit('seaway_seasonal_month_selected', { selected_month: selectedMonth });
        return;
      }
      const link = origin.closest('a[data-seasonal-destination]');
      if (!link || !root.contains(link)) return;
      const destination = validDestination(link, win.location.href);
      if (!destination) return;
      emit('seaway_seasonal_next_step', {
        destination: destination.key,
        destination_kind: destination.kind,
        after_manual_compare: manualCompare ? 'yes' : 'no',
        selected_month: manualCompare ? selectedMonth : 'none'
      });
    });
    return true;
  }
  return { mount, validDestination, DESTINATIONS };
});
