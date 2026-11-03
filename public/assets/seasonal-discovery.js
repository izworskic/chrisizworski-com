/* Calendar recommendations are editorial planning, never current conditions. */
(function () {
  'use strict';
  var root = document.querySelector('[data-seasonal-discovery]');
  var data = window.SeasonalDiscoveryData;
  if (!root || !data || data.schemaVersion !== 1 || data.evidenceKind !== 'editorial-calendar') return;
  var selector = root.querySelector('[data-season-month]');
  var reset = root.querySelector('[data-season-reset]');
  var heading = root.querySelector('[data-season-heading]');
  var intro = root.querySelector('[data-season-intro]');
  var list = root.querySelector('[data-season-picks]');
  var status = root.querySelector('[data-season-status]');
  var current = Number(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'America/Detroit' }).format(new Date()));

  function render(month) {
    var plan = data.months[String(month)];
    if (!plan || !Array.isArray(plan.picks) || plan.picks.length !== 6) return false;
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < plan.picks.length; i++) {
      var pick = plan.picks[i];
      // Fail closed to the useful static links if an artifact is incomplete.
      if (!pick || !pick.id || !pick.title || !pick.why || !['Tool', 'Guide'].includes(pick.kind) || !['now', 'soon'].includes(pick.phase)) return false;
      var url;
      try { url = new URL(pick.url, 'https://chrisizworski.com'); } catch (_) { return false; }
      if (url.protocol !== 'https:' || url.username || url.password) return false;
      var card = document.createElement('article');
      card.className = 'season-pick';
      card.setAttribute('data-season-id', pick.id);
      var label = document.createElement('p');
      label.className = 'season-pick__label';
      label.textContent = pick.kind + ' · ' + (pick.phase === 'soon' ? 'Plan ahead' : 'Seasonal pick');
      var title = document.createElement('h3');
      var link = document.createElement('a');
      link.href = pick.url;
      link.textContent = pick.title;
      title.appendChild(link);
      var reason = document.createElement('p');
      reason.textContent = pick.why;
      card.append(label, title, reason);
      fragment.appendChild(card);
    }
    list.replaceChildren(fragment);
    heading.textContent = month === current ? 'Worth your attention in ' + plan.name : 'Plan for ' + plan.name;
    intro.textContent = plan.intro;
    selector.value = String(month);
    reset.hidden = month === current;
    status.textContent = plan.name + ' calendar picks for Michigan and the Great Lakes. Seasonal planning, not a live conditions report.';
    root.setAttribute('data-selected-month', String(month));
    return true;
  }

  for (var m = 1; m <= 12; m++) {
    if (!data.months[String(m)]) return;
    var option = document.createElement('option');
    option.value = String(m);
    option.textContent = data.months[String(m)].name;
    selector.appendChild(option);
  }
  if (!render(current)) return;
  root.querySelector('[data-season-controls]').hidden = false;
  selector.addEventListener('change', function () {
    if (!render(Number(selector.value))) selector.value = root.getAttribute('data-selected-month');
  });
  reset.addEventListener('click', function () { render(current); selector.focus(); });
})();
