const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
test("only the standalone ferry subpage remains",()=>{
 const folder=path.join(root,"public/mackinac-island");
 const subpages=fs.readdirSync(folder,{withFileTypes:true}).filter(x=>x.isDirectory()&&fs.existsSync(path.join(folder,x.name,"index.html"))).map(x=>x.name);
 assert.deepEqual(subpages,["ferry-planner"]);
});
test("ferry page does not mount obsolete trip personalization",()=>{
 const html=fs.readFileSync(path.join(root,"public/mackinac-island/ferry-planner/index.html"),"utf8");
 assert.match(html,/id="ferry-form"/);assert.match(html,/href="#ferry-compare"/);assert.match(html,/mackinac-ferry-decision\.js/);
 assert.doesNotMatch(html,/mackinac-hub\.js|data-trip-strip|data-mackinac-platform-focus/);
});
