// Site-shell adapter for provider embeds copied from authoritative tool packages.
// Tool engines and indexed content remain owned by their source repositories.
function replaceAisEmbeds(html) {
  let changed=false;
  const output=html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, tag => {
    const match=tag.match(/\bsrc=["'](https:\/\/embed\.myshiptracking\.com\/embed[^"']*)["']/i);
    if(!match)return tag;
    const url=new URL(match[1].replace(/&amp;/g,'&'));
    const lat=Number(url.searchParams.get('lat')), lon=Number(url.searchParams.get('lng'));
    const region=Math.abs(lat-47.66556)<0.01&&Math.abs(lon+122.39722)<0.01?'ballard':Math.abs(lat-38.86917)<0.01&&Math.abs(lon+90.15361)<0.01?'melvin':null;
    if(!region)return tag;
    changed=true;return tag.replace(match[1],'/ais-map/?region='+region);
  });
  return changed ? output.replace(/(<a\b[^>]*href=["'])https:\/\/www\.myshiptracking\.com\/more\/embed-our-map(["'][^>]*>)[^<]*(<\/a>)/gi,'$1https://openwaters.io/ais/$2Open Waters AIS$3') : output;
}
module.exports=replaceAisEmbeds;
