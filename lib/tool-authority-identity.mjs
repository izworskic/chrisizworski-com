const CANONICAL_PERSON_NAME = 'Chris Izworski';
const PUBLISHING_NODE_TYPES = new Set([
  'WebPage',
  'WebSite',
  'WebApplication',
  'SoftwareApplication',
  'Dataset',
  'CollectionPage',
  'Article',
  'ProfilePage',
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
  const publishingNodes = documentNodes.filter(node =>
    typesOf(node).some(type => PUBLISHING_NODE_TYPES.has(type))
  );
  const authorCreatorValues = publishingNodes.flatMap(node => [
    ...roleValues(node.author),
    ...roleValues(node.creator),
  ]);
  const publisherValues = publishingNodes.flatMap(node => roleValues(node.publisher));
  const authorCreatorReferences = authorCreatorValues.map(referenceId);
  const publisherReferences = publisherValues.map(referenceId);

  const isChrisReference = value => {
    const id = referenceId(value);
    return id === personId ||
      value?.name === CANONICAL_PERSON_NAME ||
      /chris[-_]?izworski|#chris(?:$|[-_])/i.test(id);
  };
  const relevantRolePeople = [...authorCreatorValues, ...publisherValues]
    .filter(value => value && typeof value === 'object' && typesOf(value).includes('Person') && isChrisReference(value));
  const canonicalDefinitions = nodes.filter(node =>
    typesOf(node).includes('Person') && node['@id'] === personId
  );
  const definitionSet = new Set([...canonicalDefinitions, ...relevantRolePeople]);
  const personDefinitions = [...definitionSet];
  const validPersonDefinitions = personDefinitions.filter(node =>
    typesOf(node).includes('Person') &&
    node['@id'] === personId &&
    node.name === CANONICAL_PERSON_NAME &&
    normalize(node.url) === normalize(homepage)
  );

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
  const inconsistentChrisRefs = [...authorCreatorValues, ...publisherValues]
    .filter(isChrisReference)
    .map(referenceId)
    .filter(id => id !== personId);
  if (inconsistentChrisRefs.length) {
    errors.push(`Chris authority references do not resolve to the canonical Person: ${[...new Set(inconsistentChrisRefs)].join(', ')}.`);
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
