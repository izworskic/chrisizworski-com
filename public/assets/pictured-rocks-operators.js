(function(){
'use strict';

const NPS_KAYAK_GUIDES='https://www.nps.gov/piro/planyourvisit/kayak-tours.htm';
const NPS_COMMERCIAL='https://www.nps.gov/piro/planyourvisit/commercial-tours.htm';

const CRUISE={
  name:'Pictured Rocks Cruises',
  url:'https://picturedrocks.com/',
  phone:'(906) 387-2379',
  detail:'The NPS-authorized concessioner for narrated Pictured Rocks boat cruises from the Munising City Dock. Classic, Spray Falls, and sunset options are offered seasonally; verify the day’s route and departure directly.'
};

const KAYAK_GUIDES=[
  {name:'Big Water Paddle Co.',url:'https://bigwaterpaddle.com/',phone:'(906) 450-8020',detail:'NPS-permitted guided sea-kayak operator based on H-58 near Munising.'},
  {name:'Paddling Michigan / Uncle Ducky’s',url:'https://www.paddlingmichigan.com/',phone:'(906) 387-1695',detail:'NPS-permitted guided sea-kayak operator with multiple trip lengths and Pictured Rocks routes.'},
  {name:'Pictured Rocks Kayaking',url:'https://picturedrockskayaking.com/',phone:'(906) 387-5500',detail:'NPS-permitted boat-supported kayak tours that launch offshore near the cliff section.'},
  {name:'Yooper Yachts',url:'https://yooperyachts.com/',phone:'(906) 202-1551',detail:'NPS-permitted small-group and private guided sea-kayak tours.'}
];

function el(tag,className,html){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(html!=null)node.innerHTML=html;
  return node;
}

function operatorLink(op,label){
  return `<a href="${op.url}" target="_blank" rel="noopener">${label||op.name} ↗</a>`;
}

function addStyles(){
  if(document.getElementById('picturedRocksOperatorStyles'))return;
  const style=document.createElement('style');
  style.id='picturedRocksOperatorStyles';
  style.textContent=`
  .operator-inline{margin:12px 16px 0;padding:11px 12px;border-radius:9px;background:#f3f7f6;border:1px solid #d9e5e3;font-size:.78rem;line-height:1.45;color:#40575a}
  .operator-inline strong{display:block;color:#173d43;margin-bottom:2px}.operator-inline a{font-weight:850;color:#0b5966;text-decoration:none}.operator-inline a:hover{text-decoration:underline}
  .operator-section{border-top:4px solid #0d5662}.operator-intro{max-width:780px;color:#536468}.operator-grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.65fr);gap:14px;margin-top:18px}.operator-panel{border:1px solid #d6d8d2;border-radius:14px;background:#fff;padding:17px}.operator-panel h3{font-family:Georgia,'Times New Roman',serif;font-size:1.35rem;font-weight:500;margin:4px 0 8px}.operator-panel>p{color:#526468;margin:0 0 12px;font-size:.88rem}.operator-kicker{font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;font-weight:900;color:#0d5662}.operator-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.operator-card{border:1px solid #e0e4df;border-radius:10px;padding:12px;background:#fbfcfa}.operator-card strong{display:block;color:#173d43;margin-bottom:4px}.operator-card p{font-size:.79rem;line-height:1.45;color:#536468;margin:0 0 8px}.operator-card a,.operator-panel>a,.operator-source a{font-weight:850;color:#0b5966;text-decoration:none}.operator-card a:hover,.operator-panel>a:hover,.operator-source a:hover{text-decoration:underline}.operator-phone{font-size:.75rem;color:#66787b;margin-top:5px}.operator-source{margin-top:12px;padding-top:10px;border-top:1px solid #e4e6e1;font-size:.75rem;color:#68777a}.planner-operator-help{margin:10px 0 18px;padding:13px 14px;border-radius:10px;background:#f4f8f7;border:1px solid #d8e4e2}.planner-operator-help h3{font-size:.96rem;margin:0 0 6px}.planner-operator-help p{font-size:.82rem;color:#536468;margin:0 0 8px}.planner-operator-links{display:flex;flex-wrap:wrap;gap:7px}.planner-operator-links a{font-size:.77rem;font-weight:850;background:#fff;border:1px solid #d6dfdd;border-radius:999px;padding:6px 9px;text-decoration:none;color:#0b5966}.result-operators{margin:18px 0;border:1px solid #d6d8d2;border-radius:12px;background:#fbfcfa;padding:15px}.result-operators h3{margin:3px 0 7px;font-family:Georgia,'Times New Roman',serif;font-weight:500}.result-operators p{margin:0 0 10px;color:#536468;font-size:.84rem}.result-operator-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.result-operator-grid a{display:block;border:1px solid #dce3e1;background:#fff;border-radius:8px;padding:9px 10px;text-decoration:none;color:#0b5966;font-weight:850;font-size:.8rem}
  @media(max-width:760px){.operator-grid{grid-template-columns:1fr}.operator-list,.result-operator-grid{grid-template-columns:1fr}.operator-inline{margin-left:16px;margin-right:16px}}
  `;
  document.head.appendChild(style);
}

function waterCards(){
  const cards=Array.from(document.querySelectorAll('.trip-card'));
  for(const card of cards){
    if(card.querySelector('.operator-inline'))continue;
    const heading=card.querySelector('h3')?.textContent?.trim();
    if(heading==='Boat cruise'){
      const box=el('div','operator-inline',`<strong>Who runs it</strong>${operatorLink(CRUISE)} · ${CRUISE.phone}<br>Authorized NPS concessioner; departures are from Munising.`);
      const button=card.querySelector('button');
      card.insertBefore(box,button||null);
    }
    if(heading==='Guided kayak'){
      const box=el('div','operator-inline',`<strong>Who can guide it</strong>Four companies are on the NPS 2026 permitted-guide list. <a href="#water-operators">Compare the guides ↓</a>`);
      const button=card.querySelector('button');
      card.insertBefore(box,button||null);
    }
  }
}

function operatorSection(){
  if(document.getElementById('water-operators'))return;
  const shape=document.querySelector('.trip-shapes-section');
  if(!shape)return;
  const section=el('section','section operator-section');
  section.id='water-operators';
  section.setAttribute('aria-labelledby','operators-title');
  section.innerHTML=`
    <div class="section-head"><div><p class="eyebrow">Turn the choice into a booking</p><h2 id="operators-title">Pictured Rocks boat and kayak operators</h2><p class="operator-intro">Use the planner to decide whether a cruise or guided paddle fits the day, then confirm current schedules, prices, age/ability rules, and weather decisions directly with the operator. Kayak companies below are the businesses on the National Park Service’s 2026 permitted-guide list.</p></div></div>
    <div class="operator-grid">
      <article class="operator-panel"><span class="operator-kicker">Boat cruise</span><h3>${CRUISE.name}</h3><p>${CRUISE.detail}</p>${operatorLink(CRUISE,'Open cruise schedules')}<div class="operator-phone">${CRUISE.phone}</div><div class="operator-source">NPS commercial-tour context: <a href="${NPS_COMMERCIAL}" target="_blank" rel="noopener">official park page ↗</a></div></article>
      <article class="operator-panel"><span class="operator-kicker">Guided kayaking</span><h3>NPS-permitted kayak guides</h3><p>These are choices, not rankings. Tour format, launch method, group size, duration, and cancellation policy differ, so pick the operator that fits the trip you actually built.</p><div class="operator-list">${KAYAK_GUIDES.map(op=>`<div class="operator-card"><strong>${op.name}</strong><p>${op.detail}</p>${operatorLink(op,'Operator site')}<div class="operator-phone">${op.phone}</div></div>`).join('')}</div><div class="operator-source">Verify the current permit list before booking: <a href="${NPS_KAYAK_GUIDES}" target="_blank" rel="noopener">NPS kayak tours ↗</a></div></article>
    </div>`;
  shape.parentNode.insertBefore(section,shape.nextSibling);
}

function plannerHelp(){
  const form=document.getElementById('tripForm');
  if(!form||document.getElementById('plannerOperatorHelp'))return;
  const water=Array.from(form.querySelectorAll('input[name="water"]'));
  if(!water.length)return;
  const fieldset=water[0].closest('fieldset');
  const help=el('div','planner-operator-help');
  help.id='plannerOperatorHelp';
  fieldset.insertAdjacentElement('afterend',help);
  function render(){
    const value=form.querySelector('input[name="water"]:checked')?.value||'any';
    if(value==='land'){
      help.innerHTML='<h3>No booking needed for the water portion</h3><p>You selected a land-first plan. The itinerary will stay focused on park access, trails, overlooks, beaches, dunes, and waterfalls.</p>';
      return;
    }
    if(value==='cruise'){
      help.innerHTML=`<h3>Boat operator for this choice</h3><p>${CRUISE.name} is the NPS-authorized concessioner. Check the live schedule after the planner builds your route.</p><div class="planner-operator-links">${operatorLink(CRUISE,'Pictured Rocks Cruises')}</div>`;
      return;
    }
    if(value==='kayak'){
      help.innerHTML=`<h3>Choose an NPS-permitted guide</h3><p>The planner decides whether kayaking fits; the guide makes the operational call on the lake.</p><div class="planner-operator-links">${KAYAK_GUIDES.map(op=>operatorLink(op)).join('')}</div>`;
      return;
    }
    help.innerHTML=`<h3>If the planner sends you onto the water</h3><p>You will get the matching cruise or kayak operators with the finished route. You can also compare them now.</p><div class="planner-operator-links"><a href="#water-operators">Compare water operators ↓</a></div>`;
  }
  water.forEach(input=>input.addEventListener('change',render));
  render();
}

function inferResultMode(){
  const form=document.getElementById('tripForm');
  const selected=form?.querySelector('input[name="water"]:checked')?.value;
  if(selected==='cruise'||selected==='kayak'||selected==='land')return selected;
  const text=(document.getElementById('result')?.textContent||'').toLowerCase();
  if(/guided kayak|kayak|paddle/.test(text))return 'kayak';
  if(/boat cruise|cruise/.test(text))return 'cruise';
  return 'any';
}

function resultOperators(){
  const result=document.getElementById('result');
  if(!result)return;
  let box=document.getElementById('resultOperators');
  if(!box){
    box=el('div','result-operators');
    box.id='resultOperators';
    const actions=result.querySelector('.action-row');
    result.insertBefore(box,actions||null);
  }
  const mode=inferResultMode();
  if(mode==='land'){
    box.hidden=true;
    return;
  }
  box.hidden=false;
  if(mode==='cruise'){
    box.innerHTML=`<p class="eyebrow">Book the water anchor</p><h3>${CRUISE.name}</h3><p>${CRUISE.detail}</p><div class="result-operator-grid">${operatorLink(CRUISE,'Check cruise schedule')}</div>`;
    return;
  }
  if(mode==='kayak'){
    box.innerHTML=`<p class="eyebrow">Book the water anchor</p><h3>Choose an NPS-permitted kayak guide</h3><p>Compare the tour format and confirm today’s marine decision directly with the guide.</p><div class="result-operator-grid">${KAYAK_GUIDES.map(op=>operatorLink(op)).join('')}</div>`;
    return;
  }
  box.innerHTML=`<p class="eyebrow">If water is part of this plan</p><h3>Current commercial operators</h3><p>Use the NPS-authorized cruise concessioner or one of the NPS-permitted kayak guides below.</p><div class="result-operator-grid">${operatorLink(CRUISE)}${KAYAK_GUIDES.map(op=>operatorLink(op)).join('')}</div>`;
}

function watchResult(){
  const result=document.getElementById('result');
  if(!result)return;
  const observer=new MutationObserver(()=>resultOperators());
  observer.observe(result,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
  const form=document.getElementById('tripForm');
  if(form)form.addEventListener('submit',()=>setTimeout(resultOperators,0));
  resultOperators();
}

function init(){
  addStyles();
  waterCards();
  operatorSection();
  plannerHelp();
  watchResult();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
