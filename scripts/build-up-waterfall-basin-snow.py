"""Opt-in offline watershed snow compiler. Produces research candidates, not public values."""
import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path

STATIONS = {"USGS-04045500":790, "USGS-04031000":200, "USGS-04032150":358}
BASIN_BASE = "https://api.water.usgs.gov/nldi/linked-data/nwissite/"
BASIN_QUERY = "/basin?f=json&simplified=false&splitCatchment=true"
ARCHIVE = "https://noaadata.apps.nsidc.org/NOAA/G02158/"
# Original integer values converted to mm water equivalent.
PRODUCTS = {"swe":("1034",1.0), "melt":("1044",0.01),
            "liquid":("1025SIL00",0.1), "solid":("1025SIL01",0.1)}
SQMI = 2589988.110336

def checked_file(item, base):
    p = (base / item["file"]).resolve()
    with p.open("rb") as f:
        digest = hashlib.file_digest(f,"sha256").hexdigest()
    if digest != item["sha256"]:
        raise ValueError("input hash mismatch")
    return p

def source_date(value, as_of):
    day = dt.date.fromisoformat(value)
    if day.isoformat()!=value or not dt.date(2019,10,11)<=day<=as_of:
        raise ValueError("unsupported or future source date")
    return day

def basin_geometry(path, expected_sqmi):
    from shapely.geometry import shape
    from shapely.ops import transform, unary_union
    from pyproj import Transformer
    data=json.loads(path.read_text())
    if data.get("type")!="FeatureCollection" or not data.get("features"):
        raise ValueError("missing USGS basin")
    if data.get("crs") not in (None,{"type":"name","properties":{"name":"urn:ogc:def:crs:OGC:1.3:CRS84"}}):
        raise ValueError("unexpected basin CRS")
    gs=[shape(f["geometry"]) for f in data["features"]]
    if any(g.geom_type not in ("Polygon","MultiPolygon") or not g.is_valid or g.is_empty for g in gs):
        raise ValueError("invalid basin geometry")
    ll=unary_union(gs)
    if not (-93<ll.bounds[0]<ll.bounds[2]<-81 and 44<ll.bounds[1]<ll.bounds[3]<49):
        raise ValueError("basin outside regional bounds")
    equal=transform(Transformer.from_crs(4326,5070,always_xy=True).transform,ll)
    if abs(equal.area/SQMI-expected_sqmi)>.10*expected_sqmi:
        raise ValueError("drainage area mismatch exceeding 10 percent")
    return equal

def summarize_raster(path, basin, factor):
    """Equal-area native pixel overlap; no interpolation or missing-to-zero conversion."""
    import numpy as np
    import rasterio
    from rasterio.windows import from_bounds, Window
    from shapely.geometry import Polygon
    from shapely.ops import transform
    from pyproj import Transformer
    if basin.is_empty or not basin.is_valid or basin.area<=0 or factor<=0:
        raise ValueError("invalid aggregation inputs")
    with rasterio.open(path) as src:
        if src.count!=1 or src.crs is None or src.nodata is None:
            raise ValueError("single band, CRS and nodata required")
        if src.scales!=(1.0,) or src.offsets!=(0.0,) or src.dtypes[0] not in ("int16","int32"):
            raise ValueError("expected original unscaled integer SNODAS values")
        if src.transform.b or src.transform.d or src.transform.a<=0 or src.transform.e>=0:
            raise ValueError("north-up raster required")
        to_grid=Transformer.from_crs(5070,src.crs,always_xy=True).transform
        to_equal=Transformer.from_crs(src.crs,5070,always_xy=True).transform
        w=from_bounds(*transform(to_grid,basin).bounds,transform=src.transform)
        r0=max(0,math.floor(w.row_off)-1)
        c0=max(0,math.floor(w.col_off)-1)
        r1=min(src.height,math.ceil(w.row_off+w.height)+1)
        c1=min(src.width,math.ceil(w.col_off+w.width)+1)
        if r1<=r0 or c1<=c0:
            return {"status":"UNAVAILABLE","coverage":0,"reason":"No raster overlap"}
        if (r1-r0)*(c1-c0)>1000000:
            raise ValueError("unexpected raster resolution")
        values=src.read(1,window=Window(c0,r0,c1-c0,r1-r0),masked=True)
        masks=np.ma.getmaskarray(values)
        total=weighted=0.0
        for i in range(r1-r0):
            for j in range(c1-c0):
                if masks[i,j]:
                    continue
                raw=int(values[i,j])
                if raw<0 or raw>=32767:
                    continue
                r,c=r0+i,c0+j
                cell=Polygon([src.transform*p for p in ((c,r),(c+1,r),(c+1,r+1),(c,r+1))])
                area=basin.intersection(transform(to_equal,cell)).area
                total+=area
                weighted+=area*raw*factor
        coverage=total/basin.area
        if coverage>1.001:
            raise ValueError("overlapping raster area")
        if coverage<.95 or total<=0:
            return {"status":"UNAVAILABLE","coverage":round(coverage,5),"reason":"Less than 95 percent valid basin coverage"}
        return {"status":"AVAILABLE","coverage":round(min(coverage,1),5),"mm":round(weighted/total,3)}

def compile_candidate(manifest,base,as_of):
    day=source_date(manifest["day"],as_of)
    accessed=dt.date.fromisoformat(manifest["accessed"])
    if not day<=accessed<=as_of or manifest.get("reviewedOriginalValues") is not True:
        raise ValueError("manual source and conversion review required")
    basins,products=manifest["basins"],manifest["products"]
    if set(basins)-set(STATIONS) or set(products)-set(PRODUCTS):
        raise ValueError("unknown station or product")
    out={"schemaVersion":1,"status":"CANDIDATE","day":day.isoformat(),"accessed":accessed.isoformat(),"stations":[]}
    for station,area in STATIONS.items():
        row={"id":station,"products":{}}
        out["stations"].append(row)
        if station not in basins:
            row["reason"]="No reviewed basin input"
            continue
        b=basins[station]
        if b["source"]!=BASIN_BASE+station+BASIN_QUERY:
            raise ValueError("unapproved basin URL")
        geometry=basin_geometry(checked_file(b,base),area)
        row["basin"]={"source":b["source"],"sha256":b["sha256"],"areaSqMi":round(geometry.area/SQMI,2)}
        for key,(code,factor) in PRODUCTS.items():
            if key not in products:
                continue
            p=products[key]
            original=p["originalMember"]
            if not p["source"].startswith(ARCHIVE) or not original.endswith(".dat"):
                raise ValueError("unapproved archive source")
            if code not in original or day.strftime("%Y%m%d") not in original:
                raise ValueError("wrong original member product or day")
            if p["day"]!=day.isoformat() or p["encoding"]!="raw-snodas-integer":
                raise ValueError("wrong date or encoding")
            if key!="swe" and p.get("periodReviewed") is not True:
                raise ValueError("review 06 UTC flux interval before aggregation")
            result=summarize_raster(checked_file(p,base),geometry,factor)
            result.update({"source":p["source"],"originalMember":original,"sha256":p["sha256"]})
            row["products"][key]=result
    return out

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--manifest",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    p.add_argument("--as-of",default=dt.datetime.now(dt.timezone.utc).date().isoformat())
    a=p.parse_args()
    if a.output.exists():
        raise SystemExit("Refusing to overwrite a candidate")
    result=compile_candidate(json.loads(a.manifest.read_text()),a.manifest.parent,dt.date.fromisoformat(a.as_of))
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(result,indent=2,allow_nan=False)+"\n")

if __name__=="__main__":
    main()
