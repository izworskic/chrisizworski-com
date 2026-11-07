'use strict';
/* Rocket Map Pins v1: one source-derived mission layer shared across six maps.
 * No visitor-side launch API calls, invented pad coordinates, launch trajectory,
 * directions into a restricted range, or inferred public access.
 * At nationwide zoom, markers aggregate by region; zooming in reveals pad
 * coordinates where the third-party launch record actually contains them.
 */
(function (root) {
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const BOX=Object.freeze({
    california:[33.9,35.6,-122,-119],
    florida:[27.6,29.4,-81.5,-79.8],
    texas:[25.6,26.5,-97.8,-96.7],
    virginia:[37.5,38.2,-75.9,-75.0],
    alaska:[56.8,58,-153.3,-151],
    hawaii:[21.6,22.3,-160.3,-159.4]
  });
  const ROCKET='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.12 2.12 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6.05 11A22 22 0 0 1 12 15Z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><circle cx="15" cy="9" r="2"/></svg>';
  function inRegion(r,lat,lon) {
    const b=BOX[r];
    return Boolean(b&&Number.isFinite(lat)&&Number.isFinite(lon)&&
      lat>b[0]&&lat<b[1]&&lon>b[2]&&lon<b[3]);
  }
  function centersOf(regions) {
    const found={};
    for(const r of Array.isArray(regions)?regions:[]){
      if(BOX[r?.id]&&inRegion(r.id,r.lat,r.lon))found[r.id]={lat:r.lat,lon:r.lon};
    }
    return found;
  }
  function groupsOf(launches, region, centers, lowZoom=false) {
    const groups=new Map(), list=Array.isArray(launches)?launches:[];
    // UUID and region are the only inputs allowed to create mission controls.
    for(const m of list.slice(0,600)){
      if(!m||!UUID.test(m.id)||!BOX[m.region]||(region!=='all'&&m.region!==region))continue;
      const precise=inRegion(m.region,m.lat,m.lon);
      const center=centers?.[m.region];
      if(!precise&&!inRegion(m.region,center?.lat,center?.lon))continue;
      const aggregate=lowZoom&&region==='all';
      const lat=aggregate?center.lat:precise?m.lat:center.lat;
      const lon=aggregate?center.lon:precise?m.lon:center.lon;
      const key=aggregate?'area:'+m.region:precise?
        'pad:'+m.region+':'+lat.toFixed(4)+':'+lon.toFixed(4):'unknown:'+m.region;
      let g=groups.get(key);
      if(!g){g={key,region:m.region,lat,lon,kind:aggregate?'cluster':precise?'pad':'region',
        launches:[],exactPads:0};groups.set(key,g);}
      g.launches.push(m);
      if(precise)g.exactPads++;
    }
    return [...groups.values()].sort((a,b)=>a.region.localeCompare(b.region)||
      a.key.localeCompare(b.key));
  }
  function icon(L,group,selected) {
    const count=group.launches.length;
    const className='rocket-origin-icon'+(selected?' is-selected':'')+
      (group.kind!=='pad'?' is-approximate':'')+(count>1?' has-count':'');
    const html='<span class="rocket-origin-symbol">'+ROCKET+
      (count>1?'<span class="rocket-origin-count">'+(count>99?'99+':String(count))+'</span>':'')+'</span>';
    const size=selected?52:44;
    return L.divIcon({className,html,iconSize:[size,size],iconAnchor:[size/2,size/2],
      popupAnchor:[0,-size/2+5]});
  }
  function placeLabel(g) {
    return g.kind==='cluster'?'Region group · zoom in for individual pads':
      g.kind==='pad'?'Launch pad coordinates from the published mission record':
      'Approximate launch region · exact launch pad NOT confirmed';
  }
  function mount(map, options={}) {
    const L=options.L||(typeof window!=='undefined'?window.L:null);
    if(!map||!L?.marker||!L?.divIcon)return null;
    const region=options.region||'all', centers=options.centers||{};
    const onSelect=typeof options.onSelect==='function'?options.onSelect:()=>{};
    let launches=[],selectedId=null,markers=[],displayed=[];
    function clear(){for(const p of markers)map.removeLayer(p);markers=[];}
    function draw(){
      clear();
      const zoom=typeof map.getZoom==='function'?map.getZoom():10;
      displayed=groupsOf(launches,region,centers,zoom<7);
      for(const g of displayed){
        const selected=g.launches.some(m=>m.id===selectedId);
        const primary=g.launches.find(m=>m.id===selectedId)||g.launches[0];
        const marker=L.marker([g.lat,g.lon],{
          icon:icon(L,g,selected),keyboard:true,zIndexOffset:selected?1300:800,
          title:(selected?'Selected rocket · ':'Rocket launch · ')+
            (g.kind==='pad'?(primary.pad||'published pad'):'approximate range')+
            ' · '+g.launches.length+' mission(s)'
        }).addTo(map);
        const pop=document.createElement('div');pop.className='rocket-origin-popup';
        const h=document.createElement('strong');
        h.textContent=g.kind==='pad'?(primary.pad||primary.location||'Launch pad'):
          g.kind==='cluster'?(g.region+' launch missions'):(g.region+' launch region');
        pop.appendChild(h);
        const note=document.createElement('p');note.textContent=placeLabel(g)+
          '. Restricted site, NOT a public entrance or viewing destination.';
        pop.appendChild(note);
        const list=document.createElement('div');list.className='rocket-origin-missions';
        for(const mission of g.launches){
          const button=document.createElement('button');button.type='button';
          button.className='rocket-origin-mission'+(mission.id===selectedId?' is-selected':'');
          const title=document.createElement('span');title.textContent=mission.name||'Scheduled mission';
          const source=document.createElement('small');
          source.textContent=(mission.pad||'Pad unverified')+' · '+(mission.netPrecision||'time unverified');
          button.append(title,source);
          button.setAttribute('aria-label','Select rocket launch '+(mission.name||mission.id));
          button.addEventListener('click',event=>{
            event.preventDefault();map.closePopup?.();onSelect(mission.id,mission.region);
          });
          list.appendChild(button);
        }
        pop.appendChild(list);
        if(g.kind==='cluster'){
          const zoomButton=document.createElement('button');
          zoomButton.type='button';zoomButton.className='rocket-origin-zoom';
          zoomButton.textContent='Zoom in to see launch pads';
          zoomButton.addEventListener('click',()=>{
            map.closePopup?.();map.setView?.([g.lat,g.lon],10,{animate:false});
          });
          pop.appendChild(zoomButton);
        }
        marker.bindPopup(pop,{maxWidth:330});
        const tooltip=document.createElement('span');
        tooltip.textContent=g.launches.length+' rocket launch'+(g.launches.length!==1?'es':'')+
          ' · '+placeLabel(g);
        marker.bindTooltip(tooltip,{direction:'top'});
        markers.push(marker);
      }
    }
    function update(next,selected){
      launches=(Array.isArray(next)?next:[]).slice(0,600);
      selectedId=UUID.test(selected||'')?selected:null;
      draw();
    }
    function focusSelected(){
      const g=displayed.find(x=>x.launches.some(m=>m.id===selectedId));
      if(g&&map.setView)map.setView([g.lat,g.lon],g.kind==='pad'?11:9,{animate:false});
      return Boolean(g);
    }
    map.on?.('zoomend',draw);
    return {update,clear,focusSelected,getGroups:()=>displayed.slice()};
  }
  const api=Object.freeze({BOX,inRegion,centersOf,groupsOf,mount,placeLabel});
  root.RocketMapPins=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
