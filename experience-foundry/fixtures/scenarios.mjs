/** SYNTHETIC acceptance data, never real conditions or source verification. */
export const asOf = '2026-11-07T12:00:00Z';
export function scenarioSpec(base, scenario='populated') {
  const sourceUrl='https://example.com/synthetic-foundry-fixture';
  const record={id:'alpha',title:'Synthetic Alpha record',summary:'Synthetic acceptance content; no actual vessel, wildlife or visitor access claim.',kind:'observation',issuedAt:'2026-11-07T11:00:00Z',observedAt:'2026-11-07T10:00:00Z',maxAgeHours:6,sourceUrl,from:'Illustrative origin A',to:'Illustrative destination A'};
  const records=[record,{...record,id:'beta',title:'Synthetic Beta forecast',kind:'forecast',validUntil:'2026-11-07T14:00:00Z',from:'Illustrative origin B',to:'Illustrative destination B'},
    {...record,id:'gamma',title:'Synthetic scoped notice',kind:'official-notice',scope:'Illustrative gate only',validUntil:'2026-11-08T12:00:00Z'}];
  for(const r of records) if(r.kind!=='observation') {delete r.observedAt;delete r.maxAgeHours;}
  if(scenario==='stale') records[0].observedAt='2026-11-05T12:00:00Z';
  if(scenario==='expired') for(const r of records.slice(1)) r.validUntil=asOf;
  if(scenario==='conflict') records[0].conflictsWith=['beta'];
  if(scenario==='hostile') {records[0].title='<img src=x onerror="window.foundryInjected=true">';records[1].summary='</script><script>window.foundryInjected=true</script>'+'long-content-'.repeat(25);}
  return {...base,schemaVersion:2,title:'Synthetic Foundry acceptance preview',sources:[{url:sourceUrl,label:'Synthetic source; no actual observation',publisher:'Acceptance fixture author',scope:'Synthetic browser tests only',rights:'Synthetic text authored for repository acceptance tests',limitation:'Not evidence of any actual conditions',checkedAt:'2026-11-07T11:00:00Z'}],records:scenario==='empty'?[]:records};
}
