const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('public/michigan-winter-trails/index.html','utf8');
const script=fs.readFileSync('public/assets/winter-field-guide.js','utf8');
function el(data={}) { return {dataset:data,hidden:false,value:'all',textContent:'',attrs:{},handlers:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.handlers[k]=f}} }
function setup(){
 const records=[...html.matchAll(/<article class="wf-story" id="([^"]+)" data-tag="([^"]+)" data-region="([^"]+)" data-effort="([^"]+)"/g)];
 const stories=records.map(([,id,tag,region,effort])=>Object.assign(el({tag,region,effort}),{id}));
 const chips=['all','snowshoe','ski','bike'].map(tag=>el({tag}));
 const ids=Object.fromEntries(['wf-region','wf-effort','wf-count','wf-empty','wf-map','wf-map-message','wf-reset','wf-show-all'].map(id=>[id,el()]));
 const document={readyState:'complete',querySelectorAll(q){return q==='.wf-story'?stories:q==='.wf-chip'?chips:[]},getElementById(id){return ids[id]}};
 vm.runInNewContext(script,{document,window:{},console,AbortController,setTimeout,clearTimeout});
 return {stories,chips,ids};
}
test('all seven trail stories retain source and specialist links in static HTML',()=>{
 const articles=html.match(/<article class="wf-story"[\s\S]*?<\/article>/g)||[];
 assert.equal(articles.length,7);
 for(const article of articles){assert.match(article,/class="wf-tool" href="\//);assert.match(article,/href="https:\/\/www\.(nps\.gov|michigan\.gov|fs\.usda\.gov)\//)}
 assert.match(html,/content="noindex,nofollow"/);
});
test('activity and region filters combine and reset; map failure leaves the list usable',()=>{
 const {stories,chips,ids}=setup();
 assert.match(ids['wf-map-message'].textContent,/unavailable/i);
 chips.find(x=>x.dataset.tag==='ski').handlers.click();
 assert.deepEqual(stories.filter(x=>!x.hidden).map(x=>x.id),['stop-3','stop-4','stop-7']);
 ids['wf-region'].value='up';ids['wf-region'].handlers.change();
 assert.deepEqual(stories.filter(x=>!x.hidden).map(x=>x.id),['stop-3','stop-7']);
 ids['wf-region'].value='south';ids['wf-region'].handlers.change();
 assert.equal(stories.filter(x=>!x.hidden).length,0);assert.equal(ids['wf-empty'].hidden,false);
 ids['wf-show-all'].handlers.click();assert.equal(stories.filter(x=>!x.hidden).length,7);assert.equal(ids['wf-empty'].hidden,true);
});
