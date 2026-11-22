/* Adventure Finder intent retrieval, no external model, calls or visitor storage.
 * Evidence comes from the 20 existing editorial HTML destination cards.
 * Shared between Node benchmarks and the browser via UMD.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AdventureIntent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STOP = new Set(('a an and are as at be by can do for from has have i in into is it its me my near of on or our ' +
    'the their them there these this those to us was we what when where which who will with would you your ' +
    'after before find looking look want would like place places something somewhere good best great nearby').split(/\s+/));
  const CONCEPTS = [
    // Every boost requires evidence in the card text. This vocabulary is a language bridge,
    // not a database of unverified park services, permitted activities or opening hours.
    {id:'carfree', label:'car-free roads', weight:13,
      query:['leave the car behind','without a car','no cars','car free','car less','vehicle free','carless'],
      evidence:['car free','no cars','vehicle free']},
    {id:'ferry',label:'ferry arrivals',weight:10,
      query:['ferry','ferries','passenger boat','boat crossing','lake crossing','cross the lake','after a lake crossing','water crossing'],
      evidence:['ferry','ferries']},
    {id:'wine',label:'wine and tasting rooms',weight:13,
      query:['wine','winery','wineries','vineyard','vineyards','tasting room','tasting rooms','wine tasting'],
      evidence:['wine','winery','vineyard','tasting room']},
    {id:'food',label:'restaurants and dining',weight:10,
      query:['restaurant','restaurants','long dinner','good food','dining','eat out','eat afterward','dinner'],
      evidence:['restaurant','restaurants','dinner','dining']},
    {id:'riverwalk',label:'the riverwalk',weight:14,
      query:['riverwalk','river walk','urban river walk','waterfront promenade'],
      evidence:['riverwalk','river walk']},
    {id:'freighters',label:'freighters and ships',weight:10,
      query:['commercial ships','freighters','freighter','vessels','ship traffic','ship watching','shipping lanes','ships'],
      evidence:['freighter','freighters','ship traffic','ships','shipping']},
    {id:'amber',label:'amber-colored falls',weight:16,
      query:['tea colored','tea stained','tea coloured','tea color','brown colored','amber','golden cascade'],
      evidence:['amber','tea colored','tea stained']},
    {id:'waterfalls',label:'waterfalls',weight:8,
      query:['waterfall','waterfalls','water falls','cascade','cascades','falls'],
      evidence:['waterfall','waterfalls','falls']},
    {id:'birding',label:'bird migration and watching',weight:10,
      query:['bird watching','birdwatching','birding','migrating birds','migratory birds','bird migration','binoculars'],
      evidence:['birding','bird migration','bird habitat','binoculars']},
    {id:'shipwreck',label:'shipwreck history',weight:12,
      query:['shipwreck','shipwrecks','sunken ships','maritime museum','maritime history','shipwreck stories'],
      evidence:['shipwreck','maritime history']},
    {id:'oldgrowth',label:'old forests',weight:9,
      query:['old growth','old forest','ancient forest','old trees','old woodland'],
      evidence:['old forest','old growth']},
    {id:'dunes',label:'sand dunes',weight:7,
      query:['dunes','dune','sandy hills','sand hills','sand bluffs'],
      evidence:['dune','dunes','sand']},
    {id:'rocky',label:'rocky shorelines',weight:6,
      query:['rocky shore','rocky shoreline','rocky coast','rocky lakeshore','cliffs','cliff','limestone bluffs'],
      evidence:['rocky','cliff','limestone','sandstone']},
    {id:'city',label:'city-based outings',weight:6,
      query:['urban','city','downtown','town with restaurants','city base','city scale'],
      evidence:['city','in town','riverwalk','walkable']},
    {id:'forest',label:'forest paths',weight:5,
      query:['forest','forests','woods','wooded','woodland','forest trails','wooded walks'],
      evidence:['forest','woods','wooded','woodland','cedar']},
    {id:'paddle',label:'paddling and canoeing',weight:8,
      query:['canoe','canoeing','kayak','kayaking','paddle','paddling','on the water'],
      evidence:['canoe','canoeing','kayak','kayaking','paddle','paddling']},
    {id:'beach',label:'shorelines and beaches',weight:5,
      query:['beach','beaches','shoreline','lakeshore','shore'],
      evidence:['beach','shoreline','lakeshore','shore']},
    {id:'hiking',label:'walking and hiking trails',weight:5,
      query:['hiking','hike','trails','trail','woodland walk','walk'],
      evidence:['hiking','hike','trail','trails','walk']},
    {id:'scenicdrive',label:'scenic roads',weight:5,
      query:['scenic drive','scenic road','road trip','drive through','winding road'],
      evidence:['drive','road','m 119']},
    {id:'lighthouse',label:'lighthouses',weight:8,
      query:['lighthouse','lighthouses','beacon','historic light'],
      evidence:['lighthouse','lighthouses']},
    {id:'island',label:'island landscapes',weight:4,
      query:['island','islands','isle','island trip','island hopping'],
      evidence:['island','isle']},
    {id:'wilderness',label:'remote wilderness',weight:7,
      query:['remote','wilderness','backcountry','backpacking','multi day hike','multi day hiking'],
      evidence:['wilderness','multi day hiking','old forest','long ridge']},
    {id:'farming',label:'farm roads',weight:7,
      query:['farms','farm','farmland','orchards','country roads'],
      evidence:['farm','orchard']},
    {id:'cycling',label:'bike outings',weight:7,
      query:['bicycle','cycling','bike','bike ride','biking','pedal'],
      evidence:['bike','biking','bicycle','cycling']},
    {id:'autumn',label:'autumn color',weight:4,
      query:['fall foliage','fall colors','fall leaves','autumn','fall color','colorful trees'],
      evidence:['autumn','fall color','woodland road','trees']},
    {id:'winter',label:'winter landscapes',weight:4,
      query:['winter','snowy','snow','ice','frozen','ice curtains'],
      evidence:['winter','snow','ice']},
    {id:'quiet',label:'quieter places',weight:3,
      query:['quiet','peaceful','solitude','unhurried','slow travel','less crowded'],
      evidence:['quiet','unhurried','solitude','slow','quieter']},
    {id:'harbor',label:'harbor landscapes',weight:5,
      query:['harbor','harbour','harbors','harbours','port town'],
      evidence:['harbor']},
    {id:'mining',label:'mining history',weight:9,
      query:['copper','mines','mining','copper country'],
      evidence:['copper','mining']}
  ];
  // These requested assurances or services are not documented in this twenty-card
  // catalog. Do not quietly recommend a beach, an access point or a facility.
  const UNSUPPORTED = [
    ['airport','airport facilities'],['guaranteed','verified guarantees'],
    ['electric car charger','EV charging'],['ev charging','EV charging'],['charging station','EV charging'],
    ['lifeguard','lifeguards'],['lifeguards','lifeguards'],['safe swimming','swimming safety'],
    ['warm water right now','current swimming temperature'],
    ['water safe to swim','water safety'],['safe ice','ice safety'],
    ['ice safe','ice safety'],['safely walk out on frozen lake','ice safety'],['walk out on frozen lake ice','ice safety'],['safe walking on frozen ice','ice safety'],
    ['open today','live opening status'],['open now','live opening status'],
    ['lift ticket','lift ticket pricing'],['chairlift','ski-lift status'],
    ['wheelchair accessible','verified accessibility'],
    ['reserved parking','parking availability'],['plowed parking','plowed parking']
  ];
  function unsupportedReasons(query) {
    const q=normalize(query);
    return UNSUPPORTED.filter(item=>includesPhrase(q,item[0])).map(item=>item[1]);
  }
  function normalize(value) {
    return ' ' + String(value || '').normalize('NFKD').toLowerCase()
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim() + ' ';
  }
  function includesPhrase(normalized, phrase) {
    return normalized.includes(normalize(phrase));
  }
  function stem(token) {
    if (token.length > 5 && token.endsWith('ies')) return token.slice(0,-3)+'y';
    if (token.length > 6 && token.endsWith('ing')) return token.slice(0,-3);
    if (token.length > 5 && token.endsWith('ed')) return token.slice(0,-2);
    if (token.length > 5 && token.endsWith('es')) return token.slice(0,-2);
    if (token.length > 4 && token.endsWith('s')) return token.slice(0,-1);
    return token;
  }
  function terms(text) {
    return normalize(text).trim().split(' ')
      .filter(word=>word.length>2 && !STOP.has(word)).map(stem);
  }
  function uniqueTerms(value) { return [...new Set(terms(value))]; }
  function hasSome(normalized, list) { return list.some(phrase=>includesPhrase(normalized,phrase)); }
  function fromCard(card) {
    const body = card.querySelector('.destination-body');
    if (!body) throw new Error('Missing destination-body for '+card.id);
    const copy = [...body.querySelectorAll('p')].map(p=>p.textContent).join(' ');
    const links = [...body.querySelectorAll('.destination-links a:not([data-map-google-location])')]
      .map(a=>a.textContent).join(' ');
    return {
      id: card.id, element:card,
      title:card.querySelector('h3')?.textContent.trim() || '',
      region:card.dataset.region || '',
      tags:(card.dataset.tags || '').split(',').filter(Boolean),
      description:copy+' '+links
    };
  }
  function scoreOne(card, queryNorm, queryTerms, activeConcepts) {
    const title=normalize(card.title),region=normalize(card.region),
      tags=normalize(card.tags.join(' ')),body=normalize(card.description);
    const titled=new Set(uniqueTerms(card.title)), regioned=new Set(uniqueTerms(card.region)),
      tagged=new Set(uniqueTerms(card.tags.join(' '))),bodied=new Set(uniqueTerms(card.description));
    let score=0;
    let titleHits=0;
    for(const term of queryTerms) {
      if(titled.has(term)) {score+=6;titleHits++;}
      else if(tagged.has(term))score+=4;
      else if(regioned.has(term))score+=3;
      else if(bodied.has(term))score+=1;
    }
    const why=[];
    for(const concept of activeConcepts) {
      if(hasSome(body,concept.evidence) || hasSome(title,concept.evidence) || hasSome(tags,concept.evidence)) {
        score+=concept.weight;
        why.push(concept.label);
      }
    }
    if(queryNorm.trim().length>5 && title.includes(queryNorm.trim()))score+=22;
    // A vague single adjective is not sufficient evidence of a recommendation.
    return {id:card.id,score,why,titleHits,element:card.element};
  }
  function search(cards, query, options={}) {
    const q=String(query || '').trim().slice(0,120);
    if (!q || unsupportedReasons(q).length) return [];
    const normalized=normalize(q);
    const queryTerms=uniqueTerms(q);
    const activeConcepts=CONCEPTS.filter(c=>hasSome(normalized,c.query));
    if(!queryTerms.length && !activeConcepts.length)return [];
    const scored=cards.map(c=>scoreOne(c,normalized,queryTerms,activeConcepts))
      .filter(item=>(item.why.length>0 && item.score>=4) || (item.titleHits>0 && item.score>=6))
      .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const limit=Number.isFinite(options.limit)?Math.max(1,Math.min(20,options.limit)):8;
    return scored.slice(0,limit);
  }
  return Object.freeze({search,fromCard,normalize,terms,unsupportedReasons,CONCEPTS});
});
