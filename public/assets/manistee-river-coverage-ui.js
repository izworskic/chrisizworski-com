(()=>{
'use strict';
const D=window.MANISTEE_FIELD_DATA;if(!D)return;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','"':'&quot;'}[c]));
function label(kind){return String(kind||'service').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function styles(){if($('#manistee-coverage-styles'))return;const s=document.createElement('style');s.id='manistee-coverage-styles';s.textContent=`
#panel-places>.lede{margin:0 0 8px;font-size:12px;line-height:1.35}#panel-places>.eyebrow+h2{margin:5px 0 5px}
.manistee-coverage-tools{display:grid;gap:8px;margin:12px 0}.manistee-coverage-tools details{border:1px solid #ddd9cf;border-radius:9px;background:#fff}.manistee-coverage-tools summary{cursor:pointer;padding:10px 12px;font-size:12px;font-weight:800;color:#29463d}.mc-dir{padding:0 10px 10px;display:grid;gap:6px}.mc-dir-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 2px;border-top:1px solid #eeeae1}.mc-dir-row strong{font-size:12px}.mc-dir-row small{display:block;color:#68736e;font-size:10px;line-height:1.4;margin-top:2px}.mc-dir-row a{font-size:10px;font-weight:800;white-space:nowrap}.mc-pill{display:inline-block;margin:3px 4px 0 0;padding:3px 6px;border-radius:999px;background:#eef2ef;color:#53615b;font-size:9px;text-transform:uppercase}.mc-caution{font-size:10px;line-height:1.45;color:#6b716d;padding:0 10px 10px}.mc-audit{padding:0 10px 10px}.mc-audit li{font-size:10px;line-height:1.45;margin:7px 0}.mc-audit b{display:block;color:#33433c}
@media(max-width:560px){.mc-dir-row{grid-template-columns:1fr}.mc-dir-row a{justify-self:start}}
`;document.head.appendChild(s);}
function compactIntro(){const panel=$('#panel-places');if(!panel)return;const h2=$('h2',panel);const lede=$('.lede',panel);if(h2)h2.textContent='Access & places';if(lede)lede.textContent='Source-backed pins for access, camps, trails and river services.';}
function render(){const panel=$('#panel-places');if(!panel||$('.manistee-coverage-tools',panel))return;const host=document.createElement('div');host.className='manistee-coverage-tools';
const services=(D.services||[]).filter(s=>s.kind!=='guide-directory');
const audit=D.coverage?.inventoryOnly||[];
host.innerHTML=`<details><summary>Guides, liveries & outfitters · ${services.length}</summary><div class="mc-dir">${services.map(s=>`<div class="mc-dir-row"><div><strong>${esc(s.name)}</strong><div><span class="mc-pill">${esc(label(s.kind))}</span><span class="mc-pill">${esc(s.coverage)}</span></div><small>${esc(s.note)}</small></div><a href="${esc(s.url)}" target="_blank" rel="noopener">Operator / source</a></div>`).join('')}</div><p class="mc-caution">${esc(D.coverage?.claim||'Verify current operator and agency status before travel.')}</p></details>
<details><summary>Coverage audit · ${D.places.length} mapped places + ${audit.length} listed/unpinned</summary><div class="mc-audit"><ul>${audit.map(x=>`<li><b>${esc(x.name)}</b>${esc(x.status)} · ${esc(x.note)} <a href="${esc(x.source)}" target="_blank" rel="noopener">source</a></li>`).join('')}</ul>${(D.coverage?.exclusions||[]).length?`<p class="mc-caution"><strong>Deliberate exclusions:</strong> ${(D.coverage.exclusions||[]).map(x=>`${esc(x.name)} — ${esc(x.reason)}`).join(' · ')}</p>`:''}</div></details>`;
const detail=$('#place-detail');detail?.before(host);}
function init(){styles();compactIntro();render();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();