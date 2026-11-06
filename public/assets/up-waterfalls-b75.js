(()=>{
'use strict';
const node=document.getElementById('b75-map');
if(!node)return;
const lat=Number(node.dataset.lat),lng=Number(node.dataset.lng);
const role=node.dataset.role||'natural-feature';
const label=node.dataset.label||'Mapped reference';
if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
if(typeof L==='undefined'){node.setAttribute('aria-label','Interactive map unavailable. Refer to the written, source-linked approach.');return;}
const map=L.map(node,{scrollWheelZoom:false,attributionControl:true}).setView([lat,lng],role==='preserve-centre'?12:14);
L.tileLayer('https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
 attribution:'&copy; OpenStreetMap contributors &copy; CARTO',subdomains:'abcd',maxZoom:18
}).addTo(map);
const marker=L.circleMarker([lat,lng],{radius:10,color:'#124b39',fillColor:'#d59a3c',weight:3,fillOpacity:1}).addTo(map);
const popup=document.createElement('div');const title=document.createElement('strong');
title.textContent=label;popup.appendChild(title);
const warning=document.createElement('p');
warning.textContent=role==='preserve-centre'?'OpenStreetMap mapped preserve centre. Small creek cascades are not individually surveyed. Not a trailhead or parking GPS.':'Independent natural-falls coordinate. This is NOT the tourism pull-off, parking, or a street-driving destination.';
popup.appendChild(warning);
const source=document.createElement('a');source.textContent='Map reference source';
source.href=node.dataset.source;source.rel='noopener noreferrer';source.target='_blank';popup.appendChild(source);
marker.bindPopup(popup);marker.openPopup();
})();
