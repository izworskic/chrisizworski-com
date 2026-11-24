"""One-time research only. Bounded remote parquet inspection, never a live feed."""
import hashlib
import io
import json
import math
import os
import re
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone

URL = "https://ocmgeodatastor1.blob.core.windows.net/marinecadastre/ais2024/ais-2024-09-01.parquet"
CAP = 24 * 1024 * 1024
MAX_CALLS = 48
SITES = {"soo": (46.45, -84.50, 46.52, -84.25), "duluth": (46.73, -92.15, 46.85, -91.95)}
START = datetime(2024, 9, 1, tzinfo=timezone.utc)
END = datetime(2024, 9, 2, tzinfo=timezone.utc)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError("redirect rejected")

class RangeReader(io.RawIOBase):
    def __init__(self):
        super().__init__()
        self.opener = urllib.request.build_opener(NoRedirect())
        with self.opener.open(urllib.request.Request(URL, method="HEAD", headers={"Accept-Encoding": "identity"}), timeout=15) as response:
            self.size = int(response.headers["Content-Length"])
            self.etag = response.headers["ETag"]
        if not 12 <= self.size <= 350 * 1024 * 1024 or not self.etag:
            raise ValueError("invalid object metadata")
        self.pos = self.transferred = self.calls = 0
        self.digest = hashlib.sha256()
    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos
    def seek(self, offset, whence=0):
        target = {0: 0, 1: self.pos, 2: self.size}[whence] + offset
        if not 0 <= target <= self.size:
            raise ValueError("seek outside object")
        self.pos = target
        return target
    def readinto(self, buffer):
        n = min(len(buffer), self.size - self.pos)
        if not n:
            return 0
        if n > CAP - self.transferred or self.calls >= MAX_CALLS:
            raise ValueError("range budget exceeded")
        first, last = self.pos, self.pos + n - 1
        req = urllib.request.Request(URL, headers={"Range": f"bytes={first}-{last}", "If-Match": self.etag, "Accept-Encoding": "identity"})
        self.calls += 1
        with self.opener.open(req, timeout=20) as response:
            if response.status != 206 or response.headers.get("Content-Range") != f"bytes {first}-{last}/{self.size}" or response.headers.get("ETag") != self.etag or response.headers.get("Content-Encoding", "identity") != "identity":
                raise ValueError("range or object identity not verified")
            raw = response.read(n + 1)
        if len(raw) != n:
            raise ValueError("incomplete or oversized range")
        self.transferred += n
        self.digest.update(f"{first}:{last}:".encode("ascii"))
        self.digest.update(raw)
        buffer[:n] = raw
        self.pos += n
        return n

def overlap(bounds, box):
    s,w,n,e = box
    lo_lat,lo_lon,hi_lat,hi_lon = bounds
    return lo_lat <= n and hi_lat >= s and lo_lon <= e and hi_lon >= w

def bounds_for(group, paths):
    stats = {}
    for i in range(group.num_columns):
        col = group.column(i)
        if col.path_in_schema in paths:
            v = col.statistics
            if v is None or not v.has_min_max:
                return None
            try:
                lo, hi = float(v.min), float(v.max)
            except (ValueError, TypeError):
                return None
            if not math.isfinite(lo) or not math.isfinite(hi) or lo > hi:
                return None
            stats[col.path_in_schema] = (lo,hi)
    if set(stats) != set(paths):
        return None
    if len(paths)==2:
        lat,lon = (stats[p] for p in paths)
        return lat[0],lon[0],lat[1],lon[1]
    xmin,ymin,xmax,ymax = (stats[p] for p in paths)
    return ymin[0],xmin[0],ymax[1],xmax[1]

