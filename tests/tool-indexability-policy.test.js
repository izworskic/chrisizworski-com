import test from 'node:test';
import assert from 'node:assert/strict';
import {checkToolIndexability} from '../lib/tool-indexability-policy.mjs';

const pilot={searchTreatment:{status:'noindex-pilot'}};
const owner={searchTreatment:{status:'indexed-canonical'}};

test('deliberately noindex Working River pilots retain noindex,follow without blocking the authority build',()=>{
  const result=checkToolIndexability({tool:pilot,robotsMeta:'noindex,follow'});
  assert.equal(result.ok,true);
  assert.equal(checkToolIndexability({tool:pilot,robotsMeta:'noindex, follow'}).ok,true);
  assert.equal(checkToolIndexability({tool:pilot,robotsMeta:'NOINDEX, FOLLOW'}).ok,true);
});
test('noindex pilot declarations cannot inadvertently publish an indexable or nofollow page',()=>{
  for(const robotsMeta of ['index,follow','','noindex,nofollow','nofollow','index,nofollow']){
    assert.equal(checkToolIndexability({tool:pilot,robotsMeta}).ok,false,robotsMeta);
  }
  assert.equal(checkToolIndexability({tool:pilot,robotsMeta:'noindex,follow',robotsHeader:'noindex,nofollow'}).ok,false);
});
test('indexed canonical owners still fail all blocked-robots states',()=>{
  assert.equal(checkToolIndexability({tool:owner,robotsMeta:'index,follow'}).ok,true);
  assert.equal(checkToolIndexability({tool:owner,robotsMeta:''}).ok,true);
  for(const robotsMeta of ['noindex,follow','noindex,nofollow','nofollow']){
    assert.equal(checkToolIndexability({tool:owner,robotsMeta}).ok,false);
  }
  assert.equal(checkToolIndexability({tool:owner,robotsMeta:'index,follow',robotsHeader:'noindex'}).ok,false);
  assert.equal(checkToolIndexability({tool:owner,robotsMeta:'index,follow',robotsHeader:'nofollow'}).ok,false);
});
test('unspecified indexability status never exempts a noindex page',()=>{
  assert.equal(checkToolIndexability({tool:{},robotsMeta:'noindex,follow'}).ok,false);
  assert.equal(checkToolIndexability({tool:null,robotsMeta:'noindex,follow'}).ok,false);
});
