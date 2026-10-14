// Standalone Mackinac ferry product. The trip-hub pages are retired.
export const MACKINAC_HUB_VERSION="ferry-only-v3";
export const PRIMARY_NAV=Object.freeze([{id:"ferries",label:"Ferries",path:"/mackinac-island/ferry-planner/",decision:"Which crossing fits my family?"}]);
export const PRIMARY_GENERATED_SURFACES=Object.freeze([]);
export const SECONDARY_GOVERNED_SURFACES=Object.freeze(["ferry-planner"]);
export const navHtml=()=>'<nav class="mackinac-destination-nav" aria-label="Mackinac ferry navigation"><a href="/mackinac-island/ferry-planner/" aria-current="page">Ferry planner</a></nav>';
export const primaryUrlRows=()=>[["https://chrisizworski.com/mackinac-island/ferry-planner/","daily","0.9"]];
