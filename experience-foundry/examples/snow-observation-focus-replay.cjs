'use strict';
// Bounded Foundry replay of the exact source-panel helper, not a mock web session.
const fs=require('node:fs'),path=require('node:path');
const i=process.argv.indexOf('--source-root');
if(i<0||!process.argv[i+1])throw Error('Expected --source-root');
const root=process.argv[i+1];
const js=fs.readFileSync(path.join(root,'public/assets/michigan-snow-totals.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/michigan-snow-totals/index.html'),'utf8');
const cases=[];const add=(id,passed,observed)=>cases.push({id,passed:Boolean(passed),observed:String(observed).slice(0,600)});
const segment=name=>{
  const a=js.indexOf('  function '+name+'(');
  if(a<0)return null;
  const b=js.indexOf('\n  function ',a+5);
  return js.slice(a,b<0?undefined:b);
};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sourceFn=segment('originalReportUrl');
if(!sourceFn)throw Error('Missing original allowlist function');
const originalReportUrl=new Function(sourceFn+'\nreturn originalReportUrl;')();
const nws='https://mesonet.agron.iastate.edu/p.php?pid=202611170021-KMQT-NWUS53-LSRMQT';
add('preserve-report-allowlist',originalReportUrl(nws)===nws&&originalReportUrl('https://attacker.example/file')===''&&originalReportUrl('javascript:alert(1)')==='','Original HTTPS NWS link accepted, unsupported/unsafe hosts rejected.');
add('preserve-original-archive',html.includes('https://mesonet.agron.iastate.edu/lsr/')&&html.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-snow-totals/">'),'Original archive link and canonical retained in HTML.');
const a={place:'1 E Hurley',county:'Gogebic',reportedAt:'2026-11-17T12:00:00Z',inches:13.5,lat:46.2,lon:-89.1,measured:true,sourceLabel:'NWS observer',productUrl:nws};
const b={place:'Ironwood',county:'Gogebic',reportedAt:'2026-11-17T11:00:00Z',inches:9.2,lat:46.4,lon:-90.1,measured:true,sourceLabel:'Co-op observer',productUrl:'https://forecast.weather.gov/product.php?site=MQT'};
const mapText=segment('reportMapHref'), keyText=segment('reportKey'), renderText=segment('renderSelectedReport');
if(!mapText||!keyText||!renderText){
  add('exact-ranked-report-reversal',false,'Baseline lacks the selected report dossier/helper.');
  add('approximate-not-directions',false,'Baseline has no dedicated coordinate search handoff.');
  add('source-fallback-without-place',false,'Baseline has no selected report source-fallback panel.');
} else {
  const reportMapHref=new Function(mapText+'\nreturn reportMapHref;')();
  const reportKey=new Function(keyText+'\nreturn reportKey;')();
  const panel={innerHTML:'',hidden:true,textContent:''};
  const buttons=[0,1].map(index=>({getAttribute:k=>k==='data-pulse-rank'?String(index):'',setAttribute(k,v){this[k]=v}}));
  const state={selectedReportKey:''};
  const document={querySelectorAll:q=>q==='#stormPulseList button[data-pulse-rank]'?buttons:[]};
  const C={nearest:()=>[],inches:n=>String(n)+' in.'};
  const render=new Function('$','C','state','document','esc','reportKey','where','stamp','kind','originalReportUrl','reportMapHref','nearLines',
    renderText+'\nreturn renderSelectedReport;')(
      id=>id==='selectedSnowReport'?panel:null,C,state,document,esc,reportKey,
      r=>r.place+', '+r.county,r=>r.reportedAt+' ET',r=>r.sourceLabel,originalReportUrl,reportMapHref,()=>''
    );
  state.selectedReportKey=reportKey(a);render([a,b]);const first=panel.innerHTML,pressedA=buttons[0]['aria-pressed'];
  state.selectedReportKey=reportKey(b);render([a,b]);const second=panel.innerHTML,pressedB=buttons[1]['aria-pressed'];
  state.selectedReportKey=reportKey(a);render([a,b]);const restored=panel.innerHTML;
  add('exact-ranked-report-reversal',first.includes('1 E Hurley')&&first.includes(nws)&&pressedA==='true'&&second.includes('Ironwood')&&pressedB==='true'&&second.includes('forecast.weather.gov')&&restored===first&&!panel.hidden,
    'Selected A, B and A using the candidate source-panel function; title and source reversed with the chosen row.');
  const map=reportMapHref(a),noMap=reportMapHref({...a,lat:0});
  const u=map?new URL(map):null;
  add('approximate-not-directions',u?.hostname==='www.google.com'&&u.pathname==='/maps/search/'&&u.searchParams.get('api')==='1'&&u.searchParams.get('query')==='46.2000,-89.1000'&&noMap===''&&!map.includes('/dir'),
    'Geo reference '+map+'; invalid coordinates='+JSON.stringify(noMap));
  state.selectedReportKey=reportKey({...a,productUrl:''}); const noOriginal={...a,productUrl:''}; render([noOriginal,b]);
  add('source-fallback-without-place',panel.innerHTML.includes('Original NWS text not linked')&&!panel.innerHTML.includes('Read original NWS report')&&panel.innerHTML.includes('Report detail:'),
    'Unknown original product URL shows explicit unavailable state rather than fabricated source.');
}
console.log(JSON.stringify({cases}));
