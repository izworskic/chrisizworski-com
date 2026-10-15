import fs from 'node:fs';
// Register one distinct canonical decision before directory reconciliation; leave existing cards untouched.
const file='public/tools/index.html';
let html=fs.readFileSync(file,'utf8');
const anchor='<div class="tool-card" data-tool-id="michigan-snow-totals"';
if(!html.includes('data-tool-id="michigan-ski-hills"')){
 const idx=html.indexOf(anchor);
 if(idx<0)throw Error('Michigan Snow Totals card anchor missing');
 const card='<div class="tool-card" data-tool-id="michigan-ski-hills" data-tags="ski downhill snow lake effect resorts winter drive lift tickets" data-months="11,12,1,2,3,4">\n'+
 '    <div class="tk">Live winter decision<span class="tk-season" hidden> / in season now</span></div>\n'+
 '    <div class="tool-title"><a href="/michigan-ski-hills/">Michigan Ski Hills: Worth the Drive This Weekend?</a></div>\n'+
 '    <div class="tool-desc">Compare 18 Michigan destinations using NWS weekend snow forecasts, lake-effect warning zones, nearby reported snow, published ticket evidence and estimated Detroit or Grand Rapids drive times. See the source limits before you go.</div>\n'+
 '    <div class="tool-actions"><a href="/michigan-ski-hills/">Compare Michigan hills →</a></div>\n'+
 '  </div>\n  ';
 html=html.slice(0,idx)+card+html.slice(idx);
}
if(!process.argv.includes('--check'))fs.writeFileSync(file,html);
else if(!html.includes('data-tool-id="michigan-ski-hills"'))throw Error('Ski discovery missing');
console.log('Michigan Ski Hills tools directory card present');
