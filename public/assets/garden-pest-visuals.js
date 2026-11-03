(function () {
  'use strict';
  const catalog = window.GardenPestVisualCatalog;
  const host = document.getElementById('visual-diagnosis');
  const crop = document.getElementById('crop');
  if (!catalog || catalog.schema !== 'garden-pest-visual-evidence-v1' || !host || !crop) return;
  const clueArea = document.getElementById('visual-clues');
  const results = document.getElementById('visual-results');
  const intro = document.getElementById('visual-summary');
  const reset = document.getElementById('visual-reset');
  const selected = new Set();
  const stage = document.getElementById('stage');
  const zip = document.getElementById('zip');
  let fieldPlan = null;
  let view = 'all';
  const filterArea = document.getElementById('visual-category');
  const clueGroups = [
    {name:'Chewing and holes', ids:['shot-holes','ragged-holes','stripped-stems','skeletonized','ear-tip','flower-chewing']},
    {name:'Leaves changing color', ids:['stippling','curled-leaves','white-powder','angular-yellowing','leaf-spots']},
    {name:'Stem and whole-plant problems', ids:['frass','wilt']},
    {name:'Insects and trails', ids:['eggs-nymphs','visible-beetles','honeydew','webbing','slime-trails']}
  ];
  const licenses = {
    'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/'
  };
  const byId = new Map(catalog.pests.map(p => [p.id, p]));
  function node(tag, cls, text) {
    const out = document.createElement(tag);
    if (cls) out.className = cls;
    if (text != null) out.textContent = String(text);
    return out;
  }
  function photoSource(photo) {
    return 'https://commons.wikimedia.org/wiki/Special:Redirect/file/' + encodeURIComponent(photo.file) + '?width=720';
  }
  function filePage(photo) {
    return 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(photo.file.replaceAll(' ', '_'));
  }
  function external(label, url, cls) {
    const link = node('a', cls || '', label);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }
  function figure(photo, role, kind) {
    const frame = node('figure', 'visual-figure');
    const media = node('div', 'visual-photo');
    const image = node('img');
    image.src = photoSource(photo);
    image.alt = photo.alt;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 720;
    image.height = 480;
    image.addEventListener('error', function () {
      media.replaceChildren(node('span', 'visual-image-unavailable', 'Photograph unavailable. Open the original image using the credit link below.'));
    }, {once:true});
    media.append(image);
    const caption = node('figcaption');
    caption.append(node('strong', 'visual-kind', kind === 'disease' ? (role === 'pest' ? 'SYMPTOM / CLOSE-UP' : 'SYMPTOM / ON THE PLANT') : (role === 'pest' ? 'THE ORGANISM' : 'DAMAGE / FIELD CLUE')));
    caption.append(node('span', 'visual-caption', photo.caption));
    const credits = node('span', 'visual-credit');
    credits.append(external('Photo: ' + photo.author, filePage(photo)));
    credits.append(node('span', '', ' · '));
    credits.append(external(photo.license, licenses[photo.license]));
    caption.append(credits);
    frame.append(media, caption);
    return frame;
  }
  function renderPair(id, compact) {
    const evidence = byId.get(id);
    if (!evidence) return null;
    const pair = node('div', compact ? 'visual-pair is-compact' : 'visual-pair');
    pair.append(figure(evidence.pest, 'pest', evidence.kind), figure(evidence.damage, 'damage', evidence.kind));
    return pair;
  }
  // Existing forecast cards reuse the same image and license records.
  window.GardenPestVisuals = Object.freeze({renderPair});
  const knownClues = new Map(catalog.clues.map(c => [c.id, c]));
  const groupIds = new Set();
  function clueButton(clue) {
    const button = node('button', 'visual-chip', clue.label);
    button.type = 'button';
    button.dataset.clue = clue.id;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', function () {
      if (selected.has(clue.id)) selected.delete(clue.id);
      else selected.add(clue.id);
      button.setAttribute('aria-pressed', String(selected.has(clue.id)));
      render();
    });
    return button;
  }
  for (const group of clueGroups) {
    const block = node('fieldset', 'visual-clue-group');
    block.append(node('legend', '', group.name));
    const buttons = node('div', 'visual-clue-row');
    for (const id of group.ids) {
      const clue = knownClues.get(id);
      if (!clue) continue;
      groupIds.add(id);
      buttons.append(clueButton(clue));
    }
    block.append(buttons);
    clueArea.append(block);
  }
  if (groupIds.size !== knownClues.size) {
    // A new clue must be placed into a visible group rather than disappearing.
    const extra = node('fieldset', 'visual-clue-group');
    extra.append(node('legend', '', 'Other visible clues'));
    const buttons = node('div', 'visual-clue-row');
    catalog.clues.filter(c => !groupIds.has(c.id)).forEach(c => buttons.append(clueButton(c)));
    extra.append(buttons);
    clueArea.append(extra);
  }
  for (const option of [
    {value:'all',label:'All problems'},
    {value:'pest',label:'Insects & slugs'},
    {value:'disease',label:'Diseases & leaf spots'}
  ]) {
    const button = node('button', 'visual-category-button', option.label);
    button.type = 'button';
    button.dataset.group = option.value;
    button.setAttribute('aria-pressed', String(view === option.value));
    button.addEventListener('click', () => {
      view = option.value;
      filterArea.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.group === view)));
      render();
    });
    filterArea.append(button);
  }
  reset.addEventListener('click', function () {
    selected.clear();
    clueArea.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    render();
  });
  // A current plan must match the selected crop, plant stage and ZIP exactly.
  // Photo matches never enter the API as user observations, field detections or model scores.
  function matchingPlan(item) {
    if (!fieldPlan || fieldPlan.crop !== crop.value || fieldPlan.stage !== stage?.value ||
      fieldPlan.zip !== (zip?.value || '')) return null;
    return fieldPlan.items.find(p => p.id === item.id) || null;
  }
  function actionPanel(item) {
    const plan = matchingPlan(item);
    const panel = node('div', 'visual-field-plan' + (!plan ? ' is-pending' : ''));
    if (!plan) {
      panel.append(node('strong', 'visual-plan-label', 'CROP-STAGE ADVICE / NOT VERIFIED'));
      panel.append(node('p', '', 'The current garden watch is loading or unavailable for this selection. These photos are comparisons only. Do not treat an unmatched or unavailable result as proof of absence.'));
      const a = node('a', '', 'Check the seasonal scouting desk');
      a.href = '#watch-list'; panel.append(a);
      return panel;
    }
    const dormant = fieldPlan.mode === 'OFF_SEASON';
    const inWindow = !dormant && plan.seasonMatches && plan.stageMatches;
    const label = dormant ? 'OFF-SEASON / PLAN FOR NEXT YEAR' :
      inWindow ? 'SEASONAL SCOUTING / CHECK THE PLANT' : 'OUTSIDE THE MATCHED CROP STAGE / PREPARE';
    panel.append(node('strong', 'visual-plan-label', label));
    if (dormant) {
      panel.append(node('p', 'visual-plan-primary', 'Next-season preparation: ' + plan.prevent));
    } else if (inWindow) {
      panel.append(node('p', 'visual-plan-primary', 'Where to check: ' + plan.where));
    } else {
      panel.append(node('p', 'visual-plan-primary', 'This problem is not flagged for the selected month and growth stage. Prepare now: ' + plan.prevent));
    }
    if (inWindow) {
      const detail = node('details', 'visual-plan-details');
      detail.append(node('summary', '', 'Prevention and if-confirmed steps'));
      detail.append(node('p', '', 'Prevent: ' + plan.prevent));
      detail.append(node('p', '', (item.kind === 'disease' ? 'After identifying the cause: ' : 'Only after confirming the organism: ') + plan.found));
      panel.append(detail);
    }
    if (plan.weatherFavorable && inWindow) {
      panel.append(node('p', 'visual-plan-caveat', 'The official forecast adds a broad weather-favorability cue for scouting, not a pest probability or local detection.'));
    }
    if (plan.state === 'GARDENER_REPORTED') {
      panel.append(node('p', 'visual-plan-caveat', 'A visitor-reported possible sighting is unverified and does not establish an infestation.'));
    }
    if (typeof plan.source === 'string' && plan.source.startsWith('https://')) {
      panel.append(external('Read the source scouting guidance', plan.source, 'visual-plan-source'));
    }
    panel.append(node('p', 'visual-plan-caveat', 'This is seasonal crop-stage advice, not a diagnosis. Photos and symptoms never verify current local presence.'));
    return panel;
  }
  window.addEventListener('garden-pest-watch:evidence', event => {
    const d = event.detail;
    fieldPlan = d && d.crop === crop.value && d.stage === stage?.value &&
      d.zip === (zip?.value || '') && Array.isArray(d.items) &&
      ['OFF_SEASON', 'SCOUTING'].includes(d.mode) ? d : null;
    render();
  });
  function render() {
    const cropName = crop.options[crop.selectedIndex]?.textContent || 'this crop';
    const choices = catalog.pests.filter(item => item.crops.includes(crop.value) && (view === 'all' || (view === 'disease' ? item.kind === 'disease' : item.kind !== 'disease')))
      .map(item => ({item, overlap: item.clues.filter(id => selected.has(id)).length}))
      .filter(candidate => !selected.size || candidate.overlap > 0)
      .sort((a,b) => b.overlap - a.overlap || a.item.name.localeCompare(b.item.name));
    results.replaceChildren();
    const chosenClues = selected.size ? selected.size + ' selected clue' + (selected.size === 1 ? '' : 's') : 'all available photo comparisons';
    intro.textContent = 'Showing ' + choices.length + ' illustrated comparison' + (choices.length === 1 ? '' : 's') +
      ' for ' + cropName + ' · ' + chosenClues + '. Matching clues indicate topics worth checking, not a diagnosis or measured likelihood.';
    if (!choices.length) {
      const note = node('div', 'visual-empty');
      note.append(node('strong', '', 'No verified photograph pair matches this crop and clue selection.'));
      note.append(node('p', '', 'Try clearing a clue or read your crop scouting notes below. An absent photo is not evidence that a pest is absent.'));
      results.append(note);
      return;
    }
    for (const {item,overlap} of choices) {
      const article = node('article', 'visual-result');
      article.append(node('span', 'visual-index', selected.size ? overlap + ' of ' + selected.size + ' selected clue' + (selected.size === 1 ? '' : 's') + ' illustrated' : item.kind === 'disease' ? 'DISEASE SYMPTOM EXAMPLES' : 'INSECT / DAMAGE COMPARISON'));
      if (item.kind === 'disease') article.classList.add('is-disease');
      article.append(node('h3', '', item.name));
      article.append(renderPair(item.id, false));
      article.append(node('p', 'visual-interpretation', item.diagnostic));
      const looks = node('p', 'visual-lookalike');
      looks.append(node('strong', '', 'Before deciding: '), document.createTextNode(item.lookalike));
      article.append(looks);
      if (item.whatToCheck) {
        const next = node('p', 'visual-next');
        next.append(node('strong', '', 'Check this next: '), document.createTextNode(item.whatToCheck));
        article.append(next);
      }
      article.append(actionPanel(item));
      results.append(article);
    }
  }
  crop.addEventListener('change', render);
  const form = document.getElementById('watch-form');
  if (form) form.addEventListener('submit', () => queueMicrotask(render));
  // The core garden app restores the crop from query parameters in its script.
  window.addEventListener('load', render);
  render();
})();
