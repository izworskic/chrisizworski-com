/** Source and markup safeguards for review-only Foundry previews. No remote fetches. */
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const slugOK = s => typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
export const https = s => {
  if (typeof s !== 'string') return false;
  try { const u = new URL(s); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password; } catch { return false; }
};
export function validIso(value) {
  if (typeof value !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!m) return false;
  const [, y, month, day, h, min, s, zone, zh, zm] = m;
  const days = new Date(Date.UTC(Number(y), Number(month), 0)).getUTCDate();
  return Number(y) >= 1000 && +month >= 1 && +month <= 12 && +day >= 1 && +day <= days && +h < 24 && +min < 60 && +s < 60 && (zone === 'Z' || (+zh <= 14 && +zm < 60 && (+zh !== 14 || +zm === 0))) && Number.isFinite(Date.parse(value));
}
export const kinds = new Set(['observation','forecast','official-notice','official-reference','historical','editorial','unverified']);
export function qualification(record, now = new Date()) {
  if (record.conflictsWith?.length) return 'CONFLICTING EVIDENCE — unresolved; inspect both sources';
  if (['forecast','official-notice'].includes(record.kind) && record.validUntil && Date.parse(record.validUntil) <= +now) return record.kind === 'forecast' ? 'EXPIRED FORECAST — not current' : 'EXPIRED NOTICE — historical context only';
  if (record.kind === 'observation' && Number.isFinite(record.maxAgeHours) && Date.parse(record.observedAt || record.issuedAt) + record.maxAgeHours * 3600000 <= +now) return 'STALE OBSERVATION — historical context only';
  return ({observation:'Dated observation, not a live guarantee',forecast:'Forecast, not observed', 'official-notice':'Dated official notice; scope-limited','official-reference':'Official reference; not an open-now claim', historical:'Historical context', editorial:'Editorial interpretation',unverified:'Unverified — do not rely on for access'})[record.kind] || 'Unknown evidence';
}
export function sourceLinks(spec) {
  if (!spec.sources?.length) return '<p>No source links supplied. This is not a verified visitor recommendation.</p>';
  return '<ul>' + spec.sources.map(s=>'<li><a target="_blank" rel="noopener noreferrer" href="'+esc(s.url)+'">'+esc(s.label)+'</a>'+ (spec.schemaVersion===2 ? '<details><summary>Source context</summary><p>'+esc(s.publisher)+' · '+esc(s.scope)+'</p><p>Author-reported check: '+esc(s.checkedAt)+'</p><p>Rights basis (requires review): '+esc(s.rights)+'</p><p>'+esc(s.limitation)+'</p></details>' : '') +'</li>').join('') + '</ul>';
}
export const recordTime = r => 'Issued: '+r.issuedAt+(r.observedAt?' · Observed: '+r.observedAt:'')+(r.validUntil?' · Valid until: '+r.validUntil:'');
export function evidenceList(records, emptyText) {
  if (!records.length) return '<p class="empty">'+esc(emptyText)+'</p>';
  return '<ol class="evidence">' + records.map(r => '<li><b>'+esc(r.title)+'</b> <small>'+esc(qualification(r))+'</small><p>'+esc(r.summary)+'</p><p><a href="'+esc(r.sourceUrl)+'" rel="noopener noreferrer" target="_blank">Source</a> · '+esc(r.issuedAt)+'</p></li>').join('') + '</ol>';
}
export const previewBanner = '<div class="preview" role="note">DEVELOPMENT PREVIEW · NOT A LIVE CONDITIONS REPORT · NOINDEX</div>';
export function baseHead(spec, styles) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>'+esc(spec.title)+' · Experience Foundry Preview</title><style>body{overflow-wrap:anywhere}main>*{min-width:0}.snapshot{font:12px/1.5 system-ui;margin:0 0 1rem}'+styles+'</style></head><body>';
}
export const snapshotNote = now => '<p class="snapshot">Evidence evaluated at <time>'+esc(now.toISOString())+'</time>. Static review snapshot; labels do not refresh automatically.</p>';
export const endHtml = '</body></html>';
export const embeddedJSON = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
