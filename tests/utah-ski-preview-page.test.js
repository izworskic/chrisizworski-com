'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'public/utah-ski-access/index.html'),'utf8');
const browser=fs.readFileSync(path.join(root,'public/assets/utah-ski-model.js'),'utf8');
const app=fs.readFileSync(path.join(root,'public/assets/utah-ski-access.js'),'utf8');
const D=require('../lib/utah-ski/decision.js');
test('Utah trip planner stays noindex during source validation',()=>{
 assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(page,/Built by Chris Izworski/);
 assert.match(page,/protected verification preview/);
 assert.match(page,/cannot verify parking inventory/i);
});
test('browser and Node use exact same policy and decision outputs',()=>{
 const window={};vm.runInNewContext(browser,{window,Intl,Date});
 assert.equal(typeof window.UtahSki.compare,'function');
 const input={date:'2027-01-09',hour:9,pass:'IKON_BASE',passengers:2,
 snowbirdUsed:1,brightonUsed:1,parkingReservations:{alta:false,snowbird:false,brighton:false,solitude:false},roads:{}};
 const date=new Date('2027-01-09T16:00:00Z');
 assert.equal(JSON.stringify(window.UtahSki.compare(input,date)),JSON.stringify(D.compare(input,date)));
 assert.ok(window.UtahSki.compare(input,date).every(x=>x.safetyOrInventoryGuaranteed===false));
});
test('UDOT preview never asserts road-open or a guaranteed parking space',()=>{
 assert.match(app,/not confirmed open/i);
 assert.doesNotMatch(app,/safe to drive|parking available|road is open/i);
 assert.match(app,/api\/utah-ski-validation/);
 assert.match(page,/No road-open, safe-to-drive or guaranteed-parking verdict is issued here/);
});
