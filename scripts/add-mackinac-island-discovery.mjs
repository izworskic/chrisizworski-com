import fs from "node:fs";
const file="public/sitemap.xml";let xml=fs.readFileSync(file,"utf8");const loc="<loc>https://chrisizworski.com/mackinac-island/ferry-planner/</loc>";
if(!xml.includes(loc))throw Error("Missing ferry entry");
xml=xml.replace(/<url>[\s\S]*?<\/url>/g,block=>block.includes("https://chrisizworski.com/mackinac-island/")&&!block.includes(loc)?"":block);fs.writeFileSync(file,xml);
console.log("Mackinac discovery: ferry only.");
