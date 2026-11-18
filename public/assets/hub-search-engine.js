/* Hub search engine: ranking for the tool directories.
 * This file is the JavaScript oracle for rust/hub-search/src/lib.rs. Both follow
 * the same written contract and must return identical integer scores. In the
 * browser the compiled Rust/WASM core runs when available; every Rust answer is
 * compared with this oracle and the page falls back to JavaScript on any drift.
 * Works without WebAssembly. No query text is sent anywhere.
 */
(function(root){
  'use strict';
  const MAX_TOKEN=40;
  const MAX_DOCS=1024;
  const WEIGHTS=[10,7,6,4,2,3]; // title, tags, place, kind, description, months
  const MONTHS_FIELD=5;
  const STOPWORDS=new Set(['a','an','and','are','at','be','best','by','can','do','does','for','from','good',
    'how','i','in','is','it','me','my','near','of','on','or','should','the','this',
    'to','what','when','where','which','will','with','you','your','find','get','go','about']);
  const FOLD_FROM=[...'àáâãäåāÀÁÂÃÄÅĀçÇèéêëēÈÉÊËĒìíîïīÌÍÎÏĪñÑòóôõöøōÒÓÔÕÖØŌùúûüūÙÚÛÜŪýÿÝ'];
  const FOLD_TO=[...'aaaaaaaaaaaaaacceeeeeeeeeeiiiiiiiiiinnoooooooooooooouuuuuuuuuuyyy'];
  const FOLD=new Map(FOLD_FROM.map((c,i)=>[c,FOLD_TO[i]]));
  const DROP=new Set(["'",'’','‘','ʻ','ʼ']);

  function normalize(raw){
    let out='';
    for(const original of String(raw||'')){
      if(DROP.has(original))continue;
      const c=FOLD.get(original)||original;
      if(c>='A'&&c<='Z')out+=c.toLowerCase();
      else if((c>='a'&&c<='z')||(c>='0'&&c<='9'))out+=c;
      else out+=' ';
    }
    return out;
  }
  function stem(t){
    const n=t.length;let s;
    if(n>=5&&t.endsWith('ies'))s=t.slice(0,n-3)+'y';
    else if(n>=6&&t.endsWith('ing'))s=t.slice(0,n-3);
    else if(n>=5&&(t.endsWith('ches')||t.endsWith('shes')||t.endsWith('sses')||t.endsWith('xes')||t.endsWith('zes')))s=t.slice(0,n-2);
    else if(n>=4&&t.endsWith('s')&&!t.endsWith('ss')&&!t.endsWith('us')&&!t.endsWith('is'))s=t.slice(0,n-1);
    else s=t;
    return s.length>MAX_TOKEN?s.slice(0,MAX_TOKEN):s;
  }
  const words=raw=>normalize(raw).split(' ').filter(Boolean);
  const termsOf=raw=>words(raw).map(stem);
  const queryTerms=raw=>words(raw).filter(w=>!STOPWORDS.has(w)).map(stem);

  function osa(a,b,max){
    const n=a.length,m=b.length;
    if(Math.abs(n-m)>max)return max+1;
    const w=m+1,d=new Array((n+1)*w).fill(0);
    for(let i=0;i<=n;i++)d[i*w]=i;
    for(let j=0;j<=m;j++)d[j]=j;
    for(let i=1;i<=n;i++){
      let rowMin=Infinity;
      for(let j=1;j<=m;j++){
        const cost=a[i-1]===b[j-1]?0:1;
        let v=Math.min(d[(i-1)*w+j]+1,d[i*w+j-1]+1,d[(i-1)*w+j-1]+cost);
        if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,d[(i-2)*w+j-2]+1);
        d[i*w+j]=v;if(v<rowMin)rowMin=v;
      }
      if(rowMin>max)return max+1;
    }
    return d[n*w+m];
  }
  function quality(alt,token,original,fuzzy){
    if(token===alt)return original?100:90;
    if(!original)return 0;
    const la=alt.length,ld=token.length;
    if(la>=3&&token.startsWith(alt))return 70;
    if(la>=4&&token.includes(alt))return 40;
    if(fuzzy&&la>=4&&ld>=4){
      const max=la>=8?2:1;
      const dist=osa(alt,token,max);
      if(dist<=max)return dist===1?50:35;
    }
    return 0;
  }
  function containsRun(tokens,run){
    if(!run.length||run.length>tokens.length)return false;
    for(let i=0;i+run.length<=tokens.length;i++){
      let ok=true;for(let j=0;j<run.length;j++)if(tokens[i+j]!==run[j]){ok=false;break;}
      if(ok)return true;
    }
    return false;
  }
  function parse(text){
    let query='';const lexicon=[];const docs=[];
    for(const line of String(text).split('\n')){
      const fields=line.split('\t');
      const kind=fields[0];
      if(kind==='Q')query=fields[1]||'';
      else if(kind==='L'){
        const key=termsOf(fields[1]||'');
        if(key.length!==1)continue;
        const alts=[];
        for(const alt of fields.slice(2)){
          const a=termsOf(alt);
          if(a.length===1&&a[0]!==key[0]&&!alts.includes(a[0]))alts.push(a[0]);
        }
        lexicon.push([key[0],alts]);
      }else if(kind==='D'){
        if(docs.length>=MAX_DOCS)return null;
        const doc=[];
        for(let i=0;i<6;i++){
          const value=fields[i+1]||'';
          doc.push(i===MONTHS_FIELD?words(value).map(w=>'m'+w):termsOf(value));
        }
        docs.push(doc);
      }
    }
    return {query,lexicon,docs};
  }
  // Best field plus a quarter of the other fields that also match, so a word in
  // the title or description outranks the same word only in appended tags.
  function termScore(doc,alts,fuzzy){
    let best=0,total=0;
    doc.forEach((tokens,field)=>{
      let q=0;
      alts.forEach((alt,ai)=>{for(const token of tokens)q=Math.max(q,quality(alt,token,ai===0,fuzzy));});
      const f=q*WEIGHTS[field];total+=f;if(f>best)best=f;
    });
    return best+Math.trunc((total-best)/4);
  }
  function rankText(text){
    const parsed=parse(text);
    if(!parsed)return null;
    const {query,lexicon,docs}=parsed;
    const terms=queryTerms(query);
    const expansions=terms.map(t=>{
      const alts=[t];
      for(const [key,list] of lexicon)if(key===t)for(const a of list)if(!alts.includes(a))alts.push(a);
      return alts;
    });
    // Typo matching is a fallback: it only runs for a term no document matches
    // exactly, by prefix, by synonym or inside a compound word.
    const perTerm=expansions.map(alts=>{
      let scores=docs.map(doc=>termScore(doc,alts,false));
      if(scores.every(s=>s===0))scores=docs.map(doc=>termScore(doc,alts,true));
      return scores;
    });
    const ranked=docs.map((doc,d)=>{
      let score=0,matched=0;
      for(const scores of perTerm){if(scores[d]>0)matched++;score+=scores[d];}
      if(terms.length>=2){
        if(containsRun(doc[0],terms))score+=400;
        else if(containsRun(doc[1],terms)||containsRun(doc[4],terms))score+=150;
      }
      return [score,matched];
    });
    return {terms:terms.length,docs:ranked};
  }

  /* What the visitor sees: every document matching all words, best first; if
   * none does, the closest documents matching at least half of the words. */
  function select(result){
    if(!result||!result.terms)return {mode:'all',order:[]};
    const rows=result.docs.map((d,i)=>({i,score:d[0],matched:d[1]}));
    const byScore=(a,b)=>b.score-a.score||a.i-b.i;
    const full=rows.filter(r=>r.matched===result.terms&&r.score>0).sort(byScore);
    if(full.length)return {mode:'full',order:full.map(r=>r.i)};
    const need=Math.ceil(result.terms/2);
    const near=rows.filter(r=>result.terms>1&&r.matched>=need&&r.score>0).sort((a,b)=>b.matched-a.matched||byScore(a,b));
    return {mode:near.length?'partial':'none',order:near.map(r=>r.i)};
  }

  const clean=v=>String(v==null?'':v).replace(/[\t\n\r]+/g,' ');
  function buildInput(query,lexiconText,docs){
    const lines=['Q\t'+clean(query)];
    if(lexiconText)lines.push(String(lexiconText).replace(/\n+$/,''));
    for(const d of docs)lines.push(['D',d.title,d.tags,d.place,d.kind,d.description,d.months].map((v,i)=>i?clean(v):v).join('\t'));
    return lines.join('\n');
  }

  /* Spelling help for the UI only (not part of the ranked contract). For each
   * query word that matched nothing better than a typo, return the closest
   * real word from the documents. */
  function suggest(query,docs){
    const raw=words(query).filter(w=>!STOPWORDS.has(w));
    const vocab=new Map();
    for(const d of docs)for(const v of [d.title,d.tags,d.place,d.kind,d.description])for(const w of words(v))if(w.length>=4&&!vocab.has(w))vocab.set(w,stem(w));
    let changed=false;
    const out=raw.map(w=>{
      const t=stem(w);
      if(t.length<4)return w;
      let exactish=false,best=null,bestDist=99;
      for(const [word,s] of vocab){
        if(s===t||s.startsWith(t)||(t.length>=4&&s.includes(t))){exactish=true;break;}
        const max=t.length>=8?2:1;const dist=osa(t,s,max);
        if(dist<=max&&dist<bestDist){best=word;bestDist=dist;}
      }
      if(exactish||!best)return w;
      changed=true;return best;
    });
    return changed?out.join(' '):'';
  }

  /* Optional compiled Rust core. */
  let native=null,loading=null,drift=false;
  function decode(b64){
    if(typeof atob==='function'){const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
    return Uint8Array.from(Buffer.from(b64,'base64'));
  }
  async function instantiate(bytes){
    const {instance}=await WebAssembly.instantiate(bytes,{});
    const e=instance.exports;
    if(typeof e.hs_rank!=='function'||e.hs_abi_version()!==1)throw Error('hub-search ABI mismatch');
    native=e;return true;
  }
  function loadNative(url){
    if(native)return Promise.resolve(true);
    if(loading)return loading;
    if(typeof WebAssembly!=='object'||typeof fetch!=='function')return Promise.resolve(false);
    loading=fetch(url||'/assets/hub-search.wasm.b64',{credentials:'same-origin'})
      .then(r=>{if(!r.ok)throw Error('wasm '+r.status);return r.text();})
      .then(t=>instantiate(decode(t.trim())))
      .catch(()=>{native=null;return false;});
    return loading;
  }
  function rankNative(text){
    if(!native)return null;
    const bytes=new TextEncoder().encode(text);
    if(bytes.length>native.hs_input_cap())return null;
    new Uint8Array(native.memory.buffer,native.hs_input_ptr(),bytes.length).set(bytes);
    const count=native.hs_rank(bytes.length);
    if(count<0)return null;
    const out=new Int32Array(native.memory.buffer,native.hs_output_ptr(),1+count*2);
    const docs=[];for(let i=0;i<count;i++)docs.push([out[1+i*2],out[2+i*2]]);
    return {terms:out[0],docs};
  }
  const same=(a,b)=>!!a&&!!b&&a.terms===b.terms&&a.docs.length===b.docs.length&&a.docs.every((d,i)=>d[0]===b.docs[i][0]&&d[1]===b.docs[i][1]);
  /* Rank with Rust when loaded, verified against the oracle; otherwise oracle. */
  function rank(text){
    const oracle=rankText(text);
    if(!native||drift)return {result:oracle,engine:'js'};
    let wasm=null;
    try{wasm=rankNative(text);}catch{wasm=null;}
    if(!same(wasm,oracle)){drift=true;native=null;return {result:oracle,engine:'js'};}
    return {result:wasm,engine:'rust'};
  }

  const api={normalize,stem,osa,quality,queryTerms,rankText,select,buildInput,suggest,rank,loadNative,instantiate,rankNative,
    engine:()=>native&&!drift?'rust':'js'};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HubSearchEngine=api;
})(typeof window!=='undefined'?window:globalThis);
