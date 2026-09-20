import fs from 'node:fs';

const sitemap='public/sitemap.xml';
if(fs.existsSync(sitemap)){
  let xml=fs.readFileSync(sitemap,'utf8');
  const urls=[
    ['https://chrisizworski.com/mackinac-island/','daily','0.9'],
    ['https://chrisizworski.com/mackinac-island/day-trip/','weekly','0.85'],
    ['https://chrisizworski.com/mackinac-island/with-kids/','weekly','0.82'],
    ['https://chrisizworski.com/mackinac-island/2-day-itinerary/','weekly','0.82'],
    ['https://chrisizworski.com/mackinac-island/ferry-planner/','daily','0.86'],
    ['https://chrisizworski.com/mackinac-island/from-detroit/','weekly','0.80'],
    ['https://chrisizworski.com/mackinac-island/from-chicago/','weekly','0.80'],
    ['https://chrisizworski.com/mackinac-island/from-traverse-city/','weekly','0.80'],
    ['https://chrisizworski.com/mackinac-island/from-grand-rapids/','weekly','0.80'],
    ['https://chrisizworski.com/mackinac-island/limited-walking/','weekly','0.84'],
    ['https://chrisizworski.com/mackinac-island/bike-day/','weekly','0.84']
  ];
  for(const [loc,freq,priority] of urls){
    if(xml.includes('<loc>'+loc+'</loc>'))continue;
    const row='\n  <url><loc>'+loc+'</loc><changefreq>'+freq+'</changefreq><priority>'+priority+'</priority></url>\n';
    xml=xml.replace(/\s*<\/urlset>\s*$/,row+'</urlset>\n');
  }
  fs.writeFileSync(sitemap,xml);
}

const fall='public/fall-color/mackinac-island-fall-color/index.html';
if(fs.existsSync(fall)){
  let html=fs.readFileSync(fall,'utf8');
  const href='/mackinac-island/';
  if(!html.includes(href)){
    const needle='<h2>How to time your visit</h2>';
    const cta='<p class="card"><strong>Planning the island now?</strong> <a href="/mackinac-island/">Mackinac Island Live compares today’s ferry schedules, weather, biking conditions, crowds and a practical return time.</a></p>\n\n  ';
    if(html.includes(needle)) html=html.replace(needle,`${cta}${needle}`);
    fs.writeFileSync(fall,html);
  }
}
