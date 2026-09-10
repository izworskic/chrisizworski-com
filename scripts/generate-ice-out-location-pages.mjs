import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const parentPath=path.join(root,'public/national-tools/ice-out/index.html');
const lakes=[
  {slug:'lake-vermilion-minnesota',id:'lake-vermilion-mn',name:'Lake Vermilion, Minnesota',search:'Lake Vermilion',title:'Lake Vermilion Ice-Out Forecast & Spring Timing | Chris Izworski',description:'Check Lake Vermilion ice-out timing with calibrated history, live thaw weather, probability windows and NASA satellite imagery.'},
  {slug:'mille-lacs-minnesota',id:'mille-lacs-mn',name:'Mille Lacs Lake, Minnesota',search:'Mille Lacs',title:'Mille Lacs Ice-Out Forecast & Spring Timing | Chris Izworski',description:'Check Mille Lacs ice-out timing with calibrated history, live thaw weather, probability windows and NASA satellite imagery.'},
  {slug:'leech-lake-minnesota',id:'leech-lake-mn',name:'Leech Lake, Minnesota',search:'Leech Lake',title:'Leech Lake Ice-Out Forecast & Spring Timing | Chris Izworski',description:'Check Leech Lake ice-out timing with calibrated history, live thaw weather, probability windows and NASA satellite imagery.'},
  {slug:'houghton-lake-michigan',id:'houghton-lake-mi',name:'Houghton Lake, Michigan',search:'Houghton Lake',title:'Houghton Lake Ice-Out Forecast & Spring Timing | Chris Izworski',description:'Check Houghton Lake ice-out timing with calibrated history, live thaw weather, probability windows and NASA satellite imagery.'},
  {slug:'lake-winnipesaukee-new-hampshire',id:'winnipesaukee-nh',name:'Lake Winnipesaukee, New Hampshire',search:'Winnipesaukee',title:'Lake Winnipesaukee Ice-Out Forecast & Timing | Chris Izworski',description:'Check Lake Winnipesaukee ice-out timing with lake-specific spring signals, forecast windows and NASA satellite imagery.'},
  {slug:'moosehead-lake-maine',id:'moosehead-me',name:'Moosehead Lake, Maine',search:'Moosehead Lake',title:'Moosehead Lake Ice-Out Forecast & Spring Timing | Chris Izworski',description:'Check Moosehead Lake ice-out timing with lake-specific spring signals, probability windows and NASA satellite imagery.'},
  {slug:'lake-simcoe-ontario',id:'lake-simcoe-on',name:'Lake Simcoe, Ontario',search:'Lake Simcoe',title:'Lake Simcoe Ice-Out Forecast & Spring Timing | Chris Izworski',description:'Check Lake Simcoe ice-out timing with lake-specific spring signals, probability windows and NASA satellite imagery.'},
  {slug:'lake-of-the-woods',id:'lake-of-the-woods-on-mn',name:'Lake of the Woods, Ontario & Minnesota',search:'Lake of the Woods',title:'Lake of the Woods Ice-Out Forecast & Timing | Chris Izworski',description:'Check Lake of the Woods ice-out timing with lake-specific spring signals, probability windows and NASA satellite imagery.'}
];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=v=>JSON.stringify(v).replace(/</g,'\\u003c');
let source=fs.readFileSync(parentPath,'utf8').replace(/<section[^>]*data-ice-location-directory[\s\S]*?<\/section>/i,'');
for(const lake of lakes){
  const canonical=`https://chrisizworski.com/national-tools/ice-out/${lake.slug}/`;
  let h=source.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(lake.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/i,`<meta name="description" content="${esc(lake.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/i,`<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/i,`<meta property="og:title" content="${esc(lake.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/i,`<meta property="og:description" content="${esc(lake.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/i,`<meta property="og:url" content="${canonical}" />`);
  const faq=[
    {q:`When will ${lake.name} be ice-free?`,a:'The forecast updates from the lake’s calibrated seasonal baseline, live spring weather and available seasonal thaw signals. The displayed date is a probability window, not a guaranteed breakup date.'},
    {q:`Is the ${lake.name} ice-out forecast live?`,a:'During the active spring season, live weather and validated thaw signals can adjust the historical baseline. Outside the active season, the page shows the next spring outlook without pretending current weather predicts months ahead.'},
    {q:'Is this an ice-safety forecast?',a:'No. Ice-out timing does not estimate ice thickness or whether the ice can support people, vehicles or equipment.'}
  ];
  h=h.replace('</head>',`<script type="application/ld+json" data-ice-location-seo>${json({'@context':'https://schema.org','@graph':[{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'U.S. Outdoor Tools',item:'https://chrisizworski.com/national-tools/'},{'@type':'ListItem',position:2,name:'Lake Ice-Out Forecast',item:'https://chrisizworski.com/national-tools/ice-out/'},{'@type':'ListItem',position:3,name:lake.name,item:canonical}]},{'@type':'FAQPage',mainEntity:faq.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))}]})}</script></head>`);
  const siblingLinks=lakes.filter(x=>x.slug!==lake.slug).slice(0,5).map(x=>`<a href="/national-tools/ice-out/${x.slug}/">${esc(x.name)}</a>`).join(' · ');
  const context=`<section data-ice-location="${lake.slug}" style="max-width:980px;margin:18px auto 0;padding:0 20px"><div style="border:1px solid #ddd7cb;background:#fff;padding:16px;border-radius:6px"><strong>${esc(lake.name)} ice-out forecast</strong><p style="margin:6px 0 8px">This page opens the same live lake model with ${esc(lake.name)} selected, including its lake-specific calibration, thaw weather and satellite evidence.</p><p style="margin:0">${siblingLinks} · <a href="/national-tools/ice-out/">Find another lake</a></p></div></section>`;
  h=h.replace(/(<main[^>]*>)/i,`$1${context}`);
  const preset=`<script data-ice-location-preset>(()=>{const id=${json(lake.id)},q=${json(lake.search)};let tries=0;const select=()=>{tries++;const input=document.getElementById('search');if(!input){if(tries<20)setTimeout(select,150);return;}input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(()=>{const row=document.querySelector('.result[data-id="'+id+'"]');if(row){row.click();return;}if(tries<20)setTimeout(select,180);},80)};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',select,{once:true}):select()})();</script>`;
  h=h.replace('</body>',`${preset}</body>`);
  const out=path.join(root,'public/national-tools/ice-out',lake.slug,'index.html');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,h);
  const built=fs.readFileSync(out,'utf8');for(const needle of[canonical,`data-ice-location="${lake.slug}"`,'data-ice-location-preset',lake.id,'FAQPage'])if(!built.includes(needle))throw new Error(`Ice-out location build failed ${lake.slug}: ${needle}`);
}
const directory=`<section data-ice-location-directory style="max-width:980px;margin:24px auto;padding:0 20px"><div style="border-top:1px solid #ddd7cb;padding-top:18px"><strong>Popular lake ice-out forecasts</strong><p>${lakes.map(x=>`<a href="/national-tools/ice-out/${x.slug}/">${esc(x.name)}</a>`).join(' · ')}</p></div></section>`;
fs.writeFileSync(parentPath,source.replace('</main>',`${directory}</main>`));
const urls=['https://chrisizworski.com/national-tools/ice-out/',...lakes.map(x=>`https://chrisizworski.com/national-tools/ice-out/${x.slug}/`)];
fs.writeFileSync(path.join(root,'public/national-tools/ice-out/sitemap-locations.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc><changefreq>daily</changefreq></url>`).join('\n')}\n</urlset>\n`);
console.log(`Generated and verified ${lakes.length} lake ice-out pages.`);
