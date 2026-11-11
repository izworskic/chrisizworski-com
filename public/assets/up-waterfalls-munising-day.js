/* Munising source-gated day recipes. Never turn waterfall coordinates into driving destinations. */
(function () {
  'use strict';
  const PRESETS = Object.freeze({
    shoreline: Object.freeze(['wagner-falls', 'miners-falls', 'elliot-falls']),
    forest: Object.freeze(['wagner-falls', 'miners-falls', 'chapel-falls'])
  });
  const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  function seasonalAccess(dateValue) {
    if (!dateValue) return { blocked: false, reason: 'Travel date not set. Check NPS conditions before choosing roads.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return { blocked: true, reason: 'Choose a valid travel date in the planner first.' };
    const [year, month, day] = dateValue.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return { blocked: true, reason: 'Choose a valid travel date in the planner first.' };
    }
    if (month === 12 || month <= 3) return {
      blocked: true,
      reason: 'December 1–March 31: NPS unplowed park roads are snowmobile routes closed to regular motor vehicles. Do not create this driving day.'
    };
    return { blocked: false, reason: 'NPS road and trail conditions still need to be confirmed for this date.' };
  }
  function assessPreset(key, cards, selected, dateValue) {
    const ids = PRESETS[key];
    if (!ids) return { ok: false, message: 'This day plan is unavailable.', missing: [] };
    const season = seasonalAccess(dateValue);
    if (season.blocked) return { ok: false, message: season.reason, missing: [] };
    if (!cards || typeof cards.get !== 'function') return { ok: false, message: 'Waterfall profiles are unavailable.', missing: [] };
    const picked = new Set(selected || []);
    const missing = ids.filter(id => !picked.has(id));
    for (const id of ids) {
      const card = cards.get(id);
      if (!ID.test(id) || !card || card.dataset.arrivalVerified !== 'verified' ||
          ['closed', 'research'].includes(card.dataset.status) || !card.querySelector?.('.save')) {
        return { ok: false, message: 'A stop lacks a verified public visitor approach. No stops were added.', missing: [] };
      }
    }
    if (picked.size + missing.length > 6) {
      return { ok: false, message: 'Your day already has too many saved stops. Clear a few first; nothing was changed.', missing: [] };
    }
    return { ok: true, message: season.reason, missing };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { PRESETS, seasonalAccess, assessPreset };
  if (typeof document === 'undefined') return;
  const root = document.getElementById('munising-day');
  const status = root?.querySelector('#munising-day-status');
  if (!root || !status) return;
  const dayInput = document.getElementById('visit-date');
  const shortlist = document.getElementById('shortlist');
  const cards = new Map([...document.querySelectorAll('[data-fall][data-id]')].map(card => [card.dataset.id, card]));
  root.querySelectorAll('[data-munising-preset]').forEach(button => {
    button.addEventListener('click', () => {
      const selected = [...cards.entries()].filter(([,card]) => card.querySelector('.save')?.getAttribute('aria-pressed') === 'true').map(([id]) => id);
      const assessment = assessPreset(button.dataset.munisingPreset, cards, selected, dayInput?.value || '');
      if (!assessment.ok) { window.UPWaterfallMetrics?.plan(button.dataset.munisingPreset,'blocked',0); status.textContent = assessment.message; status.focus(); return; }
      for (const id of assessment.missing) cards.get(id).querySelector('.save').click();
      window.UPWaterfallMetrics?.plan(button.dataset.munisingPreset,assessment.missing.length?'added':'already_saved',assessment.missing.length);
      const sheet = document.getElementById('upfall-day-sheet');
      const reveal = document.getElementById('open-day-sheet');
      if (sheet?.hidden && reveal) reveal.click();
      status.textContent = assessment.missing.length
        ? assessment.missing.length + ' stop(s) added to your existing day sheet. This is a planning sequence, not verified driving access. ' + assessment.message
        : 'These stops were already saved. ' + assessment.message;
      (shortlist || root).scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  });
})();
