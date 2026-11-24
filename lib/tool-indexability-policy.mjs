/* Authority audit indexing policy:
 * Indexable canonical owners must not emit noindex or nofollow.
 * Deliberately non-indexable visitor pilots must remain noindex,follow;
 * listing such tools in an indexable directory is not authority to index them.
 */
export function checkToolIndexability({tool,robotsMeta='',robotsHeader=''}) {
  const meta=String(robotsMeta).trim().toLowerCase().replace(/\s+/g,'');
  const header=String(robotsHeader).trim().toLowerCase();
  if(tool?.searchTreatment?.status==='noindex-pilot') {
    return {
      ok: meta==='noindex,follow' && !/nofollow/i.test(header),
      message:'Noindex pilot must retain a noindex,follow robots meta directive without a nofollow response header.'
    };
  }
  return {
    ok: !/noindex|nofollow/i.test(meta) && !/noindex|nofollow/i.test(header),
    message:'Indexability is blocked by a robots directive.'
  };
}
