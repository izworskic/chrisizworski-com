/*
 * Spatial shortlist for endpoint junction clustering. The final join test
 * stays the original exact haversine distance; grid cells only eliminate
 * impossible comparisons. This does NOT connect crossings or trail interiors.
 *
 * Determinism matters: the caller still visits pairs in exactly the original
 * i-ascending, j-ascending order, so UnionFind representative junction IDs
 * and selected map dots remain unchanged for identical official DNR geometry.
 */
const METERS_PER_DEGREE_CONSERVATIVE = 110000;
const CELL_DEGREES = 20 / METERS_PER_DEGREE_CONSERVATIVE;

function cellKey(x,y){return x+':'+y;}
const toCell = value => Math.floor(value / CELL_DEGREES);

/** Returns candidate j > i that might fall within toleranceMeters.
 * A conservative lat/lon envelope avoids false negatives. At polar latitude
 * or on the date line, use the original exhaustive scan instead.
 */
export function nearbyEndpointPairs(endpoints,toleranceMeters=20){
  if(!Array.isArray(endpoints)||!Number.isFinite(toleranceMeters)||toleranceMeters<=0)throw Error('Invalid trail endpoints or snap tolerance');
  const cells=new Map();
  const positions=endpoints.map(p=>{
    if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return null;
    const x=toCell(p[0]),y=toCell(p[1]),key=cellKey(x,y);
    if(!cells.has(key))cells.set(key,[]);
    return {x,y,key};
  });
  positions.forEach((pos,i)=>{if(pos)cells.get(pos.key).push(i);});
  const latRadius=toleranceMeters/METERS_PER_DEGREE_CONSERVATIVE;
  const latSteps=Math.ceil(latRadius/CELL_DEGREES)+1;
  return function candidates(i){
    const p=endpoints[i],pos=positions[i];if(!pos)return [];
    // Exhaustive candidate pass where projection bounds are unreliable.
    if(Math.abs(p[1])>=70 || Math.abs(p[0])>179)return Array.from({length:endpoints.length-i-1},(_,k)=>i+k+1);
    const highLatitude=Math.abs(p[1])+latRadius;
    const cos=Math.cos(highLatitude*Math.PI/180);
    const lonRadius=toleranceMeters/(METERS_PER_DEGREE_CONSERVATIVE*cos);
    const lonSteps=Math.ceil(lonRadius/CELL_DEGREES)+1;
    const result=[];
    for(let dy=-latSteps;dy<=latSteps;dy++){
      for(let dx=-lonSteps;dx<=lonSteps;dx++){
        const bucket=cells.get(cellKey(pos.x+dx,pos.y+dy));
        if(bucket)for(const j of bucket)if(j>i)result.push(j);
      }
    }
    // Original pair iteration order is part of stable node-ID contract.
    return result.sort((a,b)=>a-b);
  };
}
