import fs from "node:fs";
for(const s of ["plan","where-to-stay","dining","things-to-do","events","around-the-straits"])if(fs.existsSync("public/mackinac-island/"+s+"/index.html"))throw Error("Retired page recreated: "+s);
console.log("Retired Mackinac trip hub: nothing generated.");
