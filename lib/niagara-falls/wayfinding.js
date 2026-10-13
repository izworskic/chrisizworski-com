'use strict';
// Curated visitor entrance and viewpoint coordinates from OpenStreetMap/Mapcarta
// (October 2026); coordinates are orientation aids, NOT accessible path geometry.
const {compareArrival}=require('./arrival-compare.js');
const STOPS=Object.freeze({
 prospect:{lat:43.08623,lng:-79.06987,kind:'viewpoint',hint:'Prospect Point overlook'},
 maid:{lat:43.08694,lng:-79.06881,kind:'boat',hint:'Observation Tower and Maid of the Mist ticket entrance ABOVE the dock'},
 goat:{lat:43.08008,lng:-79.07443,kind:'viewpoint',hint:'Terrapin Point overlook on Goat Island'},
 cave:{lat:43.08220,lng:-79.07084,kind:'mist',hint:'Cave of the Winds ticket/attraction entrance, not the gorge platform'},
 table:{lat:43.07896,lng:-79.07816,kind:'viewpoint',hint:'Table Rock public viewing rail'},
 journey:{lat:43.07921,lng:-79.07909,kind:'attraction',hint:'Journey Behind the Falls entrance inside Table Rock Centre'},
 victoria:{lat:43.08334,lng:-79.07827,kind:'viewpoint',hint:'Central Queen Victoria Park, near Queen Victoria Place'},
 cruise:{lat:43.08875,lng:-79.07392,kind:'boat',hint:'Niagara City Cruises ticket kiosks at Grand View Marketplace, NOT riverside dock'}
});
const PARKING=Object.freeze({
 us1:{id:'us1',side:'US',name:'State Park Parking Lot 1',address:'333 Prospect Street, Niagara Falls, NY',lat:43.08739,lng:-79.06566,source:'https://www.niagarafallsstatepark.com/park-information/parking/',near:'Prospect Point and Maid of the Mist',basis:'Official park recommends Lot 1 for the Welcome Center and Maid of the Mist.'},
 us2:{id:'us2',side:'US',name:'State Park Parking Lot 2',address:'15 Goat Island Loop Road, Niagara Falls, NY',lat:43.08093,lng:-79.07069,source:'https://www.niagarafallsstatepark.com/park-information/parking/',near:'Cave of the Winds and Goat Island',basis:'Official park recommends Lot 2 for Cave of the Winds.'},
 caA:{id:'caA',side:'CA',name:'Falls Parking · Lot A',address:'6635 Niagara Parkway, Niagara Falls, ON',lat:43.0764,lng:-79.0801,approximate:true,source:'https://www.niagaraparks.com/visit-niagara-parks/plan-your-visit/getting-around/',near:'Table Rock and Journey Behind the Falls',basis:'Official Niagara Parks main lot for Table Rock; pin is approximate within parking area.'},
 caQ:{id:'caQ',side:'CA',name:'Queen Victoria Place Parking',address:'6349 Niagara Parkway, Niagara Falls, ON',lat:43.08334,lng:-79.07827,approximate:true,source:'https://www.niagaraparks.com/visit-niagara-parks/plan-your-visit/getting-around/',near:'Queen Victoria Park and northern Niagara Parkway',basis:'Official Niagara Parks central pay-and-display lot; small lot, availability not known.'}
});
const GUIDE={
 US:{transport_name:'Niagara Scenic Trolley',operator_url:'https://www.niagarafallsstatepark.com/attractions/trolley/',guide:'The State Park Scenic Trolley connects park areas seasonally. It is separate from Canadian WEGO; verify today\'s service before relying on it.',park_url:'https://www.niagarafallsstatepark.com/park-information/parking/'},
 CA:{transport_name:'WEGO Green Line',operator_url:'https://www.niagaraparks.com/getting-around/wego-niagara-falls-bus/',guide:'WEGO Green Line serves Table Rock Centre, Queen Victoria Park and Niagara City Cruises. Allow time for waiting and confirm direction, service, and last bus; these are not live arrivals.',park_url:'https://www.niagaraparks.com/visit-niagara-parks/plan-your-visit/getting-around/'}
};
function parkingRate(parking,date){
 if(parking.side==='CA')return 'Variable rate in CAD; verify at operator. Availability is not live.';
 if(date>='2026-10-12'&&date<='2027-03-31')return '$10 USD daily published for this season; verify special notices.';
 return 'Seasonal parking rates may vary; verify the date with the State Park.';
}
function chooseParking(plan){
 if(plan.side==='US'){
  const ids=plan.stops.map(s=>s.id);
  if(plan.priority==='boat'&&ids.includes('maid'))return PARKING.us1;
  return ['cave','goat'].includes(ids[0])?PARKING.us2:PARKING.us1;
 }
 const ids=plan.stops.map(s=>s.id);
 if(ids[0]==='cruise'||ids[0]==='victoria')return PARKING.caQ;
 return PARKING.caA;
}
function wayfinding(plan,arrivalMode='drive',visitor={}){
 const mode=['drive','walk','transit'].includes(arrivalMode)?arrivalMode:'drive';
 const transit=GUIDE[plan.side];
 const pinStops=plan.stops.filter(s=>STOPS[s.id]).map((s,index)=>({id:s.id,name:s.name,number:index+1,lat:STOPS[s.id].lat,lng:STOPS[s.id].lng,hint:STOPS[s.id].hint,arrival:s.arrival,departure:s.departure,kind:STOPS[s.id].kind,location:s.location,estimated_transfer_minutes:s.transfer_minutes}));
 const lot=mode==='drive'?chooseParking(plan):null;
 const mixed=plan.side==='US'&&pinStops.some(s=>['maid','prospect'].includes(s.id))&&pinStops.some(s=>['goat','cave'].includes(s.id));
 const w=plan.side==='CA'&&pinStops.some(s=>s.id==='cruise')&&pinStops.some(s=>['table','journey'].includes(s.id));
 const cost=lot?parkingRate(lot,plan.visit_local_date):null;
 const notes=[];
 if(mode==='drive'){
  notes.push('Park once if your mobility and time allow; the displayed stop transfers are estimated planning allowances, not verified pedestrian directions.');
  notes.push('Allow approximately 20 additional minutes for finding parking and reaching your first stop. This pre-visit allowance is NOT included in the itinerary clock.');
  if(mixed)notes.push('This route spans Prospect Point and Goat Island. The park trolley may reduce walking, but its waiting time and timetable are not included; check the operator before depending on it.');
  if(w)notes.push('This route spans Table Rock and the Canadian cruise entrance near Clifton Hill. Consider the WEGO Green Line; the map does not assume bus arrival or transfer times.');
 }else if(mode==='transit'){
  notes.push('Use published transport stops as a starting point, not a guaranteed departure; live arrivals are not integrated.');
  notes.push(plan.side==='CA'?'WEGO 24-hour passes are CAD $16 adult (13+) and $12 child (3–12), unless your attraction pass already covers it. Do not buy a duplicate pass.':'New York State Park Scenic Trolley operates on a seasonal published schedule with separate fares; check availability for this date.');
 }else{
  notes.push('The stop order is designed around park paths. Transfer times remain estimates; use live pedestrian navigation for actual paths.');
 }
 notes.push('Map markers indicate entrances/locations. The dotted connectors show visit ORDER ONLY, never a walkable route or border-crossing instruction.');
 const main=lot?'Start at '+lot.name+'; then follow the first stop on the map.':mode==='transit'?'Check '+transit.transport_name+' service and start from your first planned attraction.':'Begin at the first stop; map directions will show the walkable route.';
 return {version:2,mode,side:plan.side,comparison:compareArrival(plan,{...visitor,mode}),parking:lot?{...lot,price_note:cost}:null,first_action:main,transport:{...transit},route_stops:pinStops,notes,view_of_falls:plan.side==='US'?'New York: close views of the American and Horseshoe Falls from parkland paths.':'Ontario: the full face of the falls from the Niagara Parkway plus the Horseshoe brink.'};
}
module.exports={STOPS,PARKING,parkingRate,chooseParking,wayfinding};
