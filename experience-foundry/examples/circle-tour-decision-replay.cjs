'use strict';
// Identical dated fixtures exercise the captured baseline and candidate, without network.
// Scope: pure decision helper and source/DOM invariants; Chromium tests the actual journey.
const fs=require('node:fs'),path=require('node:path');
const index=process.argv.indexOf('--source-root');
if(index<0||!process.argv[index+1])throw Error('Expected --source-root');
const root=process.argv[index+1];
const bridge=require(path.join(root,'public/assets/circle-tour-bridge.js'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/assets/circle-tour-tool-catalog.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'public/lake-superior-circle-tour/index.html'),'utf8');
const core=fs.readFileSync(path.join(root,'public/assets/lake-superior-circle-tour-core.js'),'utf8');
const decide=typeof bridge.planNextDecision==='function'?bridge.planNextDecision:null;
const chosen=(inputs)=>decide?decide(catalog,inputs):null;
const cases=[];
function record(id,passed,observed){cases.push({id,passed:!!passed,observed});}
const trip=chosen({selectedIds:['11','15','18'],theme:'water',date:'2027-07-18'});
record('trip-one-next-check',trip?.kind==='next-check'&&trip.stopId==='11'&&trip.primary?.toolId==='pictured-rocks'
  &&trip.nextStopId==='15'&&trip.position===1&&trip.total===3&&trip.primary.caveat.length>12,
  'Pictured Rocks summer selection: '+JSON.stringify(trip?{kind:trip.kind,stop:trip.stopId,tool:trip.primary?.toolId,next:trip.nextStopId,position:trip.position,total:trip.total}:'No stop-specific decision model exported.'));
const clockwise=chosen({selectedIds:['11','15','18'],itinerary:'10',direction:'clockwise',theme:'parks',date:'2027-07-18'});
record('applied-direction-progression',clockwise?.stopId==='18'&&clockwise?.nextStopId==='15'
  &&clockwise?.direction==='clockwise'&&clockwise?.orderedStops.join(',')==='18,15,11',
  'Applied clockwise ten-day route: '+JSON.stringify(clockwise?{stop:clockwise.stopId,next:clockwise.nextStopId,order:clockwise.orderedStops}:'No route stepper available.'));
const missing=chosen({selectedIds:['11','15'],focusStop:'11',theme:'ships',date:'2027-07-18'});
record('honest-empty-next-action',missing?.kind==='no-specialist'&&missing?.primary===null
  &&missing?.otherThemesAvailable===true&&missing?.stopId==='11',
  'Unserved ships interest at Pictured Rocks: '+JSON.stringify(missing?{kind:missing.kind,alternative:missing.otherThemesAvailable,stop:missing.stopId}:'No explicit stop-specific gap.'));
const winter=chosen({selectedIds:['18'],focusStop:'18',theme:'parks',date:'2027-02-20'});
record('season-evidence-progress',winter?.primary?.toolId==='pukaskwa-national-park'
  &&winter?.primary?.inSeason===false&&winter?.date==='2027-02-20',
  'Pukaskwa February visit: '+JSON.stringify(winter?{tool:winter.primary?.toolId,inSeason:winter.primary?.inSeason,date:winter.date}:'No evidenced seasonal decision state.'));
const focusedOut=chosen({selectedIds:['15','18'],focusStop:'11',theme:'water'});
record('explicit-stop-not-in-plan',focusedOut?.stopId==='11'&&focusedOut?.inSavedTrip===false
  &&focusedOut?.source==='explicit-stop'&&focusedOut?.nextStopId==='',
  'External stop focus with a separate saved itinerary: '+JSON.stringify(focusedOut?{stop:focusedOut.stopId,inTrip:focusedOut.inSavedTrip,next:focusedOut.nextStopId}:'No route-aware focus state.'));
const pictured=bridge.rankConnections(catalog,{selectedIds:['11'],theme:'water'});
record('preserve-specialist-canonical',pictured.items.some(item=>item.toolId==='pictured-rocks'
  &&item.url==='https://picturedrocks.chrisizworski.com/')&&bridge.safeToolUrl('https://unsafe.example/hidden')==='',
  'Independent Pictured Rocks canonical and foreign-host rejection are unchanged.');
record('preserve-both-border-road-sources',bridge.roadChecks(catalog,{scope:['13']}).map(x=>x.region).join(',')==='mi,on'
  &&bridge.roadChecks(catalog,{scope:['21']}).map(x=>x.region).join(',')==='on,mn',
  'Sault has MI+ON and Pigeon River has ON+MN official highway-source handoffs.');
const before='https://chrisizworski.com/lake-superior-circle-tour/?plan=11%2C15&itinerary=10&direction=clockwise';
const after=new URL(bridge.buildReturnHref(before,{focusStop:'15',date:'2027-07-18',theme:'parks'}));
record('preserve-return-link',after.searchParams.get('plan')==='11,15'
  &&after.searchParams.get('direction')==='clockwise'&&after.searchParams.get('ctStop')==='15'
  &&after.searchParams.get('ctDate')==='2027-07-18',
  'The existing trip ID list, preset and direction survive the share URL with namespaced context.');
record('preserve-original-planner', (html.match(/class="stop-card"/g)||[]).length===31
  &&html.includes('<link rel="canonical" href="https://chrisizworski.com/lake-superior-circle-tour/">')
  &&html.includes('id="ctb-fallback"')&&core.includes('circle-tour:trip-change')
  &&core.includes('circle-tour:preset-change'),
  'All 31 original cards, one canonical and the independent core event interface remain present.');
console.log(JSON.stringify({cases}));
