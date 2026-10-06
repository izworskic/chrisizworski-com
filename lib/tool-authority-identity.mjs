const CANONICAL_PERSON_NAME = 'Chris Izworski';
const PUBLISHING_NODE_TYPES = new Set([
  'WebPage',
  'WebSite',
  'WebApplication',
  'SoftwareApplication',
  'Dataset',
]);

const typesOf = node => Array.isArray(node?.['@type'])
  ? node['@type']
  : typeof node?.['@type'] === 'string'
    ? [node['@type']]
    : [];

const roleValues = value => Array.isArray(value) ? value : value == null ? [] : [value];

function referenceId(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value['@id'] === 'string') return value['@id'];
  return '';
}

/**
 * Check authorship and publishing attribution on top-level page/site/application
 * nodes only. Nested news articles, local businesses, locations, and subjects
 * can have their own legitimate authors/publishers and do not establish page
 * ownership.
 */
export function auditStructuredAuthority({ nodes, documentNodes, personId, homepage }) {
  const personDefinitions = nodes.filter(node => typesOf(node).includes('Person') &&
    (node['@id'] === personId || node.name === CANONICAL_PERSON_NAME));
  const validPersonDefinitions = personDefinitions.filter(node =>
    node['@id'] === personId &&
    node.name === CANONICAL_PERSON_NAME &&
    normalize(node.url) === normalize(homepage)
  );
  const publishingNodes = documentNodes.filter(node =>
    typesOf(node).some(type => PUBLISHING_NODE_TYPES.has(type))
  );

  const authorCreatorReferences = [];
  const publisherReferences = [];
  for (const node of publishingNodes) {
    for (const key of ['author', 'creator']) {
      for (const value of roleValues(node[key])) authorCreatorReferences.push(referenceId(value));
    }
    for (const value of roleValues(node.publisher)) publisherReferences.push(referenceId(value));
  }

  const errors = [];
  if (!validPersonDefinitions.length || validPersonDefinitions.length !== personDefinitions.length) {
    errors.push('Canonical Person definition is missing, duplicated with conflicts, or has a non-homepage url.');
  }
  if (!authorCreatorReferences.includes(personId)) {
    errors.push('No canonical Chris author/creator connection on a page, site, application, or dataset node.');
  }
  if (!publisherReferences.includes(personId)) {
    errors.push('No canonical Chris publisher connection on a page, site, application, or dataset node.');
  }

  return {
    personDefinitions: personDefinitions.map(person => ({ id: person['@id'] || '', url: person.url || '' })),
    authorCreatorReferences,
    publisherReferences,
    errors,
  };
}

function normalize(value) {
  try {
    const url = new URL(value);
    if (url.pathname === '/') return `${url.origin}/`;
    return url.href;
  } catch {
    return '';
  }
}
