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
  function figure(photo, role) {
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
    caption.append(node('strong', 'visual-kind', role === 'pest' ? 'THE PEST' : 'DAMAGE / FIELD CLUE'));
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
    pair.append(figure(evidence.pest, 'pest'), figure(evidence.damage, 'damage'));
    return pair;
  }
  // Existing forecast cards reuse the same image and license records.
  window.GardenPestVisuals = Object.freeze({renderPair});
  for (const clue of catalog.clues) {
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
    clueArea.append(button);
  }
  reset.addEventListener('click', function () {
    selected.clear();
    clueArea.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    render();
  });
  function render() {
    const cropName = crop.options[crop.selectedIndex]?.textContent || 'this crop';
    const choices = catalog.pests.filter(item => item.crops.includes(crop.value))
      .map(item => ({item, overlap: item.clues.filter(id => selected.has(id)).length}))
      .filter(candidate => !selected.size || candidate.overlap > 0)
      .sort((a,b) => b.overlap - a.overlap || a.item.name.localeCompare(b.item.name));
    results.replaceChildren();
    const chosenClues = selected.size ? selected.size + ' selected clue' + (selected.size === 1 ? '' : 's') : 'all reviewed photo pairs';
    intro.textContent = 'Showing ' + choices.length + ' illustrated comparison' + (choices.length === 1 ? '' : 's') +
      ' for ' + cropName + ' · ' + chosenClues + '. These are possible visual matches, never a diagnosis.';
    if (!choices.length) {
      const note = node('div', 'visual-empty');
      note.append(node('strong', '', 'No verified photograph pair matches this crop and clue selection.'));
      note.append(node('p', '', 'Try clearing a clue or read your crop scouting notes below. An absent photo is not evidence that a pest is absent.'));
      results.append(note);
      return;
    }
    for (const {item,overlap} of choices) {
      const article = node('article', 'visual-result');
      article.append(node('span', 'visual-index', selected.size ? overlap + ' matching visible clue' + (overlap === 1 ? '' : 's') : 'VERIFIED PHOTO PAIR'));
      article.append(node('h3', '', item.name));
      article.append(renderPair(item.id, false));
      article.append(node('p', 'visual-interpretation', item.diagnostic));
      const looks = node('p', 'visual-lookalike');
      looks.append(node('strong', '', 'Before deciding: '), document.createTextNode(item.lookalike));
      article.append(looks);
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
