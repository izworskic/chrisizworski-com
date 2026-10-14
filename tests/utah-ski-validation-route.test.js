'use strict';const test=require('node:test');const assert=require('node:assert/strict');
const handler=require('../api/utah-ski-validation');
function mock(method='GET'){const headers={};return {req:{method},res:{setHeader:(a,b)=>{headers[a]=b},status(code){this.code=code;return this},json(body){this.body=body;return {code:this.code,body,headers}}}}}
test('UDOT authenticated diagnostic remains unavailable on production',async()=>{
 const old=process.env.VERCEL_ENV;process.env.VERCEL_ENV='production';
 try{const {req,res}=mock();const got=await handler(req,res);assert.equal(got.code,404);assert.deepEqual(got.body,{error:'NOT_FOUND'});}
 finally{if(old===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=old}
});
