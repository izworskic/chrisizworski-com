#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const failures=[];
const data=JSON.parse(await readFile('benchmarks/circle-tour-rank-distribution.json','utf8'));
const dest=await readFile('public/lake-superior-circle-tour/index.html','utf8');
const gl=await readFile('public/great-lakes/index.html','utf8');
const lights=await readFile('public/great-lakes-lighthouses/index.html','utf8');
if (!dest.includes('Lake Superior Circle Tour Map: 7–15 Days')) failures.push('destination title drift');
if (!dest.includes('interactive 1,300-mile Lake Superior Circle Tour map')) failures.push('destination meta/first-answer drift');
if (!dest.includes('https://chrisizworski.com/lake-superior-circle-tour/')) failures.push('destination canonical drift');
if (!gl.includes('Lake Superior Circle Tour Map &amp; 7–15 Day Planner')) failures.push('Great Lakes authority anchor missing');
if (!gl.includes('7-, 10-, and 15-day itineraries')) failures.push('Great Lakes preset facts not corrected');
if (!lights.includes('Lake Superior Circle Tour map and 7–15 day planner')) failures.push('lighthouse contextual handoff missing');
if (data.destination.baseline.impressions !== 56 || data.destination.baseline.clicks !== 0 || data.destination.baseline.averagePosition !== 21.16) failures.push('baseline drift');
if (data.destination.target.averagePositionMax > 15) failures.push('rank target too weak');
if (failures.length) { console.error('Circle Tour rank distribution FAIL\n- '+failures.join('\n- ')); process.exit(1); }
console.log('Circle Tour rank distribution PASS — destination frozen, two contextual authority paths active');
