/* A place to begin: seasonal editorial notes plus the existing Michigan station data. */
(function(root){
'use strict';
var seasons={
 winter:{label:'December – February',title:'The garden is quiet. The dreaming begins.',copy:'Pull out the seed packets, remember what you loved last year, and make a little room for something new. The next garden often begins at the kitchen table.',image:'seed-packets.webp',alt:'Seed packets arranged on a table',links:[['Plan seed starting','/seed-starting-guide/'],['Find a variety to grow','/heirloom-variety-matchmaker/']]},
 spring:{label:'March – May',title:'The first green things are worth the wait.',copy:'Some mornings feel like planting weather; others remind us this is Michigan. Start with the soil, watch the forecast, and give tender seedlings time to get ready.',image:'seedlings.webp',alt:'Vegetable seedlings growing under lights',links:[['Check the soil','/michigan-soil-temperature/'],['Explore local frost dates','/michigan-frost-dates/']]},
 summer:{label:'June – August',title:'The garden is finding its stride.',copy:'There is a lot to notice now: flowers opening, tomatoes filling out, and an empty patch that might become another crop. Take a look around before deciding what comes next.',image:'garden-beds.webp',alt:'Raised garden beds with flowers and vegetables',links:[['Find your planting calendar','/zone-6a-planting-calendar/'],['Explore companion planting','/companion-planting-zone-6a/']]},
 fall:{label:'September – November',title:'Gather what is ready. Make room for what’s next.',copy:'Bring in the harvest, save a few seeds, and keep an eye on the forecast. When the time is right, tuck garlic into the soil for next summer.',image:'garden-harvest.webp',alt:'Flower bulbs set into garden soil',links:[['Plan your garlic','/national-tools/planting/garlic/'],['Should I cover my plants?','/national-tools/frost/cover-plants-tonight/']]}
};
function mount(o){
 var get=function(id){return document.getElementById(id)},current=root.GardenYear.seasonForMonth(Number(o.today.iso.slice(5,7))),selected=current,place=null;
 var buttons=Array.prototype.slice.call(document.querySelectorAll('[data-welcome-season]'));
 var form=get('welcomePlaceForm'),input=get('welcomePlace'),status=get('welcomePlaceStatus');
 get('welcomeSeasons').hidden=false;form.hidden=false;
 function paint(){
  var s=seasons[selected];buttons.forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-welcome-season')===selected))});
  get('welcomeSeasonLabel').textContent=s.label+(selected===current?' · Your current season':' · Exploring the year');
  get('welcomeSeasonTitle').textContent=s.title;get('welcomeSeasonCopy').textContent=s.copy;
  var img=get('welcomeImage');img.src='/assets/garden-notebook/'+s.image;img.alt=s.alt;
  var links=get('welcomeLinks');links.replaceChildren.apply(links,s.links.map(function(x){var a=document.createElement('a');a.href=x[1]+(x[1]==='/michigan-soil-temperature/'&&place?'?place='+encodeURIComponent(place.zip||place.label):'');a.textContent=x[0]+' →';return a}));
  if(place){var st=place.station,fall=o.engine.frostOf(st).fallText;get('welcomeLocal').textContent=selected==='fall'?(fall?'Near '+st.n+', the station’s typical first fall frost is '+fall+'.':'No typical fall frost date is published for the '+st.n+' station.'):'Near '+st.n+', the spring frost reference is '+st.p25+'; about one spring in four still freezes on or after that date.';get('welcomeSoil').href='/michigan-soil-temperature/?place='+encodeURIComponent(place.zip||place.label)}
 }
 buttons.forEach(function(b){b.addEventListener('click',function(){selected=b.getAttribute('data-welcome-season');paint()})});
 function apply(){var value=input.value.trim();if(!value){status.textContent='Enter a Michigan town or ZIP first.';return}if(!o.onPlace(value)){status.textContent='We could not find that Michigan town or ZIP. Try a nearby town.';return}status.textContent='Showing the nearest frost station for '+value+'.'}
 get('welcomeApply').addEventListener('click',apply);input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();apply()}});
 paint();return {render:function(p){place=p;input.value=p.zip||p.label;paint()}};
}
root.GardenWelcome={mount:mount};
})(window);
