/** Source and markup safeguards for review-only Foundry previews. No remote fetches. */
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const slugOK = s => typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
export const https = s => {
  if (typeof s !== 'string') return false;
  try { const u = new URL(s); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password; } catch { return false; }
};
export const validIso = value => typeof value === 'string' && /\d{4}-\d\d-\d\dT\d\d:\d\d/.test(value) && Number.isFinite(Date.parse(value)) && /(?:Z|[+-]\d\d:\d\d)$/.test(value);
export const kinds = new Set(['observation','forecast','official-notice','official-reference','historical','editorial','unverified']);
export function qualification(record, now = new Date()) {
  if (record.kind === 'forecast' && record.validUntil && Date.parse(record.validUntil) < +now) return 'EXPIRED FORECAST — not current';
  if (record.kind === 'observation' && Number.isFinite(record.maxAgeHours) && Date.parse(record.issuedAt) + record.maxAgeHours * 3600000 < +now) return 'STALE OBSERVATION — historical context only';
  return ({observation:'Dated observation, not a live guarantee',forecast:'Forecast, not observed', 'official-notice':'Dated official notice; scope-limited','official-reference':'Official reference; not an open-now claim', historical:'Historical context', editorial:'Editorial interpretation',unverified:'Unverified — do not rely on for access'})[record.kind] || 'Unknown evidence';
}
export function sourceLinks(spec) {
  if (!spec.sources?.length) return '<p>No source links supplied. This is not a verified visitor recommendation.</p>';
  return '<ul>' + spec.sources.map(s=>'<li><a target="_blank" rel="noopener noreferrer" href="'+esc(s.url)+'">'+esc(s.label)+'</a></li>').join('') + '</ul>';
}
export function evidenceList(records, emptyText) {
  if (!records.length) return '<p class="empty">'+esc(emptyText)+'</p>';
  return '<ol class="evidence">' + records.map(r => '<li><b>'+esc(r.title)+'</b> <small>'+esc(qualification(r))+'</small><p>'+esc(r.summary)+'</p><p><a href="'+esc(r.sourceUrl)+'" rel="noopener noreferrer" target="_blank">Source</a> · '+esc(r.issuedAt)+'</p></li>').join('') + '</ol>';
}
export const previewBanner = '<div class="preview" role="note">DEVELOPMENT PREVIEW · NOT A LIVE CONDITIONS REPORT · NOINDEX</div>';
export function baseHead(spec, styles) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>'+esc(spec.title)+' · Experience Foundry Preview</title><style>'+styles+'</style></head><body>';
}
export const endHtml = '</body></html>';
export const embeddedJSON = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
