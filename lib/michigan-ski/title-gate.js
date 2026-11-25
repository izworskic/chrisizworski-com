'use strict';
// Central pure gate for the indexable Michigan ski hub title.
function hubTitle(sourceCount){
 if(!Number.isInteger(sourceCount)||sourceCount<0)throw Error('Invalid official source count');
 return sourceCount>=10?'Michigan Ski Resorts Open Today: Lifts & Snow':
  'Michigan Ski Resorts 2026-27: Snow & Drive | Chris Izworski';
}
function titleCanClaimOpen(sourceCount){return sourceCount>=10;}
module.exports={hubTitle,titleCanClaimOpen};
