#!/usr/bin/env node
/** Automated task-affordance proxy, not human satisfaction. --check requires >=90/100. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const custom=process.argv.find(x=>x.startsWith('--file='));
const html=fs.readFileSync(custom?custom.slice(7):path.join(root,'public/seed-saving-lab/index.html'),'utf8');
const rules=[];
const has=(...parts)=>parts.every(part=>html.includes(part));
const add=(group,weight,name,pass)=>rules.push({group,weight,name,pass:!!pass});
let engineOK=false,refsOK=false;
try{
  const scripts=html.split('<script>').slice(1).map(x=>x.split('</script>')[0]);
  const relevant=scripts.filter(x=>x.includes('SeedLabData = data')||x.includes('SeedLabEngine=api'));
  const ctx=vm.createContext({});
  for(const src of relevant)vm.runInContext(src,ctx,{timeout:1200});
  const d=ctx.SeedLabData,e=ctx.SeedLabEngine,find=name=>d.plants.find(p=>p.name===name);
  const squash=e.compare(find('Zucchini'),find('Jack-o’-lantern pumpkin'),{seedType:'op',overlap:'yes'},d);
  const kale=e.compare(find('Broccoli'),find('European kale'),{seedType:'op',overlap:'no'},d);
  engineOK=d.plants.length>=65&&squash.potential==='compatible'&&kale.outcome==='managed'&&e.makeGarden([find('Zucchini'),find('Jack-o’-lantern pumpkin')],{},d).counts.compatible===1;
  refsOK=d.references.length>=2&&d.plants.every(x=>x.source.startsWith('https://'));
}catch(e){console.error('Seed Lab engine: '+e.message)}
add('Findability',7,'Two-plant entry',has('href="#explorer"','id="compare-form"'));
add('Findability',8,'Whole-garden entry',has('href="#whole-garden"','id="whole-garden"'));
add('Answer freshness',6,'Initial answer',has('botanicals();showGeneration();run();'));
add('Answer freshness',8,'Plant-change recalculation',has("sel.addEventListener('change',()=>{botanicals();run()})"));
add('Answer freshness',6,'Every context change recalculates',has("control.addEventListener('change',run)","el('distance').addEventListener('input'"));
add('Plant lookup',8,'Search common plant name',has('id="search-plant-a"',"p.name+' '+p.species"));
add('Plant lookup',7,'Search botanical species',has('id="search-plant-b"','toLocaleLowerCase().includes(query)'));
add('Action clarity',7,'Pair recommendation',engineOK&&has('id="result-action"','r.recommendation+'));
add('Action clarity',8,'Prioritized garden action',has('id="garden-priority"',"headline.textContent=leading?'START WITH THIS PAIR'",'leading.action'));
add('Garden workflow',5,'Matrix works',engineOK&&has('id="garden-rows"','engine.makeGarden('));
add('Garden workflow',5,'Auto-advance unadded choice',has("const next=[...gardenPick.options].find(opt=>opt.value&&!members.some(m=>m.id===opt.value))"));
add('Garden workflow',10,'Drill to detailed pair',has("drill.href='#explorer'","drill.textContent='Check this pair →'","a.dispatchEvent(new Event('change'"));
add('Mobile/accessibility',5,'Mobile and keyboard styles',has('@media(max-width:650px)',':focus-visible'));
add('Mobile/accessibility',3,'Concise spoken verdict',has('id="live-verdict"','role="status"',"el('live-verdict').textContent"));
add('Mobile/accessibility',2,'44px controls',has('.hero-actions a{min-height:44px','.field .plant-search{min-height:44px'));
add('Scientific trust',2,'Decision citations',refsOK&&has('id="source-link"'));
add('Scientific trust',3,'No fabricated crossing probability',has('does <strong>not</strong> calculate a percentage chance','A separation guideline is not a measured probability'));
const byGroup={};
for(const r of rules){byGroup[r.group]??={earned:0,max:0};byGroup[r.group].max+=r.weight;if(r.pass)byGroup[r.group].earned+=r.weight}
const score=rules.filter(x=>x.pass).reduce((a,x)=>a+x.weight,0),max=rules.reduce((a,x)=>a+x.weight,0);
console.log('Seed Saving Lab usability value: automated task proxy, NOT human usability research');
for(const [name,r] of Object.entries(byGroup))console.log(name.padEnd(23)+r.earned+'/'+r.max);
console.log('TOTAL '+score+'/'+max+' (release gate: >=90)');
for(const r of rules.filter(x=>!x.pass))console.log('  -'+r.weight+' '+r.name);
if(process.argv.includes('--check')&&(score<90||!engineOK||!rules.find(x=>x.name==='Plant-change recalculation')?.pass))process.exitCode=1;
