const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const crypto=require("node:crypto");
const {inspect}=require("../scripts/audit-au-sable-source-recovery.cjs");

test("Au Sable auxiliary server source cannot be promoted without original hashes",()=>{
  const r=inspect();
  assert.equal(r.gate,"ausable-owner-source/v1");
  assert.equal(r.indexPresent,true);
  const paths=r.auxiliary.map(f=>f.path);
  assert.ok(paths.includes("api/share.js"));
  assert.ok(paths.includes("api/snapshot.js"));
  assert.equal(r.ready,r.auxiliary.every(f=>f.status==="original-sha-verified"));
  if(!r.ready){
    assert.equal(r.status,"blocked-on-source-recovery");
    assert.ok(r.limitations.some(x=>/route API/.test(x)));
  }
});

test("injected replacement source is not accepted as a recovered original",()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ausable-source-"));
  try{
    fs.mkdirSync(path.join(temp,"api"),{recursive:true});
    fs.writeFileSync(path.join(temp,"index.html"),"https://ausable.chrisizworski.com/ /api/snapshot /trip?");
    const raw=Buffer.from("console.log('fake source')\n");
    const originalSha=crypto.createHash("sha1").update("console.log('original')\n").digest("hex");
    fs.writeFileSync(path.join(temp,"api/share.js"),raw);
    const manifest={originalFiles:[
      {path:"api/share.js",sha:originalSha},
      {path:"api/snapshot.js",sha:originalSha}
    ]};
    fs.writeFileSync(path.join(temp,"provenance.json"),JSON.stringify(manifest));
    const audit=inspect(temp);
    assert.equal(audit.ready,false);
    assert.equal(audit.auxiliary[0].status,"sha-mismatch");
    assert.equal(audit.auxiliary[1].status,"missing");
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
