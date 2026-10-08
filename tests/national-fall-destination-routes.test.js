const test=require("node:test"),assert=require("node:assert/strict");
const config=require("../vercel.json");
const regions=["new-england","great-smoky-mountains","colorado-aspens","adirondacks","north-shore-superior","ozarks","eastern-sierra","wasatch","columbia-river-gorge","door-county","poconos","texas-hill-country","west-virginia-highlands","catskills","shenandoah"];
test("all 15 nested destination paths resolve only to the national fall-color owner, without touching Michigan",()=>{
 const rr=config.rewrites;
 const destination=rr.filter(x=>x.source.includes(":region(")&&x.source.includes(":destination"));
 assert.equal(destination.length,2,"support canonical slash and alternate path");
 for(const route of destination){
  assert.ok(route.destination==="https://national-fall-color.vercel.app/fall-color/:region/:destination/index.html");
  assert.equal(regions.length,15);
  for(const name of regions)assert.ok(route.source.includes(name),name+" exposed in named region allowlist");
  assert.ok(!route.source.includes("tunnel-of-trees-fall-color"),"Michigan winners untouched");
  assert.ok(!route.source.includes("/:path*"),"do not intercept unknown deep paths");
 }
 assert.ok(rr.some(x=>x.source==="/fall-color/destinations-sitemap.xml"&&x.destination.includes("/destinations-sitemap.xml")));
 const first=rr.findIndex(x=>x.source.includes(":region(")&&x.source.includes(":destination"));
 const parent=rr.findIndex(x=>x.source.startsWith("/fall-color/:slug(new-england"));
 assert.ok(first>=0&&first<parent,"nested routes before parent region rewrites");
 assert.ok(rr.some(x=>x.source.startsWith("/fall-color/:slug(new-england")),"original regional pages stay routed");
});
