import fs from "node:fs";
import {ferryExperienceMarkup} from "./mackinac-ferry-experience.mjs";
const file="public/mackinac-island/ferry-planner/index.html";
if(!fs.existsSync(file)||!fs.readFileSync(file,"utf8").includes('id="ferry-form"')||!ferryExperienceMarkup().includes('id="ferry-form"'))throw Error("Ferry decision engine missing");
for(const s of ["day-trip","with-kids","2-day-itinerary","from-detroit","from-chicago","from-traverse-city","from-grand-rapids","limited-walking","bike-day","fall"])if(fs.existsSync("public/mackinac-island/"+s+"/index.html"))throw Error("Retired intent page recreated: "+s);
console.log("Preserving standalone ferry page; no itinerary pages generated.");
