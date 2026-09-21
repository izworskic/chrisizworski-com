const test=require("node:test");
const assert=require("node:assert/strict");
const cp=require("node:child_process");
const fs=require("node:fs");

const ROOT="https://chrisizworski-com-git-mackin-cdf0c1-izworski-gmailcoms-projects.vercel.app/mackinac-island/";

function command(name){
  try{return cp.execFileSync("bash",["-lc",`command -v ${name}`],{encoding:"utf8"}).trim();}catch{return "";}
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function debugTarget(port,url){
  const endpoint=`http://127.0.0.1:${port}/json/new?${new URLSearchParams({url}).toString()}`;
  const response=await fetch(endpoint,{method:"PUT"});
  assert.ok(response.ok,`Chrome debug target failed: ${response.status}`);
  return response.json();
}

async function connect(wsUrl){
  const ws=new WebSocket(wsUrl);
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("CDP websocket open timeout")),5000);
    ws.addEventListener("open",()=>{clearTimeout(timer);resolve();},{once:true});
    ws.addEventListener("error",e=>{clearTimeout(timer);reject(e);},{once:true});
  });
  let id=0;
  const pending=new Map();
  ws.addEventListener("message",event=>{
    const msg=JSON.parse(String(event.data));
    if(!msg.id)return;
    const p=pending.get(msg.id);
    if(!p)return;
    pending.delete(msg.id);
    msg.error?p.reject(new Error(msg.error.message||"CDP error")):p.resolve(msg.result);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const callId=++id;
    pending.set(callId,{resolve,reject});
    ws.send(JSON.stringify({id:callId,method,params}));
  });
  return {ws,send};
}

async function waitFor(send,expression,timeoutMs=20000){
  const deadline=Date.now()+timeoutMs;
  let last="";
  while(Date.now()<deadline){
    const result=await send("Runtime.evaluate",{expression,returnByValue:true});
    last=result?.result?.value;
    if(last===true)return true;
    await sleep(350);
  }
  throw new Error("Preview condition timed out: "+expression+"; last="+String(last));
}

test("Mackinac preview executes the human planner and restores a shared trip",async()=>{
  const bin=command("google-chrome")||command("chromium")||command("chromium-browser");
  assert.ok(bin,"Chromium/Chrome is required for preview runtime smoke");
  const port=9333;
  const userDir="/tmp/mackinac-cdp-"+process.pid;
  fs.rmSync(userDir,{recursive:true,force:true});
  const chrome=cp.spawn(bin,[
    "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
    `--remote-debugging-port=${port}`,`--user-data-dir=${userDir}`,"about:blank"
  ],{stdio:"ignore"});
  try{
    let ready=false;
    for(let i=0;i<30;i++){
      try{
        const r=await fetch(`http://127.0.0.1:${port}/json/version`);
        if(r.ok){ready=true;break;}
      }catch{}
      await sleep(200);
    }
    assert.ok(ready,"Chrome DevTools endpoint did not start");

    const target=await debugTarget(port,ROOT);
    const {ws,send}=await connect(target.webSocketDebuggerUrl);
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate",{url:ROOT});
    await waitFor(send,`document.body?.classList.contains("mackinac-human-v2") && !!document.querySelector(".human-planner-shell") && document.body.innerText.includes("Build a Mackinac trip that actually fits.") && document.body.innerText.includes("1 · Trip shape") && document.body.innerText.includes("I cannot leave before")`);

    const shared=ROOT+"#plan=v1&date=2026-09-27&from=Mackinaw+City+area&trip=day-trip&n=1&a=2&c=0&bikes=none&pace=balanced&walk=standard&dinner=none&personas=day-trip%2Cfirst-visit&duration=day&party=couple&vision=icons%2Cscenery&loss=rushed&walktol=moderate";
    await send("Page.navigate",{url:shared});
    await waitFor(send,`document.body.innerText.includes("Your first move") && document.body.innerText.includes("Head to dock") && document.body.innerText.includes("What to decide next") && !document.body.innerText.includes("Question 1 of")`,25000);
    ws.close();
  }finally{
    chrome.kill("SIGKILL");
    fs.rmSync(userDir,{recursive:true,force:true});
  }
});
