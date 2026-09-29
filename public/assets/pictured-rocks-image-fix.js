(function(){
'use strict';

const REPLACEMENTS=[
  {
    selector:'img[alt="Miners Falls at Pictured Rocks National Lakeshore"]',
    src:'https://www.nps.gov/common/uploads/cropped_image/primary/3B0AF34C-BE68-F0E7-6563F1E4994BDBF6.jpg?mode=crop&quality=90&width=1600'
  },
  {
    selector:'img[alt="Grand Sable country at Pictured Rocks National Lakeshore"]',
    src:'https://www.nps.gov/common/uploads/cropped_image/primary/4EEC085A-9A7D-A4A0-267BAF178CF271DA.jpg?mode=crop&quality=90&width=1600'
  }
];

function apply(){
  let remaining=0;
  for(const item of REPLACEMENTS){
    const image=document.querySelector(item.selector);
    if(!image){remaining+=1;continue;}
    if(image.src!==item.src) image.src=item.src;
  }
  return remaining;
}

if(apply()===0)return;
const observer=new MutationObserver(()=>{
  if(apply()===0)observer.disconnect();
});
observer.observe(document.documentElement,{childList:true,subtree:true});
})();
