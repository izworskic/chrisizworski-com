// Shared navigation for independent Straits of Mackinac decision pages.
// These are ordinary document links, not client-side tabs or a unified app.
// Apply idempotently to checked-in HTML and to post-generator build output.
import fs from "node:fs";
const ROOT=new URL("../",import.meta.url);
export const TOOLS=Object.freeze([
  {id:"ferry",href:"/mackinac-island/ferry-planner/",label:"Ferry tickets",detail:"Fares & parking",file:"public/mackinac-island/ferry-planner/index.html"},
  {id:"bridge",href:"/mackinac-bridge-live/",label:"Bridge status",detail:"Live conditions",file:"public/mackinac-bridge-live/index.html"},
  {id:"tolls",href:"/mackinac-bridge-tolls/",label:"Bridge tolls",detail:"Cost calculator",file:"public/mackinac-bridge-tolls/index.html"},
  {id:"color",href:"/fall-color/mackinac-island-fall-color/",label:"Island fall color",detail:"Peak dates",file:"public/fall-color/mackinac-island-fall-color/index.html"}
]);
const BEGIN="<!-- mackinac-tool-cluster:start -->", END="<!-- mackinac-tool-cluster:end -->";
const STYLE='<link rel="stylesheet" href="/assets/mackinac-tool-cluster.css?v=20261014">';
export function markup(active){
 if(!TOOLS.some(t=>t.id===active))throw Error("Unknown Mackinac tool "+active);
 const links=TOOLS.map(x=>'<a class="mtc-link" href="'+x.href+'"'+(active===x.id?' aria-current="page"':'')+'><span class="mtc-name">'+x.label+'</span><span class="mtc-detail">'+x.detail+'</span></a>').join("");
 return BEGIN+'<div class="mtc-wrap" data-mackinac-tool-cluster><div class="mtc-inner"><div class="mtc-meta"><span>Straits of Mackinac</span><span class="mtc-hint">Four separate tools · One easy way around</span></div><nav class="mtc-nav" aria-label="Straits of Mackinac tools">'+links+'</nav></div></div>'+END;
}
export function apply(html,active){
 if(!html.includes(STYLE)){
   if(!html.includes("</head>"))throw Error("No head close on "+active);
   html=html.replace("</head>",STYLE+"</head>");
 }
 const replacement=markup(active);
 if(html.includes(BEGIN)){
   const a=html.indexOf(BEGIN),b=html.indexOf(END,a);
   if(b<0)throw Error("Unclosed cluster "+active);
   return html.slice(0,a)+replacement+html.slice(b+END.length);
 }
 if(active==="ferry"){
   const a=html.indexOf('<div class="destination-nav-wrap">'),b=html.indexOf("<main>",a);
   if(a<0||b<0)throw Error("Ferry legacy nav anchor not found");
   return html.slice(0,a)+replacement+"\n"+html.slice(b);
 }
 if(active==="bridge"){
   const a=html.indexOf('<div class="live-ribbon"'),b=html.indexOf("</div>",a);
   if(a<0||b<0)throw Error("Official bridge status ribbon anchor not found");
   return html.slice(0,b+6)+"\n"+replacement+html.slice(b+6);
 }
 if(active==="tolls"){
   const anchor="</header>";
   const a=html.indexOf(anchor);
   if(a<0||!html.includes('<main id="main">'))throw Error("Tolls header anchor not found");
   return html.slice(0,a+anchor.length)+"\n"+replacement+html.slice(a+anchor.length);
 }
 if(active==="color"){
   const anchor='<div class="wrap">';
   const a=html.indexOf(anchor);
   if(a<0)throw Error("Fall color wrap anchor not found");
   return html.slice(0,a)+replacement+"\n"+html.slice(a);
 }
 throw Error("Unsupported Mackinac tool "+active);
}
export function run(){
 for(const tool of TOOLS){
   const url=new URL(tool.file,ROOT);
   const html=fs.readFileSync(url,"utf8");
   const next=apply(html,tool.id);
   if(html!==next)fs.writeFileSync(url,next);
 }
 console.log("Mackinac tool cluster: four independent pages connected with bidirectional navigation.");
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href)run();
