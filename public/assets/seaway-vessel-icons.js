/* Seaway AIS silhouettes.
 * Same broad AIS categories as the Great Lakes freighter tracker; a type-code
 * determines the silhouette and validated length ONLY sets visual scale.
 * No vessel class, flag, tow, direction, destination or identity guessed from size.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SeawayVesselIcons=api;
})(typeof window==='object'?window:{},function(){
  'use strict';
  const KINDS=Object.freeze([
    {kind:'cargo',label:'Freighter / cargo',code:'70–79'},
    {kind:'tanker',label:'Tanker',code:'80–89'},
    {kind:'passenger',label:'Passenger',code:'60–69'},
    {kind:'tug',label:'Tug / towing',code:'31, 32, 52, 57'},
    {kind:'pleasure',label:'Pleasure craft',code:'37'},
    {kind:'sail',label:'Sailboat',code:'36'},
    {kind:'fishing',label:'Fishing vessel',code:'30'},
    {kind:'service',label:'Work / service',code:'33, 34, 50, 51, 53–55, 58'},
    {kind:'unknown',label:'Type unknown',code:'other / missing'}
  ]);
  function classify(v){
    // Open Waters / soo-ais normalized shipType is an integer 1–99 or null.
    // Numeric strings, floating-point values and missing types are unclassified.
    const t=v?.shipType;
    if(!Number.isInteger(t)||t<1||t>99)return 'unknown';
    if(t>=70&&t<80)return 'cargo';
    if(t>=80&&t<90)return 'tanker';
    if(t>=60&&t<70)return 'passenger';
    if(t===31||t===32||t===52||t===57)return 'tug';
    if(t===37)return 'pleasure';
    if(t===36)return 'sail';
    if(t===30)return 'fishing';
    if([33,34,50,51,53,54,55,58].includes(t))return 'service';
    return 'unknown';
  }
  function sizeBand(v){
    const n=v?.lengthMeters;
    if(typeof n!=='number'||!Number.isFinite(n)||n<=0||n>500)return 'unknown';
    if(n<40)return 'small';
    if(n<150)return 'medium';
    return 'large';
  }
  const HULL='<path class="ship-hull" d="M4 21 H10 L14 26 H58 L69 17 H62 L57 21 Z"/>';
  const CAB='<path class="ship-house" d="M9 21V10H22V21Z"/><rect class="ship-stack" x="13" y="5" width="4" height="5" rx="1"/><rect class="ship-window" x="11" y="13" width="3" height="2"/><rect class="ship-window" x="17" y="13" width="3" height="2"/>';
  const DETAIL={
    cargo:CAB+'<path class="ship-hatch" d="M26 16h8v5h-8zM37 16h8v5h-8zM48 16h8v5h-8z"/>',
    tanker:CAB+'<path class="ship-detail" d="M25 17H56 M27 12V22 M40 12V22 M53 12V22"/><circle class="ship-tank" cx="33" cy="17" r="5"/><circle class="ship-tank" cx="46" cy="17" r="5"/>',
    passenger:'<path class="ship-house" d="M11 21V11H56L62 21Z"/><rect class="ship-stack" x="19" y="6" width="5" height="5"/><path class="ship-windows" d="M15 15h4m4 0h4m4 0h4m4 0h4m4 0h4m4 0h4"/>',
    tug:'<path class="ship-hull" d="M8 22H53L64 18H69L60 27H16Z"/><path class="ship-house" d="M20 22V10H42L47 22Z"/><rect class="ship-stack" x="29" y="5" width="5" height="5"/><path class="ship-windows" d="M25 15h6m4 0h6"/>',
    pleasure:'<path class="ship-hull" d="M6 22H64L70 18L62 27H15Z"/><path class="ship-house" d="M19 22L28 14H45L54 22Z"/><path class="ship-windows" d="M29 18h13"/>',
    sail:'<path class="ship-hull" d="M5 23H67L58 28H15Z"/><path class="ship-mast" d="M36 3V23"/><path class="ship-sail" d="M33 5L14 21H33Z"/><path class="ship-sail" d="M39 7L58 21H39Z"/>',
    fishing:'<path class="ship-hull" d="M5 22H63L70 18L59 27H12Z"/><path class="ship-house" d="M10 22V12H27V22Z"/><path class="ship-windows" d="M13 16h8"/><path class="ship-mast" d="M43 22V5 M43 8L58 18 M43 9L32 18"/><path class="ship-detail" d="M55 15v7M32 17v5"/>',
    service:'<path class="ship-hull" d="M5 22H64L69 18L59 27H13Z"/><path class="ship-house" d="M12 22V11H29V22Z"/><rect class="ship-stack" x="17" y="7" width="4" height="4"/><path class="ship-mast" d="M43 22V7L57 11M43 12L58 18"/><path class="ship-windows" d="M15 15h8"/>',
    unknown:'<path class="ship-hull" d="M5 22H63L69 18L60 27H13Z"/><path class="ship-house" d="M14 22V13H32V22Z"/><path class="ship-windows" d="M18 17h9"/>'
  };
  function svg(kind){
    const recognized=Object.prototype.hasOwnProperty.call(DETAIL,kind)?kind:'unknown';
    const hull=['cargo','tanker','passenger'].includes(recognized)?HULL:'';
    return '<svg viewBox="0 0 72 36" aria-hidden="true" focusable="false">'+hull+DETAIL[recognized]+'</svg>';
  }
  function icon(v,{zoom=11,selected=false}={}){
    const kind=classify(v),band=sizeBand(v);
    const sizes={small:[38,29],medium:[49,32],large:[63,36],unknown:[46,31]};
    let width=sizes[band][0],height=sizes[band][1];
    // At the corridor overview zoom, reduce spatial crowding without
    // erasing small craft. The selected boat stays big enough to identify.
    if(zoom<8&&!selected)width=Math.max(35,width-6);
    if(selected){width=Math.min(76,width+10);height+=3;}
    const speed=typeof v?.speedKnots==='number'&&Number.isFinite(v.speedKnots)?v.speedKnots:null;
    const state=speed===null?'is-unknown':speed<0.5?'is-stopped':'is-moving';
    const label=KINDS.find(x=>x.kind===kind).label;
    return {
      kind,band,label,state,size:[width,height],
      className:'seaway-ship-marker type-'+kind+' size-'+band+' '+state+(selected?' is-selected':''),
      html:svg(kind),
      key:[kind,band,width,height,state,selected?'selected':'normal'].join(':')
    };
  }
  return {KINDS,classify,sizeBand,svg,icon};
});
