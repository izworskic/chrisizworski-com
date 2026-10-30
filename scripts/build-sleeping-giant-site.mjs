#!/usr/bin/env node
/**
 * Sleeping Giant site integration from the tested offline visitor preview.
 * Generates the indexable public page only on the release build.
 * Source truth, 70 route-engine decisions and research-only geometry stay
 * owned by the original preview/Node generator; do NOT fork them here.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const isCustom=process.argv.includes('--out');
const destination=isCustom?path.resolve(process.argv[process.argv.indexOf('--out')+1]):path.join(root,'public/sleeping-giant-provincial-park');
if(!destination||destination===root)throw Error('Missing or invalid destination');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'sleeping-giant-site-'));
const canonical='https://chrisizworski.com/sleeping-giant-provincial-park/';
const title='Sleeping Giant Provincial Park Trails | Chris Izworski';
const description='Discover the Sea Lion rock arch, towering Sleeping Giant lookouts, quiet Lake Superior beaches and six hikes, with Ontario Parks return distances and trail guidance.';
const photo='https://commons.wikimedia.org/wiki/Special:FilePath/Top_of_the_Sleeping_Giant.jpg';
const reviewedAt='2026-10-29';
try{
 execFileSync(process.execPath,[path.join(root,'scripts/export-sleeping-giant-visitor-preview.mjs'),temporary],
   {cwd:root,encoding:'utf8',timeout:40000});
 let html=fs.readFileSync(path.join(temporary,'index.html'),'utf8');
 const facts=JSON.parse(fs.readFileSync(path.join(temporary,'preview-evidence-summary.json'),'utf8'));
 if(facts.routes!==6||facts.researchGeometryRoutes!==4||facts.decisionComparisons!==70||
    facts.navigationLinksEnabled!==false||facts.publicRoutePublished!==false)
   throw Error('Invalid offline route engine evidence for release');
 const itemList=[
  ['Sea Lion Trail','sea-lion'],['Top of the Giant','top-of-the-giant'],
  ['Head of the Giant','head-of-the-giant'],['Nanabosho Lookout','nanabosho-lookout'],
  ['Middlebrun Bay Beach','middlebrun-beach'],['Pass Lake Overlook','pass-lake-overlook']
 ].map(([name,id],index)=>({'@type':'ListItem',position:index+1,name,url:canonical+'#trail-'+id}));
 const graph={'@context':'https://schema.org','@graph':[
   {'@type':'WebPage','@id':canonical+'#webpage',url:canonical,
    name:title,description,datePublished:reviewedAt,dateModified:reviewedAt,inLanguage:'en-CA',
    author:{'@id':'https://chrisizworski.com/#person'},
    publisher:{'@id':'https://chrisizworski.com/#person'},
    isPartOf:{'@id':'https://chrisizworski.com/#website'},
    about:{'@type':'Place',name:'Sleeping Giant Provincial Park',containedInPlace:{'@type':'AdministrativeArea',name:'Ontario, Canada'}},
    mainEntity:{'@id':canonical+'#trail-choices'}},
   {'@type':'ItemList','@id':canonical+'#trail-choices',name:'Sleeping Giant Provincial Park visitor trail options',numberOfItems:6,itemListElement:itemList},
   {'@type':'BreadcrumbList','@id':canonical+'#breadcrumb',itemListElement:[
     {'@type':'ListItem',position:1,name:'Home',item:'https://chrisizworski.com/'},
     {'@type':'ListItem',position:2,name:'Lake Superior Circle Tour',item:'https://chrisizworski.com/lake-superior-circle-tour/'},
     {'@type':'ListItem',position:3,name:'Sleeping Giant Provincial Park',item:canonical}
   ]},
   {'@type':'Person','@id':'https://chrisizworski.com/#person',name:'Chris Izworski',url:'https://chrisizworski.com/'}
 ]};
 function replaceOnce(from,to){
  if(html.split(from).length!==2)throw Error('Missing or repeated HTML release anchor: '+from.slice(0,75));
  html=html.replace(from,to);
 }
 replaceOnce('<meta name="robots" content="noindex,nofollow,noarchive">','<meta name="robots" content="index,follow,max-image-preview:large">');
 replaceOnce('<title>Sleeping Giant Explorer | Unpublished Visitor Preview</title>',`<title>${title}</title>`);
 replaceOnce('<meta name="description" content="Compare Ontario Parks Sleeping Giant hikes, full parking-to-destination distances and documented bike-to-hike portions. Unpublished planning preview, not navigation.">',
  `<meta name="description" content="${description}">`);
 replaceOnce('</head>',`<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${photo}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(graph)}</script>
<meta name="google-adsense-account" content="ca-pub-8222782620788075">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075" crossorigin="anonymous"></script>
</head>`);
 replaceOnce('ONTARIO / SIBLEY PENINSULA / LAKE SUPERIOR','SLEEPING GIANT PROVINCIAL PARK / ONTARIO / LAKE SUPERIOR');
 // The source template now tells the complete park story. No extra hero copy injection.
 replaceOnce('class="route-grid" id="route-grid"', 'class="route-grid" id="route-grid" itemscope itemtype="https://schema.org/ItemList"');
 for(const [,id] of [['Sea Lion Trail','sea-lion'],['Top of the Giant','top-of-the-giant'],
 ['Head of the Giant','head-of-the-giant'],['Nanabosho Lookout','nanabosho-lookout'],
 ['Middlebrun Bay Beach','middlebrun-beach'],['Pass Lake Overlook','pass-lake-overlook']]){
  replaceOnce(`<article class="route-card" data-id="${id}">`,`<article class="route-card" id="trail-${id}" data-id="${id}">`);
 }
 replaceOnce('Built by Chris Izworski</span>', 'Built by <a href="/chris-izworski/">Chris Izworski</a></span>');
 replaceOnce(' · Preview only · No live trail status',' · Planning only · No live trail status');
 // Source and author identity remain visible; only site-level preview classification changes.
 if(/noindex,nofollow|Unpublished Visitor Preview|<script[^>]+src=["']https:\/\/www\.google\.com\/maps\/dir/i.test(html))
   throw Error('Release page retained preview/no-routing violation');
 if((html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)||[]).length!==1)
   throw Error('Page must integrate exactly one standard AdSense loader');
 if((html.match(/class="route-card"/g)||[]).length!==6||!html.includes('70')&&facts.decisionComparisons!==70)
   throw Error('Static source route cards incomplete');
 fs.mkdirSync(destination,{recursive:true});
 fs.writeFileSync(path.join(destination,'index.html'),html);
 console.log('Sleeping Giant site page ready: '+path.join(destination,'index.html')+'; 6 official routes, 70 comparisons, no directions');
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
