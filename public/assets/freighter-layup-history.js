/* Winter fleet archive: progressive enhancements for Python-built, source-backed HTML.
 * All historical rows and original links remain readable without JavaScript.
 * Only toggles already documented records; never updates the current-season map.
 */
(function () {
  'use strict';
  function mount() {
    const root = document.getElementById('winter-fleet-history');
    if (!root) return;
    const panels = [...root.querySelectorAll('[data-history-season]')];
    const buttons = [...root.querySelectorAll('[data-history-pick]')];
    const harbor = root.querySelector('#history-harbor');
    const summary = root.querySelector('#history-selection');
    const empty = root.querySelector('#history-empty');
    if (!panels.length || !buttons.length || !harbor || !summary || !empty) return;
    let activeSeason = panels[0].dataset.historySeason;
    // No nodes are fetched or injected here. All evidence is present in the HTML.
    function update() {
      let count = 0, allInSeason = 0;
      panels.forEach(panel => {
        const isSelected = panel.dataset.historySeason === activeSeason;
        panel.hidden = !isSelected;
        const vessels = [...panel.querySelectorAll('[data-history-vessel]')];
        if (isSelected) allInSeason = vessels.length;
        vessels.forEach(v => {
          const show = isSelected && (harbor.value === 'all' ||
            v.dataset.historyHarbor === harbor.value);
          v.hidden = !show;
          if (show) count += 1;
        });
      });
      buttons.forEach(button => {
        const active = button.dataset.historyPick === activeSeason;
        button.setAttribute('aria-pressed', String(active));
        button.classList.toggle('is-active', active);
      });
      const selectedLabel = buttons.find(b => b.dataset.historyPick === activeSeason);
      const year = selectedLabel ? selectedLabel.firstChild.textContent.trim() : activeSeason;
      const harborName = harbor.selectedOptions[0]?.textContent || 'all documented harbors';
      summary.textContent = year + ' · ' + count + ' of ' + allInSeason +
        ' documented records shown · ' + harborName + '. Not a total fleet count.';
      empty.hidden = count !== 0;
      empty.textContent = allInSeason===0
        ? 'No source-backed layup reports were collected for this winter. That does not prove the harbors were empty.'
        : 'No historical source records match that harbor in this winter. Try another harbor.';
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      activeSeason = button.dataset.historyPick;
      harbor.value = 'all';
      update();
    }));
    harbor.addEventListener('change', update);
    root.dataset.historyEnhanced = 'true';
    update();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
