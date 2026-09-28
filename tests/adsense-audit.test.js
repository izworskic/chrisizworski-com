const test=require('node:test'), assert=require('node:assert/strict');
const {classify}=require('../lib/adsense-audit');
const wrap=tag=>'<html><head>'+tag+'</head><body>Tool</body></html>';
const url='https://chrisizworski.com/new-tool/';
const tag='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075"></script>';
test('coverage audit distinguishes installation, failures, and unverified browser state',()=>{
 assert.equal(classify(wrap(tag),url).state,'standard-code');
 assert.equal(classify(wrap(tag+tag),url).state,'duplicate-loader');
 assert.equal(classify(wrap(tag.replace('?client=ca-pub-8222782620788075','')),url).state,'legacy-or-wrong-publisher');
 assert.equal(classify(wrap(''),url).state,'missing-code');
 assert.equal(classify(wrap('<script>"adsbygoogle.js"</script>'),url).state,'client-rendered-needs-browser');
 assert.equal(classify(wrap(tag),url,500).state,'http-error');
 assert.equal(classify(wrap('<meta name="robots" content="noindex">'),url).state,'excluded-document');
});
