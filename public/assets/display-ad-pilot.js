(function () {
  'use strict';
  // Preview deployments reserve the same space but never request billable ads.
  if (!['chrisizworski.com', 'www.chrisizworski.com'].includes(window.location.hostname)) return;
  var slots = document.querySelectorAll('[data-ad-experiment="display-horizontal-pilot-v1"]');
  slots.forEach(function (container) {
    var ad = container.querySelector('ins.adsbygoogle');
    if (!ad || container.dataset.adPilotReady) return;
    container.dataset.adPilotReady = 'true';
    var requested = false;
    var observer;
    function request() {
      if (requested || document.visibilityState === 'hidden') return;
      var box = ad.getBoundingClientRect();
      if (box.width < 250 || box.height < 1 || container.getBoundingClientRect().width < box.width) return;
      // An unfilled request is still a request. Never refresh or push twice.
      if (ad.hasAttribute('data-adsbygoogle-status')) { requested = true; return; }
      requested = true;
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) { /* Keep the tool usable if ads fail. */ }
    }
    function onVisible() {
      if (document.visibilityState !== 'hidden') {
        var rect = container.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200 && rect.bottom > -200) request();
      }
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) request();
      }, { rootMargin: '200px 0px' });
      observer.observe(container);
    } else {
      request();
    }
    document.addEventListener('visibilitychange', onVisible);
    // Small screens start hidden. Request at most once if rotation makes room.
    window.addEventListener('resize', onVisible, { passive: true });
  });
})();
