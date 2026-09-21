export const MACKINAC_HUB_VERSION = "mackinac-hub-v2";

export const PRIMARY_NAV = Object.freeze([
  {id:"my-trip",label:"My Trip",path:"/mackinac-island/",decision:"What trip fits these travelers, dates and priorities?"},
  {id:"ferries",label:"Ferries",path:"/mackinac-island/ferry-planner/",decision:"Which mainland port and reachable ferry fit the trip?"},
  {id:"stay",label:"Stay",path:"/mackinac-island/where-to-stay/",decision:"What lodging style and location fit the trip?"},
  {id:"eat",label:"Eat",path:"/mackinac-island/dining/",decision:"What meal strategy and dining fit the itinerary?"},
  {id:"explore",label:"Explore",path:"/mackinac-island/things-to-do/",decision:"Which experiences deserve the visitor's limited Island time?"},
  {id:"events",label:"Events",path:"/mackinac-island/events/",decision:"Does an event change timing, crowds, lodging or the itinerary?"},
  {id:"straits",label:"Straits",path:"/mackinac-island/around-the-straits/",decision:"Should a mainland or Straits stop be added to the trip?"}
]);

export const PRIMARY_GENERATED_SURFACES = Object.freeze([
  "plan","where-to-stay","dining","things-to-do","events","around-the-straits"
]);

export const SECONDARY_GOVERNED_SURFACES = Object.freeze([
  "day-trip","with-kids","2-day-itinerary","ferry-planner",
  "from-detroit","from-chicago","from-traverse-city","from-grand-rapids",
  "limited-walking","bike-day","fall"
]);

export function navHtml(currentPath=""){
  return `<nav class="mackinac-destination-nav" aria-label="Mackinac Island trip hub">${PRIMARY_NAV.map(item=>{
    const current=currentPath===item.path?' aria-current="page"':'';
    return `<a data-mackinac-nav="${item.id}" href="${item.path}"${current}>${item.label}</a>`;
  }).join("")}</nav>`;
}

export function primaryUrlRows(){
  return PRIMARY_NAV.map((item,index)=>[
    "https://chrisizworski.com"+item.path,
    item.id==="my-trip"||item.id==="ferries"?"daily":"weekly",
    index<3?"0.9":"0.84"
  ]);
}
