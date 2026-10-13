'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const v5=require('../public/assets/pictured-rocks-v5.js');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const css=fs.readFileSync('public/assets/pictured-rocks-v5.css','utf8');
const map=fs.readFileSync('public/assets/pictured-rocks-planner-v3.js','utf8');
const canonical=fs.readFileSync('middleware.ts','utf8');
const today='2026-10-13';

test('published October 2026 slot is schedule evidence, never claimed as a booking',()=>{
 const r=v5.cruiseTruth('2026-10-14',today);
 assert.equal(r.code,'PUBLISHED_NOT_BOOKED');
 assert.deepEqual(r.slots.map(x=>x.time),['10:00','11:00','13:00','14:00','15:30','17:15']);
 assert.ok(r.label.includes('NOT seat availability'));
 assert.equal(r.source,'https://picturedrocks.com/fares-schedule/');
});
test('same-day unspecific departure never invents a fixed itinerary time',()=>{
 const r=v5.commitment('2026-10-13','',today);
 assert.equal(r.code,'DEPARTURE_NEEDED');
 assert.equal(r.slot,null);
});
test('a chosen source-published 2026 boat slot is not a confirmed seat',()=>{
 const r=v5.commitment('2026-10-15','13:00',today);
 assert.equal(r.code,'SCHEDULE_SELECTED_NOT_BOOKED');
 assert.equal(r.checkIn,'12:15');
 assert.equal(r.returnEstimate,'15:00');
 assert.equal(r.adultFare,56);
 assert.equal(r.childFare,19);
 assert.equal(r.infantFare,1);
});
test('invalid or unpublished departures are refused instead of invented',()=>{
 assert.equal(v5.commitment('2026-10-15','09:00',today).code,'DEPARTURE_NEEDED');
 assert.equal(v5.commitment('2026-11-01','10:00',today).code,'SEASON_ENDED');
 assert.equal(v5.commitment('2027-07-02','10:00',today).code,'TIMETABLE_UNVERIFIED');
 assert.equal(v5.commitment('2026-10-12','10:00',today).code,'PAST_DATE');
 assert.equal(v5.commitment('2026-02-30','10:00',today).code,'DATE_REQUIRED');
});
test('Detroit local date does not shift to UTC or browser timezone',()=>{
 assert.equal(v5.todayDetroit(new Date('2026-10-13T02:30:00Z')),'2026-10-12');
 assert.equal(v5.todayDetroit(new Date('2026-10-13T15:30:00Z')),'2026-10-13');
});
test('V5 UI is progressive, responsive and preserves noindex lab with one canonical host',()=>{
 assert.match(html,/id="tripDate" name="tripDate" type="date"/);
 assert.match(html,/id="tourDeparture" name="tourDeparture"/);
 assert.match(html,/id="v5ScheduleState" role="status"/);
 assert.match(html,/pictured-rocks-v5\.css\?v=/);
 assert.match(html,/pictured-rocks-v5\.js\?v=/);
 assert.match(html,/meta name="robots" content="noindex,nofollow"/);
 assert.match(html,/rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/"/);
 assert.match(canonical,/PICTURED_ROCKS_HOST = 'picturedrocks\.chrisizworski\.com'/);
 assert.match(css,/@media\(max-width:560px\)/);
});
test('no keyed or blocked basemap dependency and NPS fallback remain',()=>{
 assert.doesNotMatch(map,/basemaps\.cartocdn\.com[^']+\?key=/);
 assert.match(map,/rastertiles\/voyager/);
 assert.match(map,/tileerror/);
 assert.match(map,/official NPS map/);
});
test('tour answers carry operator, time, fares, source and no false claims',()=>{
 assert.match(html,/100 City Park Drive/);
 assert.match(html,/30–45 minutes/);
 assert.match(html,/2026 Spray Falls adult fare is \$56/);
 assert.match(html,/published times are not seat inventory/i);
 assert.match(html,/Recreational kayaks and canoes should not be used/);
 assert.match(html,/10\.5-mile Chapel Loop/);
 const v5script=fs.readFileSync('public/assets/pictured-rocks-v5.js','utf8');
 assert.match(v5script,/NOT a ticket or confirmed departure/);
 assert.match(v5script,/No verified date-specific published departure list/);
 assert.match(v5script,/NOT seat availability/);
});
