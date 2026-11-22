/* Michigan Winter Trails: source-backed trail comparison.
 * No snow measurements, plowing, open/closed statuses or trip times are inferred here.
 * Route facts come from the existing crawlable, editor-reviewed trail dossiers.
 */
export function shortlist(routes, choices) {
  const mode = choices.mode || 'all';
  const region = choices.region || 'all';
  const effort = choices.effort || 'all';
  return routes.filter(route =>
    (mode === 'all' || route.tag === mode) &&
    (region === 'all' || route.region === region) &&
    (effort === 'all' || route.effort === effort) &&
    (!choices.officialOnly || route.access === 'documented')
  );
}

export function pairFor(routes, offset = 0) {
  if (!routes.length) return [];
  const start = ((offset % routes.length) + routes.length) % routes.length;
  return routes.length === 1 ? [routes[0]] :
    [routes[start], routes[(start + 1) % routes.length]];
}

function init() {
  const get = id => document.getElementById(id);
  const nodes = {
    mode: get('trl-desk-mode'), region: get('trl-desk-region'),
    effort: get('trl-desk-effort'), official: get('trl-desk-official'),
    results: get('trl-desk-results'), status: get('trl-desk-outcome'),
    next: get('trl-desk-next'), map: get('trl-desk-map'),
    clear: get('trl-desk-clear')
  };
  if (Object.values(nodes).some(node => !node)) return;
  const trailNodes = [...document.querySelectorAll('.wf-story')];
  const routes = trailNodes.map(node => ({
    id: node.id, element: node,
    tag: node.dataset.tag, region: node.dataset.region,
    effort: node.dataset.effort, access: node.dataset.access,
    title: node.querySelector('h3')?.textContent?.trim() || 'Winter trail',
    context: node.querySelector('.wf-kicker')?.textContent?.trim() || '',
    use: node.querySelector('.trl-status')?.textContent?.trim() || '',
    caution: node.querySelector('.wf-access')?.textContent?.trim() || '',
    source: node.dataset.evidence || ''
  }));
  let matches = [], offset = 0;
  const accessText = {
    documented: 'Official winter route documentation. Current road and lot status unverified.',
    conditional: 'Grooming or winter approach depends on conditions. Check the operator.',
    limited: 'Seasonal road or backcountry approach. Check access before traveling.'
  };
  function textNode(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = value;
    return el;
  }
  function options() {
    return {
      mode: nodes.mode.value, region: nodes.region.value,
      effort: nodes.effort.value, officialOnly: nodes.official.checked
    };
  }
  function syncOriginal() {
    const chosen = options();
    const region = get('wf-region'), effort = get('wf-effort'), access = get('trl-access');
    if (region) { region.value = chosen.region; region.dispatchEvent(new Event('change', {bubbles:true})); }
    if (effort) { effort.value = chosen.effort; effort.dispatchEvent(new Event('change', {bubbles:true})); }
    if (access) { access.value = chosen.officialOnly ? 'documented' : 'all'; access.dispatchEvent(new Event('change', {bubbles:true})); }
    const chip = document.querySelector('.wf-chip[data-tag="' + chosen.mode + '"]');
    if (chip) chip.click();
  }
  function toTrail(route) {
    syncOriginal();
    const h = route.element.querySelector('h3');
    route.element.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
    if (h) { h.tabIndex = -1; h.focus({preventScroll:true}); }
  }
  function sourceLink(url) {
    try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : null; }
    catch { return null; }
  }
  function makeCard(route, position) {
    const article = document.createElement('article');
    article.className = 'trl-desk-option';
    article.append(
      textNode('span','trl-desk-option-index', position === 0 ? 'OPTION A' : 'OPTION B'),
      textNode('h3','',route.title),
      textNode('p','trl-desk-option-meta',route.context),
      textNode('p','trl-desk-option-use',route.use),
      textNode('p','trl-desk-option-access',accessText[route.access] || 'Winter access must be checked independently.')
    );
    if (route.caution) {
      const details = document.createElement('details');
      const summary = textNode('summary','','Read the specific winter caution');
      details.append(summary,textNode('p','',route.caution));
      article.append(details);
    }
    const actions = document.createElement('div');
    actions.className = 'trl-desk-option-actions';
    const visit = textNode('button','','Read trail field notes');
    visit.type='button';
    visit.addEventListener('click',() => toTrail(route));
    actions.append(visit);
    const source = sourceLink(route.source);
    if (source) {
      const official = textNode('a','','Official trail source');
      official.href=source;official.target='_blank';official.rel='noopener noreferrer';
      actions.append(official);
    }
    article.append(actions);
    return article;
  }
  function render() {
    const selected = pairFor(matches,offset);
    nodes.results.replaceChildren();
    if (!matches.length) {
      nodes.results.append(textNode('p','trl-desk-none','No documented featured trail matches these choices. Widen the region, effort or winter-map preference.'));
      nodes.status.textContent = 'No matches in the 15 featured systems. No trail condition is implied.';
      nodes.next.disabled = true;
      nodes.map.disabled = true;
      return;
    }
    selected.forEach((route,i) => nodes.results.append(makeCard(route,i)));
    nodes.status.textContent = 'Comparing ' + selected.length + ' of ' + matches.length +
      ' documented trail systems. Editorial comparison, not a live opening or safety ranking.';
    nodes.next.disabled = matches.length <= 2;
    nodes.map.disabled = false;
  }
  function update() {
    offset=0;
    matches=shortlist(routes,options());
    render();
  }
  for (const el of [nodes.mode,nodes.region,nodes.effort,nodes.official])
    el.addEventListener('change',update);
  nodes.next.addEventListener('click',() => {
    if (matches.length <= 2) return;
    offset = (offset + 2) % matches.length;
    render();
  });
  nodes.map.addEventListener('click',() => {
    if (!matches.length) return;
    syncOriginal();
    document.dispatchEvent(new CustomEvent('winter-trails:fit-map'));
    get('wf-map')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  });
  nodes.clear.addEventListener('click',() => {
    nodes.mode.value='snowshoe';nodes.region.value='all';
    nodes.effort.value='all';nodes.official.checked=false;
    update();
  });
  update();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}
