import fs from 'node:fs';

const sitemap='public/sitemap.xml';
if(fs.existsSync(sitemap)){
  let xml=fs.readFileSync(sitemap,'utf8');
  const loc='https://chrisizworski.com/mackinac-island/';
  if(!xml.includes(loc)){
    const row=`\n  <url><loc>${loc}</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
    xml=xml.replace(/\s*<\/urlset>\s*$/,`${row}</urlset>\n`);
    fs.writeFileSync(sitemap,xml);
  }
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
