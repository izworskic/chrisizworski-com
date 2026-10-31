/**
 * Pukaskwa trail metadata, transcribed from Parks Canada's day-hiking guide.
 * Metadata is not an assertion that a trail is currently open.
 * Checked 2026-10-31. Do not add unverified coordinates or cultural-site pins.
 * https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking
 */
export const SOURCES = Object.freeze({
  trails: 'https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking',
  conditions: 'https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions',
  hours: 'https://parks.canada.ca/pn-np/on/pukaskwa/visit/heures-hours',
  backcountry: 'https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/arriere-back',
});

/**
 * Operating-hours guidance says May 15–Oct 15; reservation guidance says May 15–Oct 14.
 * The smaller verified intersection is a conservative planning boundary, NOT
 * a representation of current permits or park staff authorization.
 */
export const BACKCOUNTRY_WINDOW = Object.freeze({
  starts: '05-15',
  endsInclusive: '10-14',
  conflictingPublishedEnd: '10-15',
  conflict: true,
  sourceUrls: [SOURCES.hours, SOURCES.backcountry],
});

export const DAY_HIKES = Object.freeze([
  { id: 'boardwalk-beach', name: 'Boardwalk Beach Trail', sourceName: 'Boardwalk Beach Trail', distanceKm: 1.2, durationMinutes: 30, elevationChangeM: 2, difficulty: 'easy', kind: 'day', conditions: ['Boardwalk Beach Trail'] },
  { id: 'hattie-cove-fire-walk', name: 'Hattie Cove Fire Walk', sourceName: null, distanceKm: 0.7, durationMinutes: 20, elevationChangeM: 2, difficulty: 'easy', kind: 'day', conditions: [], note: 'Parks Canada does not publish a dedicated status row for this walk. Do not infer it is open from the nearby Coastal Hiking Trail.' },
  { id: 'beach', name: 'Beach Trail', sourceName: 'Beach Trail', distanceKm: 2, durationMinutes: 60, elevationChangeM: 5, difficulty: 'moderate', kind: 'day', conditions: ['Beach Trail'] },
  { id: 'southern-headland', name: 'Southern Headland Trail', sourceName: 'Southern Headland trail', distanceKm: 2.2, durationMinutes: 75, elevationChangeM: 15, difficulty: 'moderate', kind: 'day', conditions: ['Southern Headland trail'] },
  { id: 'manito-miikana', name: 'Manito Miikana', sourceName: 'Manito Miikana Trail', distanceKm: 2, durationMinutes: 60, elevationChangeM: 17, difficulty: 'moderate', kind: 'day', conditions: ['Manito Miikana Trail'] },
  { id: 'bimose-kinoomagewnan', name: 'Bimose Kinoomagewnan', sourceName: 'Bimose Kinoomagewnan Trail', distanceKm: 3.7, durationMinutes: 120, elevationChangeM: 12, difficulty: 'moderate', kind: 'day', conditions: ['Bimose Kinoomagewnan Trail'] },
  { id: 'combination-hike', name: 'Combination Hike', sourceName: null, distanceKm: 6.3, durationMinutes: 210, elevationChangeM: 17, difficulty: 'moderate', kind: 'day', conditions: ['Southern Headland trail', 'Beach Trail', 'Bimose Kinoomagewnan Trail'], note: 'Route includes connecting pathways; named component statuses are not proof that every connector is open.' },
  { id: 'white-river-bridge', name: 'White River Suspension Bridge Trail', sourceName: 'White River Suspension Bridge Trail', distanceKm: 18, durationMinutes: 540, elevationChangeM: 15, difficulty: 'difficult', kind: 'day', conditions: ['White River Suspension Bridge Trail'], note: '8–9 hours reported; 540 minutes is the upper bound, not an ETA forecast.' },
]);

export const BACKCOUNTRY_ROUTES = Object.freeze([
  { id: 'mdaabii-miikna', name: 'Mdaabii Miikna', kind: 'backcountry', segmentPrefix: 'Mdaabii Miikna:' },
  { id: 'coastal-hiking-trail', name: 'Coastal Hiking Trail', kind: 'backcountry', segmentPrefix: 'Coastal Hiking Trail:' },
]);

export function getTrail(id) {
  return [...DAY_HIKES, ...BACKCOUNTRY_ROUTES].find(t => t.id === id) ?? null;
}
