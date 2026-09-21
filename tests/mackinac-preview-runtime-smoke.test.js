const test=require("node:test");
const assert=require("node:assert/strict");
const cp=require("node:child_process");

const ROOT="https://chrisizworski-com-git-mackin-cdf0c1-izworski-gmailcoms-projects.vercel.app/mackinac-island/";

function command(name){
  try{return cp.execFileSync("bash",["-lc",`command -v ${name}`],{encoding:"utf8"}).trim();}catch{return "";}
}
function browser(){
  return command("google-chrome")||command("chromium")||command("chromium-browser");
}
function dump(url,budget=8000){
  const bin=browser();
  assert.ok(bin,"Chromium/Chrome is required for preview runtime smoke");
  return cp.execFileSync(bin,[
    "--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
    `--virtual-time-budget=${budget}`,"--dump-dom",url
  ],{encoding:"utf8",maxBuffer:20*1024*1024,timeout:30000});
}

test("Mackinac preview executes the human planner and restores a shared trip",()=>{
  const root=dump(ROOT,8000);
  assert.match(root,/mackinac-human-v2/);
  assert.match(root,/human-planner-shell/);
  assert.match(root,/Build a Mackinac trip that actually fits\./);
  assert.match(root,/1 · Trip shape/);
  assert.match(root,/I cannot leave before/);

  const shared=ROOT+"#plan=v1&date=2026-09-27&from=Mackinaw+City+area&trip=day-trip&n=1&a=2&c=0&bikes=none&pace=balanced&walk=standard&dinner=none&personas=day-trip%2Cfirst-visit&duration=day&party=couple&vision=icons%2Cscenery&loss=rushed&walktol=moderate";
  const restored=dump(shared,12000);
  assert.match(restored,/Your first move/);
  assert.match(restored,/Head to dock/);
  assert.match(restored,/What to decide next/);
  assert.doesNotMatch(restored,/Question 1 of/);
});
