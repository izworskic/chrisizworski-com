import { readFileSync } from 'node:fs';
import { addCreatorAttribution } from '../lib/creator-attribution.mjs';

// Deployment composition only: retain the hub's search/schema contracts while
// the pinned owner supplies the visitor experience and all operational logic.
const shell = JSON.parse(readFileSync(new URL('../config/ballard-site-shell.json', import.meta.url), 'utf8'));
const personId = 'https://chrisizworski.com/#person';
const publishingTypes = new Set(['WebPage', 'WebSite', 'WebApplication']);
const keyFor = node => node['@id'] || `${node['@type']}:${node.name || ''}`;
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function applyBallardSiteShell(source, route) {
  const page = shell.pages[route];
  if (!page) throw new Error(`Ballard shell: unregistered route ${route}`);
  const nodes = new Map(page.graph.map(node => [keyFor(node), structuredClone(node)]));
  let html = source.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>\s*/gi, (_, json) => {
    const data = JSON.parse(json);
    for (const node of data['@graph'] || [data]) {
      const key = keyFor(node);
      nodes.set(key, { ...nodes.get(key), ...node });
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
  return addCreatorAttribution(html);
}
