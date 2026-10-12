'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { stateReady, stateCommand, _codec } = require('../lib/tool-state');
const env = { TOOL_STATE_URL: 'https://state.example', VERCEL_OIDC_TOKEN: 'test-deployment-identity' };

test('state keeps cache semantics, compresses large payloads and never sends provider credentials', async () => {
 const values = new Map(), calls=[];
 const fetchImpl = async (url, options) => {
  calls.push({url,options}); const [op,key,value] = JSON.parse(options.body);
  if(op==='SET'){values.set(key,value);return {ok:true,status:200,json:async()=>({result:'OK'})};}
  return {ok:true,status:200,json:async()=>({result:op==='MGET'?key.map(k=>values.get(k)||null):values.get(key)||null})};
 };
 const raw = JSON.stringify({items:Array.from({length:500},(_,i)=>({id:i,detail:'Official current cached observation'}))});
 assert.equal(await stateCommand(['SET','cache',raw,'EX',60],{env,fetchImpl}),'OK');
 assert.ok(Buffer.byteLength(values.get('cache')) < Buffer.byteLength(raw)/4);
 assert.equal(await stateCommand(['GET','cache'],{env,fetchImpl}),raw);
 assert.equal(calls[0].options.headers.authorization,'Bearer test-deployment-identity');
 assert.equal(calls[0].url,env.TOOL_STATE_URL);
 assert.equal(stateReady({UPSTASH_REDIS_REST_URL:'https://obsolete',UPSTASH_REDIS_REST_TOKEN:'obsolete'}),false);
 for(const value of ['plain',null,'tool-state:gzip:v1:literal'])assert.equal(_codec.decode(_codec.encode(value)),value);
});
test('state transport rejects missing identity and HTTP/command errors', async () => {
 await assert.rejects(stateCommand(['GET','x'],{env:{TOOL_STATE_URL:'https://state.example'}}),/identity/);
 await assert.rejects(stateCommand(['GET','x'],{env,fetchImpl:async()=>({ok:false,status:403,json:async()=>({error:'private-provider-detail'})})}),/Private tool state failed \(403\)/);
});
test('MGET preserves missing positions and decodes large values', async()=>{
 const value='example '.repeat(1000);
 const result=await stateCommand(['MGET','missing','saved'],{env,fetchImpl:async()=>({ok:true,status:200,json:async()=>({result:[null,_codec.encode(value)]})})});
 assert.deepEqual(result,[null,value]);
});

test('backend requires a valid signed project identity and separates preview from production', async () => {
 const {authorize,clearCache}=await import('../supabase/functions/tool-state/auth.js');
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk=publicKey.export({format:'jwk'});jwk.kid='test-key';
 const now=Date.parse('2026-10-12T15:00:00Z');
 const base={iss:'https://oidc.vercel.com/izworski-gmailcoms-projects',aud:'https://vercel.com/izworski-gmailcoms-projects',owner:'izworski-gmailcoms-projects',owner_id:'team_SibGYOKdlEddaSrq3xHqX8z0',project_id:'prj_F0YwIFaBlvx5G32DXyzIKhrYas5s',project:'chrisizworski-com',environment:'production',iat:now/1000-10,nbf:now/1000-10,exp:now/1000+60};
 const make=(overrides={},key=privateKey)=>{
  const claims={...base,...overrides};claims.sub=`owner:${claims.owner}:project:${claims.project}:environment:${claims.environment}`;
  const head=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-key'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');
  return head+'.'+payload+'.'+crypto.sign('RSA-SHA256',Buffer.from(head+'.'+payload),key).toString('base64url');
 };
 let reads=0;const fetchImpl=async url=>{reads++;return {ok:true,json:async()=>String(url).includes('openid-configuration')?{jwks_uri:'https://oidc.vercel.com/test-jwks'}:{keys:[jwk]}};};
 clearCache();
 assert.equal(await authorize(make(),{fetchImpl,now}),'chrisizworski:production');
 assert.equal(await authorize(make({environment:'preview'}),{fetchImpl,now}),'chrisizworski:preview');
 assert.equal(reads,2,'verified keys should be cached');
 for(const override of [{project_id:'another-project'},{owner_id:'another-team'},{aud:'other-service'},{environment:'development'},{exp:now/1000-1},{nbf:now/1000+500},{iss:'https://attacker.example'}])assert.equal(await authorize(make(override),{fetchImpl,now}),null);
 const other=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 assert.equal(await authorize(make({},other.privateKey),{fetchImpl,now}),null);
 assert.equal(await authorize('invalid',{fetchImpl,now}),null);
});


test('asynchronous Vercel identities are awaited before authentication', async () => {
 let observed;
 await stateCommand(['PING'],{env,getTokenImpl:async()=> 'fresh-request-token',fetchImpl:async(url,options)=>{
  observed=options.headers.authorization;return {ok:true,status:200,json:async()=>({result:'PONG'})};
 }});
 assert.equal(observed,'Bearer fresh-request-token');
});
