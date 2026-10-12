import { readFileSync } from 'node:fs';
import { addCreatorAttribution } from '../lib/creator-attribution.mjs';

// Deployment composition only: retain the hub's search/schema contracts while
// the pinned owner supplies the visitor experience and all operational logic.
const shell = JSON.parse(readFileSync(new URL('../config/ballard-site-shell.json', import.meta.url), 'utf8'));
const personId = 'https://chrisizworski.com/#person';
const publishingTypes = new Set(['WebPage', 'WebSite', 'WebApplication']);
// Stable keys prevent duplicate WebPage and FAQPage nodes when upstream has an older name/no @id.
const keyFor = node => node['@type'] === 'FAQPage' ? 'FAQPage' :
  (node['@type'] === 'WebPage' && node.url?.startsWith('https://chrisizworski.com/ballard-locks/') ? 'WebPage:' + node.url :
  node['@id'] || `${node['@type']}:${node.name || ''}`);
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');


const ctrTargets = new Set(['/ballard-locks/', '/ballard-locks/salmon-counts/']);
function applyBallardCtr(html, route, page) {
  if (ctrTargets.has(route)) {
    const social = [
      ['property', 'og:title', page.title],
      ['property', 'og:description', page.description],
      ['property', 'og:type', 'website'],
      ['property', 'og:url', 'https://chrisizworski.com' + route],
      ['name', 'twitter:card', 'summary'],
      ['name', 'twitter:title', page.title],
      ['name', 'twitter:description', page.description],
    ];
    for (const [attr, key, value] of social) {
      const tag = '<meta ' + attr + '="' + key + '" content="' + escape(value) + '">';
      const existing = new RegExp('<meta\\b(?=[^>]*\\b' + attr + '=["\\x27]' + key + '["\\x27])[^>]*>', 'i');
      html = existing.test(html) ? html.replace(existing, tag) : html.replace('</head>', tag + '\n</head>');
    }
    const faq = page.graph.find(node => node['@type'] === 'FAQPage');
    if (!faq || !Array.isArray(faq.mainEntity)) throw new Error('Ballard CTR: FAQ missing for ' + route);
    const questions = faq.mainEntity.map(item =>
      '<div style="margin-top:1rem"><h3 style="font-size:1.12rem;margin:0 0 .35rem">' + escape(item.name) +
      '</h3><p style="margin:0;color:#526b70">' + escape(item.acceptedAnswer.text) + '</p></div>'
    ).join('');
    const faqHtml = '<section class="section wrap" data-ballard-ctr-v1="faq" aria-label="Ballard Locks frequently asked questions" style="padding:1rem 0 2rem"><h2>Ballard Locks questions answered</h2>' + questions + '</section>';
    if (!html.includes('</main>')) throw new Error('Ballard CTR: main landmark missing');
    html = html.replace('</main>', faqHtml + '</main>');
  }
  if (route === '/ballard-locks/salmon-counts/') {
    const original = 'const best=[...fresh].sort((a,b)=>b.latest.daily-a.latest.daily)[0];';
    if (!html.includes(original)) throw new Error('Ballard CTR: salmon count presentation contract moved');
    html = html.replace(original, "const best=[...fresh].sort((a,b)=>b.latest.daily-a.latest.daily)[0]||[...f.species].filter(s=>s.latest?.date).sort((a,b)=>String(b.latest.date).localeCompare(String(a.latest.date)))[0];");
    const oldLead = '${best.species} is the strongest current published signal';
    if (!html.includes(oldLead)) throw new Error('Ballard CTR: salmon count headline contract moved');
    html = html.replace(oldLead, '${nf.format(best.latest.daily)} ${best.species} in latest published daily count');
  }
  if (route === '/ballard-locks/tour/') {
    const links = '<nav class="wrap" data-ballard-ctr-v1="sibling-links" aria-label="Related Ballard Locks resources" style="padding:1rem 0 2rem"><a href="/ballard-locks/">Ballard Locks today and access</a> · <a href="/ballard-locks/salmon-counts/">Latest fish and salmon counts</a></nav>';
    html = html.replace('</main>', links + '</main>');
  }
  return html;
}

export function applyBallardSiteShell(source, route) {
  const page = shell.pages[route];
  if (!page) throw new Error(`Ballard shell: unregistered route ${route}`);
  const nodes = new Map(page.graph.map(node => [keyFor(node), structuredClone(node)]));
  let html = source.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>\s*/gi, (_, json) => {
    const data = JSON.parse(json);
    for (const node of data['@graph'] || [data]) {
      const key = keyFor(node);
      const merged = { ...nodes.get(key), ...node };
      // Use CTR title and visible FAQ over pinned older copy on the target pages.
      if (ctrTargets.has(route) && ['WebPage', 'WebApplication'].includes(node['@type'])) {
        merged.name = page.title;
        merged.description = page.description;
      }
      if (ctrTargets.has(route) && node['@type'] === 'FAQPage') {
        merged.mainEntity = page.graph.find(item => item['@type'] === 'FAQPage').mainEntity;
      }
      nodes.set(key, merged);
    }
    return '';
  });
  for (const node of nodes.values()) {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (types.some(type => publishingTypes.has(type))) {
      node.author = { '@id': personId };
      node.creator = { '@id': personId };
      node.publisher = { '@id': personId };
      node.dateModified = shell.modified;
    }
  }
  nodes.set(personId, { '@type': 'Person', '@id': personId, name: 'Chris Izworski', url: 'https://chrisizworski.com/' });
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(page.title)}</title>`);
  html = html.replace(/<meta\b(?=[^>]*name=["']description["'])[^>]*>/i, `<meta name="description" content="${escape(page.description)}">`);
  html = html.replace(/<\/head>/i, `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [...nodes.values()] }).replace(/</g, '\\u003c')}</script>\n</head>`);
  // Reuse an existing quiet footer credit before adding one to child pages.
  html = html.replace(/Built by <a href="https:\/\/chrisizworski\.com\/">Chris Izworski<\/a>/g, 'Built by <a href="https://chrisizworski.com/chris-izworski/" rel="author">Chris Izworski</a>');
  html = applyBallardCtr(html, route, page);
  return addCreatorAttribution(html);
}
