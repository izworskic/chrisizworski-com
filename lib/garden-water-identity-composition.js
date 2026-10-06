// Route-specific deployment composition, sourced from the owner-approved
// public/national-tools/garden-water/index.html at owner main 7e467e7014dba3f1cee9f4e88b3d8dfa0a911f60.
const PERSON_ID = 'https://chrisizworski.com/#person';
const PAGE_URL = 'https://chrisizworski.com/national-tools/garden-water/';
const PERSON = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Chris Izworski',
  url: 'https://chrisizworski.com/',
};
const APPLICATION = {
  '@type': 'WebApplication',
  name: 'Garden Water Today',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  isAccessibleForFree: true,
  url: PAGE_URL,
  description: 'A U.S. garden watering decision using observed NOAA weather, National Weather Service forecast signals, and USDA mapped soil context.',
  author: { '@id': PERSON_ID },
  publisher: { '@id': PERSON_ID },
  dateModified: '2026-09-08',
};

function hasType(node, wanted) {
  const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
  return types.includes(wanted);
}

function allObjects(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) allObjects(item, output);
  } else if (value && typeof value === 'object') {
    output.push(value);
    for (const child of Object.values(value)) allObjects(child, output);
  }
  return output;
}

function isPersonDefinition(node) {
  return hasType(node, 'Person') && node['@id'] === PERSON_ID;
}

function isExpectedPerson(node) {
  return isPersonDefinition(node)
    && node.name === PERSON.name
    && node.url === PERSON.url;
}

function isAppAtCanonical(node) {
  return node?.url === PAGE_URL && hasType(node, 'WebApplication');
}

function isPageAtCanonical(node) {
  return node?.url === PAGE_URL && hasType(node, 'WebPage');
}

function hasExpectedReference(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && value['@id'] === PERSON_ID;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * Add the owner-approved root-page identity graph without replacing upstream
 * content. The caller is the canonical Garden Water root route only.
 *
 * If upstream has conflicting/ambiguous identity data, return its HTML intact
 * rather than inventing a competing entity or failing the weather utility.
 */
function composeGardenWaterIdentityGraph(html) {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  const scripts = [];
  let match;
  while ((match = scriptPattern.exec(html))) {
    if (!/\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')/i.test(match[1])) continue;
    let document;
    try {
      document = JSON.parse(match[2]);
    } catch {
      return html;
    }
    scripts.push({ start: match.index, end: scriptPattern.lastIndex, open: match[0].slice(0, match[0].indexOf('>') + 1), document });
  }

  const nodes = scripts.flatMap(script => allObjects(script.document));
  const personIdNodes = nodes.filter(node => node['@id'] === PERSON_ID);
  const personMatches = personIdNodes.filter(node => hasType(node, 'Person'));
  const appMatches = nodes.filter(isAppAtCanonical);
  const pageMatches = nodes.filter(isPageAtCanonical);

  if (personMatches.length > 1 || personMatches.some(node => !isExpectedPerson(node))) return html;
  if (personIdNodes.some(node => node['@type'] !== undefined && !hasType(node, 'Person'))) return html;
  // More than one page/application candidate at the canonical URL is ambiguous.
  // A lone WebPage is preserved and does not prevent adding the owner WebApplication.
  if (appMatches.length > 1 || pageMatches.length > 1) return html;

  const app = appMatches[0];
  if (app && !hasType(app, 'WebApplication')) return html;
  if (app && app.name !== undefined && app.name !== APPLICATION.name) return html;
  if (app && app.author !== undefined && !hasExpectedReference(app.author)) return html;
  if (app && app.publisher !== undefined && !hasExpectedReference(app.publisher)) return html;
  if (app && Object.entries(APPLICATION).some(([key, value]) => app[key] !== undefined
    && JSON.stringify(app[key]) !== JSON.stringify(value))) return html;

  const personExists = personMatches.length === 1;
  const needsPerson = !personExists;
  const needsApp = !app;
  const missingApplicationFields = app
    ? Object.keys(APPLICATION).filter(key => app[key] === undefined)
    : [];
  const needsAppUpdate = Boolean(app && missingApplicationFields.length);

  if (!needsPerson && !needsApp && !needsAppUpdate) return html;

  let output = html;
  if (needsAppUpdate) {
    for (const key of missingApplicationFields) app[key] = APPLICATION[key];
  }

  // If the existing application node needs references, replace only its JSON-LD
  // script. Other nodes in that graph and all non-schema HTML remain intact.
  if (needsAppUpdate) {
    const ownerScript = scripts.find(script => allObjects(script.document).includes(app));
    if (!ownerScript) return html;
    const serialized = safeJson(ownerScript.document);
    output = output.slice(0, ownerScript.start)
      + ownerScript.open + serialized + '</script>'
      + output.slice(ownerScript.end);
  }

  const additions = [];
  if (needsPerson) additions.push(PERSON);
  if (needsApp) additions.push(APPLICATION);
  if (additions.length) {
    const graph = safeJson({ '@context': 'https://schema.org', '@graph': additions });
    output = output.replace(/<\/head\s*>/i, '<script type="application/ld+json">' + graph + '</script>\n</head>');
  }
  return output;
}

module.exports = { composeGardenWaterIdentityGraph };
