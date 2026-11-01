'use strict';
// Source-shape regression fixtures: minimal HTML reflecting the official KSC
// Crew-13, CRS-34, NG-24, Starlink and NROL-97 event-page structures.
// They intentionally do not copy article prose or constitute live inventory.
const test = require('node:test');
const assert = require('node:assert/strict');
const ksc = require('../lib/space-coast-ksc-viewing');

function venue(title, markup) {
  return '<section class="element well-block"><div class="well"><h2>' +
    title + '</h2>' + markup + '</div></section>';
}
function event(title, date, pad, sections) {
  return '<html><body><header class="event-header"><div class="event-header__content">' +
    '<h1 class="event-header__title">' + title + '</h1><p class="event-header__venue">' +
    pad + '</p><div class="event-header-dates__single-row"><span>NET</span>' +
    '<span>' + date + '</span><span>10:00am</span></div></div></header>' +
    sections + '</body></html>';
}
function mission(name, date, pad='Space Launch Complex 40') {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name,
    net: date, netPrecision: 'minute', pad,
    rocket: name.split('|')[0].trim(), provider: 'SpaceX'
  };
}

test('real KSC LC-39 Launch Transportation Ticket heading maps to Gantry', () => {
  const section = venue('LC-39 Launch Transportation Ticket', [
    '<h5>SOLD OUT</h5>',
    '<h6>$99 IN ADDITION TO ADMISSION</h6>',
    '<ul><li>Launch Transportation Ticket (LTT) required in addition to admission</li>',
    '<li>Check-in begins at 4;15 PM ET, and buses will begin boarding at 4:30 PM ET</li></ul>'
  ].join(''));
  const v = ksc.parseVenue(section);
  assert.equal(v.id, 'gantry');
  assert.equal(v.ticket, 'sold-out-on-page');
  assert.equal(v.status, 'sold-out-on-source');
  assert.equal(v.transport, 'ksc-controlled-bus');
  // The live publisher sometimes prints 4;15, not a valid 4:15 time:
  // do not silently repair typographical errors in a safety-sensitive arrival.
  assert.equal(v.checkInAt, null);
  assert.equal(v.busBoardingAt, '4:30 PM ET');
});

test('KSC Crew-13 Gantry combined check-in and boarding paragraph stays distinct', () => {
  const section = venue('The Gantry at LC-39 Launch Transportation Ticket', [
    '<h5>SOLD OUT</h5><ul>',
    '<li>Check-in begins at 9:00 AM ET, and buses will begin boarding at 9:15 AM ET</li>',
    '</ul>'
  ].join(''));
  const v = ksc.parseVenue(section);
  assert.equal(v.id, 'gantry');
  assert.equal(v.checkInAt, '9:00 AM ET');
  assert.equal(v.busBoardingAt, '9:15 AM ET');
});

test('Feel the Heat package times are read from paragraphs, not misassigned', () => {
  const section = venue('Feel the Heat Launch Viewing Package', [
    '<p>The Feel the Heat package includes bus transportation through NASA’s gates.</p>',
    '<p>Check-in for Feel the Heat begins at 9:45 PM; bus boarding begins at 10:00 PM at the bus boarding area.</p>'
  ].join(''));
  const v = ksc.parseVenue(section);
  assert.equal(v.id, 'feel-the-heat');
  assert.equal(v.ticket, 'package-listed');
  assert.equal(v.checkInAt, '9:45 PM ET');
  assert.equal(v.busBoardingAt, '10:00 PM ET');
  assert.equal(v.transport, 'ksc-controlled-bus');
});

test('Admission-included KSC Bus Tour venues retain their distinct access type', () => {
  const section = venue('The Gantry at LC-39', [
    '<h6>INCLUDED WITH ADMISSION TO THE VISITOR COMPLEX</h6>',
    '<ul><li>Accessible via the Kennedy Space Center Bus Tour on a first-come, first-served basis</li>',
    '<li>Launch viewing area opens at 9:45 AM</li>',
    '<li>If the launch has not occurred by 3:30 PM, the viewing area will close to all guests.</li></ul>'
  ].join(''));
  const v = ksc.parseVenue(section);
  assert.equal(v.id, 'gantry');
  assert.equal(v.transport, 'ksc-bus-tour');
  assert.equal(v.ticket, 'included-with-admission-listed');
  assert.equal(v.openingAt, '9:45 AM ET');
  assert.equal(v.closesAt, '3:30 PM ET');
});

test('a different pad name or unrelated heading cannot fabricate Gantry access', () => {
  assert.equal(ksc.venueId('Launch Complex 39A Transportation Ticket'), null);
  assert.equal(ksc.parseVenue(venue('Launch Complex 39B viewing', '<h6>INCLUDED</h6>')), null);
});

test('current official KSC CRS-34 event shape can match by mission, pad and published date', () => {
  const u='https://www.kennedyspacecenter.com/event/nasas-spacex-crs-34/';
  const section=venue('LC-39 Launch Transportation Ticket',
    '<h6>$99 IN ADDITION TO ADMISSION</h6><ul><li>Check-in begins at 4:15 PM</li><li>buses will begin boarding at 4:30 PM</li></ul>');
  const html=event("NASA's SpaceX CRS-34", 'May 15, 2026', 'Space Launch Complex 40', section);
  const l=mission('Falcon 9 Block 5 | SpaceX CRS-34', '2026-05-15T22:05:00Z');
  const parsed=ksc.parseEventPage(html,l,u,Date.parse('2026-05-12T14:00:00Z'));
  assert.equal(parsed.state,'matched');
  assert.equal(parsed.venues[0].id,'gantry');
  assert.equal(parsed.venues[0].checkInAt,'4:15 PM ET');
  assert.equal(parsed.venues[0].busBoardingAt,'4:30 PM ET');
  assert.equal(ksc.parseEventPage(html,{...l,pad:'Launch Complex 39A'},u,Date.parse('2026-05-12T14:00:00Z')).state,'unverified');
  assert.equal(ksc.parseEventPage(html,l,u,Date.parse('2026-11-01T14:00:00Z')).state,'unverified');
});

test('matched KSC listing still cannot turn unknown ticket inventory into confirmed availability', () => {
  const v=ksc.parseVenue(venue('LC-39 Launch Transportation Ticket',
    '<h6>$99 IN ADDITION TO ADMISSION</h6><p>Bus transportation through NASA’s gates.</p>'));
  assert.equal(v.ticket,'additional-ticket-listed');
  assert.equal(v.status,'listed-on-source');
  assert.match(v.note,/remaining tickets still require confirmation/);
});