def main():
    import pyarrow.parquet as pq
    import pyarrow
    raw = RangeReader()
    report = {"kind":"NOAA_GEOPARQUET_RANGE_COVERAGE_ONLY","source":URL,"objectBytes":raw.size,"etag":raw.etag,"rangeBudgetBytes":CAP,"pyarrowVersion":pyarrow.__version__,"date":"2024-09-01","sites":{k:{"box":v,"validRows":0,"distinctVessels":0,"adjacentPairs":0,"gapsOverFiveMinutes":0} for k,v in SITES.items()},"receiptTimesAvailable":False,"independentCrossingLabels":0,"fieldAccuracyVerified":False,"productionCalibrationAuthorized":False}
    try:
        reader = pq.ParquetFile(io.BufferedReader(raw), pre_buffer=False)
        meta = reader.metadata
        names = reader.schema_arrow.names
        report.update(schema=[{"name":f.name,"type":str(f.type)} for f in reader.schema_arrow],rowGroups=meta.num_row_groups,objectRows=meta.num_rows)
        cols = {n.lower():n for n in names}
        geo = json.loads((meta.metadata or {}).get(b"geo",b"{}"))
        report["geoVersion"] = geo.get("version")
        primary = geo.get("primary_column")
        if primary not in names:
            raise ValueError("geometry metadata absent")
        gcol = geo.get("columns",{}).get(primary,{})
        report["geometryEncoding"] = gcol.get("encoding")
        report["geometryTypes"] = gcol.get("geometry_types")
        # NOAA declares WGS84. Require explicit numeric lat/lon or GeoParquet covering statistics.
        lat,lon = cols.get("lat") or cols.get("latitude"),cols.get("lon") or cols.get("longitude")
        paths = [lat,lon] if lat and lon else None
        if not paths:
            covering=gcol.get("covering",{}).get("bbox",{})
            if all(isinstance(covering.get(k),list) and covering[k] for k in ("xmin","ymin","xmax","ymax")):
                paths=[".".join(covering[k]) for k in ("xmin","ymin","xmax","ymax")]
        if not paths:
            report["status"]="NO_VERIFIED_SPATIAL_PRUNING"
            return report
        report["pruningPaths"]=paths
        chosen=[]
        unknown=0
        for i in range(meta.num_row_groups):
            bounds=bounds_for(meta.row_group(i),paths)
            if bounds is None:
                unknown+=1
            elif any(overlap(bounds,box) for box in SITES.values()):
                chosen.append(i)
        report.update(candidateRowGroups=len(chosen),unknownRowGroups=unknown)
        if unknown:
            report["status"]="INCOMPLETE_SPATIAL_STATISTICS"
            return report
        if not lat or not lon:
            report["status"]="WKB_ONLY_REQUIRES_REVIEWED_DECODER"
            return report
        mmsi=cols.get("mmsi")
        stamp=cols.get("basedatetime") or cols.get("time") or cols.get("timestamp")
        if not mmsi or not stamp:
            report["status"]="UNRECOGNIZED_ID_TIME_SCHEMA"
            return report
        selected=[mmsi,stamp,lat,lon]
        by_site={k:defaultdict(set) for k in SITES}
        for i in chosen:
            rg=meta.row_group(i)
            nbytes=sum(rg.column(j).total_uncompressed_size for j in range(rg.num_columns) if rg.column(j).path_in_schema in selected)
            if rg.num_rows>1000000 or nbytes>64*1024*1024:
                raise ValueError("row group exceeds memory limit")
            for batch in reader.iter_batches(batch_size=32768,row_groups=[i],columns=selected,use_threads=False):
                data=batch.to_pydict()
                for identity,t,y,x in zip(*(data[k] for k in selected)):
                    if not isinstance(t,datetime) or t.tzinfo is None or not START<=t.astimezone(timezone.utc)<END:
                        continue
                    if not re.fullmatch(r"\d{9}",str(identity)) or not isinstance(y,(int,float)) or not isinstance(x,(int,float)) or not math.isfinite(y) or not math.isfinite(x):
                        continue
                    for site,(s,w,n,e) in SITES.items():
                        if s<=y<=n and w<=x<=e:
                            by_site[site][str(identity)].add(t.isoformat())
        for site,observations in by_site.items():
            pairs=gaps=0
            for stamps in observations.values():
                ordered=sorted(datetime.fromisoformat(t) for t in stamps)
                for a,b in zip(ordered,ordered[1:]):
                    pairs+=1
                    gaps+=(b-a).total_seconds()>300
            report["sites"][site].update(validRows=sum(map(len,observations.values())),distinctVessels=len(observations),adjacentPairs=pairs,gapsOverFiveMinutes=gaps)
        report["status"]="COVERAGE_ONLY"
    except Exception as exc:
        # Only error type, no upstream content or raw records.
        report["status"]="BOUNDED_PROBE_UNAVAILABLE"
        report["errorClass"]=type(exc).__name__
        if str(exc) in ("range budget exceeded","row group exceeds memory limit","range or object identity not verified","geometry metadata absent"):
            report["reason"]=str(exc)
    finally:
        report.update(rangeBytesRead=raw.transferred,rangeRequests=raw.calls,rangeReceiptSha256=raw.digest.hexdigest())
    return report

if __name__=="__main__":
    report=main()
    print(json.dumps(report,sort_keys=True))
    with open(os.environ["NOAA_REPORT"],"x",encoding="utf-8") as f:
        json.dump(report,f,indent=2,sort_keys=True)
