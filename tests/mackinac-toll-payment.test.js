const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const js=fs.readFileSync('public/assets/mackinac-toll-calculator.js','utf8');
const start=js.indexOf('function clampInteger('),end=js.indexOf('function render()',start);
const {calculateToll,paymentComparison}=new Function(js.slice(start,end)+';return {calculateToll,paymentComparison};')();
test('card comparison and conditional MacPass use existing published fare',()=>{
 for(const [cls,lead,towed,auto,base,card,eligible] of [
 ['passenger',2,0,false,4,409,true],['passenger',2,2,false,8,818,false],
 ['other',2,0,false,10,1023,false],['other',2,2,true,14,1432,false],
 ['other',2,2,false,20,2046,false],['passenger',3,0,false,6,614,false]]){
 const t=calculateToll(cls,lead,towed,auto),p=paymentComparison(t.total,cls,lead,towed);
 assert.equal(t.total,base);assert.equal(p.cardOneCents,card);assert.equal(p.cardReturnCents,card*2);assert.equal(p.macPassCandidate,eligible);
 assert.equal(p.qualifyingMacPassReturnCents,base*100);
 }
 assert.equal(paymentComparison(NaN,'passenger',2,0),null);
 assert.equal(paymentComparison(0,'passenger',2,0),null);
});
test('payment estimates remain monotone and round each crossing separately',()=>{
 for(const cls of ['passenger','other'])for(let lead=2;lead<=12;lead++)for(let tow=0;tow<=12;tow++)for(const auto of [false,true]){
 const t=calculateToll(cls,lead,tow,auto),p=paymentComparison(t.total,cls,lead,tow);
 assert.equal(p.cardOneCents,t.total*100+Math.floor((t.total*23+5)/10));
 assert.equal(p.cardReturnCents,p.cardOneCents*2);
 assert.equal(p.macPassCandidate,cls==='passenger'&&lead===2&&tow===0);
 }
});
