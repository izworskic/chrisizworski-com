const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`Missing expected ${label}`);
  return content.replace(from, to);
}

// 1) Mackinac Bridge: SERP-only CTR improvement. Preserve H1, canonical, schema and functionality.
{
  const path = 'public/mackinac-bridge-live/index.html';
  let html = read(path);
  html = replaceOnce(
    html,
    '<title>Mackinac Bridge Conditions Today: Live Status &amp; Cameras</title>',
    '<title>Is the Mackinac Bridge Open Today? Live Status &amp; Cameras</title>',
    'Mackinac title'
  );
  html = replaceOnce(
    html,
    '<meta name="description" content="Is the Mackinac Bridge open or closed today? Check the official status, live cameras, RV and trailer restrictions, NWS weather, and approach-road events.">',
    '<meta name="description" content="Check whether the Mackinac Bridge is open now, view live cameras, and see current wind and travel conditions before you cross.">',
    'Mackinac meta description'
  );
  write(path, html);
}

// 2) Tool registry: all owner-closed growth/search experiments are inactive as of 2026-09-02.
{
  const path = 'benchmarks/tool-network-registry.json';
  const data = JSON.parse(read(path));
  data.updated = '2026-09-02';
  delete data.rules.experimentProtection;
  data.rules.searchChangePolicy = 'No search experiment or freeze is active. Search-facing changes follow current evidence, canonical ownership, factual integrity, and cannibalization safety.';

  for (const tool of data.tools || []) {
    const st = tool.searchTreatment;
    if (!st) continue;
    const stale = st.status === 'protected' || st.status === 'active-measurement-window' || Object.prototype.hasOwnProperty.call(st, 'experiment') || Object.prototype.hasOwnProperty.call(st, 'windowStart') || Object.prototype.hasOwnProperty.call(st, 'minimumWindowDays') || Object.prototype.hasOwnProperty.call(st, 'evaluationWindow');
    if (stale) tool.searchTreatment = { status: 'active' };
  }

  for (const item of data.expansionOpportunities || []) {
    if (item.id === 'fall-river-window') {
      item.status = 'shelved';
      item.note = 'Shelved after the contextual learning pass. Do not create a standalone canonical unless future independent demand clearly warrants reopening the idea.';
    }
    if (item.id === 'spring-natural-year' && typeof item.note === 'string') {
      item.note = item.note.replace('first test via contextual handoffs', 'first validate via contextual handoffs');
    }
  }
  write(path, JSON.stringify(data, null, 2) + '\n');
}

// 3) Operational actions: keep durable relationships and launch gates, remove running-test state.
{
  const path = 'benchmarks/tool-network-actions.json';
  const data = JSON.parse(read(path));
  data.version = '2.0.0';
  data.updated = '2026-09-02';
  data.purpose = 'Operational overlay for durable Tool Network Registry relationships, released repairs, and launch gates. No growth or search experiment is active.';
  for (const repair of data.repairs || []) {
    if (repair.status === 'released-measuring') repair.status = 'released';
    if (repair.id === 'outdoors-now-growth-operating-system') {
      repair.next = 'Continue ordinary Search Console and product observation; no experiment freeze or fixed evaluation window is active.';
    }
  }
  delete data.experiments;
  write(path, JSON.stringify(data, null, 2) + '\n');
}

// 4) Retire the experiment ledger while preserving only the durable lessons we are acting on.
{
  const path = 'benchmarks/growth-experiments.json';
  const retired = {
    ledgerVersion: '2.0.0',
    updated: '2026-09-02',
    status: 'retired',
    operatingMode: 'ship-and-observe',
    activeExperiments: [],
    note: 'All Search Console growth experiments were ended early by the owner on 2026-09-02. No title, description, H1, canonical, structured-data, or indexability experiment freeze is active.',
    durableLearnings: [
      'Aurora rankings improved while CTR fell; prioritize query-to-SERP promise matching over another tool rebuild.',
      'Mackinac Bridge ranks near page one but underperforms on CTR; lead the snippet with the open-today decision.',
      'Michigan Fall Color retains the single statewide map and peak-forecast canonical; amplify it through contextual inbound links rather than duplicate statewide pages.',
      'Soo Locks remains the strongest current operational-intent CTR reference surface.'
    ]
  };
  write(path, JSON.stringify(retired, null, 2) + '\n');
}

// 5) Remove the obsolete test whose job was to pin experiment/freeze state.
{
  const path = 'tests/seasonal-search-protection.test.js';
  if (fs.existsSync(path)) fs.unlinkSync(path);
}

// 6) Fall Color amplification: contextual inbound links from broad, noncompeting travel/outdoor surfaces.
{
  const path = 'public/lake-superior-circle-tour/index.html';
  let html = read(path);
  const anchor = '<p style="font-size:13px;color:#555;line-height:1.8;margin-bottom:10px">The circle can be driven clockwise or counterclockwise, starting anywhere. This guide and map default to a continuous <strong>counterclockwise</strong> loop: Duluth → Wisconsin → Michigan\'s Upper Peninsula → Ontario → Minnesota → Duluth. That order keeps Lake Superior mostly on the driver\'s side. Allow <strong>10–15 days</strong> for an unhurried trip.</p>';
  const addition = anchor + '\n      <p style="font-size:13px;color:#555;line-height:1.8;margin-bottom:10px"><strong>September or October:</strong> before locking in the Michigan leg, check the <a href="/fall-color/">Michigan Fall Color Map and peak forecast</a> for current statewide timing.</p>';
  html = replaceOnce(html, anchor, addition, 'Circle Tour fall-color handoff');
  write(path, html);
}

{
  const path = 'public/michigan-paddling/index.html';
  let html = read(path);
  const anchor = '<p>The frame this guide uses is not difficulty class or river mileage. It is intent: are you out for a few hours, a weekend, or a real trip? That distinction matters more than which river you pick. A first-time paddler on the Pine in low water is in over their head; an experienced canoeist on the Two Hearted in fall has a long day at a low pace. The river is rarely the variable that breaks a trip. The plan is.</p>';
  const addition = anchor + '\n<p>If you are planning a September or October paddle for scenery, check the <a href="/fall-color/">Michigan Fall Color Map and peak forecast</a> first, then use the river guidance here to choose the actual trip.</p>';
  html = replaceOnce(html, anchor, addition, 'Michigan Paddling fall-color handoff');
  write(path, html);
}

console.log('Closed stale experiments, shipped Mackinac SERP copy, and amplified Fall Color.');
