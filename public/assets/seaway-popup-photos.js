/* Licensed, identity-checked historical Seaway vessel thumbnails.
 * The visible popup has NO external links. Attribution hyperlinks live in
 * the existing ship selection desk, outside Leaflet's small popup.
 * No live photo API or guessed ship image.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SeawayPopupPhotos=api;
})(typeof window==='object'?window:{},function(root){
  'use strict';
  const DAY=86400000;
  const norm=name=>String(name||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const isSafeImage=url=>typeof url==='string'&&url.startsWith('https://commons.wikimedia.org/wiki/Special:FilePath/')&&url.length<500;
  const isSafeSource=url=>typeof url==='string'&&url.startsWith('https://commons.wikimedia.org/wiki/File:')&&url.length<500;
  const isSafeLicense=url=>url==='https://creativecommons.org/licenses/by-sa/4.0/';
  function match(catalog,ship,now=Date.now()){
    if(!catalog||catalog.schemaVersion!==1||!Array.isArray(catalog.photos))return null;
    const reviewed=Date.parse(String(catalog.checkedOn||'')+'T00:00:00Z');
    const validity=Math.min(180,Number(catalog.identityMaxAgeDays)||0)*DAY;
    if(!Number.isFinite(reviewed)||validity<=0||now<reviewed||now-reviewed>validity)return null;
    const mmsi=String(ship?.mmsi||''),name=norm(ship?.name);
    if(!/^\d{9}$/.test(mmsi)||!name)return null;
    const matches=catalog.photos.filter(p=>p.mmsi===mmsi&&norm(p.aisName)===name
      &&isSafeImage(p.image)&&isSafeSource(p.photoSource)&&isSafeLicense(p.licenseUrl)
      &&typeof p.imageAlt==='string'&&typeof p.credit==='string'&&/^20\d\d$/.test(p.photoYear||''));
    return matches.length===1?matches[0]:null;
  }
  let catalogPromise=null;
  function catalog(){
    if(!catalogPromise){
      if(typeof root.fetch!=='function')return Promise.resolve(null);
      catalogPromise=root.fetch('/assets/seaway-popup-photos.json',{cache:'force-cache'})
        .then(r=>{if(!r.ok)throw Error('curated photo catalog unavailable');return r.json();})
        .catch(()=>null);
    }
    return catalogPromise;
  }
  function creditOutsidePopup(doc,ship,photo){
    const selection=doc.getElementById('mapSelection');
    if(!selection||selection.dataset.shipMmsi!==String(ship.mmsi)||
       selection.dataset.shipSeen!==String(ship.seen))return;
    if(selection.querySelector('.seaway-photo-credit-outside'))return;
    const label=doc.createElement('p');label.className='seaway-photo-credit-outside';
    label.append(doc.createTextNode('Historical ship photo: '+photo.credit+' · '+photo.photoYear+' · '));
    const original=doc.createElement('a');
    original.textContent='Photo source';original.href=photo.photoSource;original.target='_blank';original.rel='noopener noreferrer';
    const license=doc.createElement('a');
    license.textContent=photo.license;license.href=photo.licenseUrl;license.target='_blank';license.rel='noopener noreferrer';
    label.append(original,doc.createTextNode(' · '),license);
    selection.append(label);
  }
  async function enhance(marker,ship,doc){
    if(!marker||!ship||!doc||!marker.isPopupOpen?.())return false;
    const result=await catalog();
    const photo=match(result,ship);
    if(!photo||!marker.isPopupOpen?.())return false;
    const content=marker.getPopup?.()?.getContent?.();
    if(!content||content.dataset.shipMmsi!==String(ship.mmsi)||
       content.dataset.shipSeen!==String(ship.seen)||
       content.dataset.photoFailed==='true')return false;
    const existing=content.querySelector('.seaway-popup-figure');
    if(existing){if(!existing.hidden)creditOutsidePopup(doc,ship,photo);return true;}
    const figure=doc.createElement('figure');figure.className='seaway-popup-figure';
    figure.hidden=true;
    const img=doc.createElement('img');
    img.width=220;img.height=112;img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
    img.alt=photo.imageAlt;
    const caption=doc.createElement('figcaption');
    caption.textContent='Historical photo · '+photo.photoYear+' · '+photo.credit+' · '+photo.license;
    figure.append(img,caption);
    const parent=content.firstChild?.nextSibling||null;
    content.insertBefore(figure,parent);
    img.addEventListener('load',()=>{
      if(marker.getPopup?.()?.getContent?.()!==content)return;
      figure.hidden=false;
      if(marker.isPopupOpen?.()){
        creditOutsidePopup(doc,ship,photo);
        marker.getPopup?.()?.update?.();
      }
    },{once:true});
    img.addEventListener('error',()=>{content.dataset.photoFailed='true';figure.remove();},{once:true});
    img.src=photo.image;
    return true;
  }
  return {match,enhance};
});
