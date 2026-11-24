"""One-time research only. Bounded remote parquet inspection, never a live feed."""
import hashlib
import io
import json
import math
import os
import re
import struct
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone

URL = "https://ocmgeodatastor1.blob.core.windows.net/marinecadastre/ais2024/ais-2024-09-01.parquet"
CAP = 220 * 1024 * 1024
MAX_CALLS = 100
SITES = {"soo_local": (46.45, -84.50, 46.52, -84.25), "duluth_local": (46.73, -92.15, 46.85, -91.95), "soo_approach": (45.9, -85.2, 47.0, -83.4), "duluth_approach": (46.3, -92.5, 48.4, -86.8)}
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


EXPECTED_ETAG = "0x8DDB021091FE6BF"
FIELDS = ["geometry", "mmsi", "base_date_time", "vessel_type"]
LE,BE=struct.Struct("<Idd"),struct.Struct(">Idd")
MAX_SELECTED=500000

def point(raw):
    if not isinstance(raw,bytes) or len(raw)!=21 or raw[0] not in (0,1):
        return None
    kind,x,y=(LE if raw[0]==1 else BE).unpack_from(raw,1)
    if kind!=1 or not math.isfinite(x) or not math.isfinite(y) or not -180<=x<=180 or not -90<=y<=90:
        return None
    return y,x

def observed_time(t):
    if not isinstance(t,datetime):
        return None
    # Source README explicitly declares UTC for timezone-naive archive timestamps.
    if t.tzinfo is None:
        t=t.replace(tzinfo=timezone.utc)
    else:
        t=t.astimezone(timezone.utc)
    return t if START<=t<END else None

def vessel_class(v):
    return "cargo_tanker" if isinstance(v,int) and 70<=v<=89 else "unknown" if not isinstance(v,int) or v<=0 or v>99 else "other"

def site_hits(y,x):
    return [k for k,(s,w,n,e) in SITES.items() if s<=y<=n and w<=x<=e]

def summarize(obs):
    out={"uniqueVesselTimestampRows":0,"distinctVessels":len(obs),"cargoTankerVessels":0,"cargoTankerRows":0,"unknownTypeRows":0,"adjacentPairs":0,"gapsOverFiveMinutes":0,"cargoTankerAdjacentPairs":0,"cargoTankerGapsOverFiveMinutes":0,"distinctObservedMinutes":0}
    minutes=set()
    for stamps in obs.values():
        ordered=sorted(stamps)
        out["uniqueVesselTimestampRows"]+=len(ordered)
        out["cargoTankerVessels"]+=any(stamps[t]=="cargo_tanker" for t in ordered)
        for t in ordered:
            minutes.add(int(t.timestamp())//60)
            out["cargoTankerRows"]+=stamps[t]=="cargo_tanker"
            out["unknownTypeRows"]+=stamps[t]=="unknown"
        for a,b in zip(ordered,ordered[1:]):
            gap=(b-a).total_seconds()>300
            out["adjacentPairs"]+=1
            out["gapsOverFiveMinutes"]+=gap
            if stamps[a]==stamps[b]=="cargo_tanker":
                out["cargoTankerAdjacentPairs"]+=1
                out["cargoTankerGapsOverFiveMinutes"]+=gap
    out["distinctObservedMinutes"]=len(minutes)
    return out

def self_test():
    a=point(b"\x01"+LE.pack(1,-84.4,46.48))
    assert a==(46.48,-84.4)
    assert point(b"\x00"+BE.pack(1,-92.09,46.78))==(46.78,-92.09)
    assert point(b"\x01"+LE.pack(2,0,0)) is None
    assert point(b"\x01"+LE.pack(1,181,0)) is None
    assert point(b"") is None and point(None) is None
    assert set(site_hits(*a))=={"soo_local","soo_approach"}
    assert observed_time(datetime(2024,9,1,1)).tzinfo==timezone.utc
    assert observed_time(datetime(2024,9,2)) is None
    assert vessel_class(70)=="cargo_tanker" and vessel_class(0)=="unknown" and vessel_class(60)=="other"
    t0=START;t1=datetime(2024,9,1,0,1,tzinfo=timezone.utc);t2=datetime(2024,9,1,0,8,tzinfo=timezone.utc)
    v=summarize({"a":{t0:"cargo_tanker",t1:"cargo_tanker",t2:"cargo_tanker"},"b":{t1:"other"}})
    assert v["uniqueVesselTimestampRows"]==4 and v["distinctVessels"]==2 and v["cargoTankerVessels"]==1
    assert v["adjacentPairs"]==2 and v["gapsOverFiveMinutes"]==1 and v["cargoTankerAdjacentPairs"]==2 and v["distinctObservedMinutes"]==3
    print("Coverage decoder, UTC, spatial boxes and aggregate fixture passed")

def main():
    import pyarrow as pa
    import pyarrow.parquet as pq
    raw=RangeReader()
    report={"kind":"NOAA_ORIGINAL_ARCHIVE_ONE_DAY_COVERAGE","source":URL,"etag":raw.etag,"objectBytes":raw.size,"rangeBudgetBytes":CAP,"date":"2024-09-01","pyarrowVersion":pa.__version__,"receiptTimesAvailable":False,"independentCrossingLabels":0,"fieldAccuracyVerified":False,"productionCalibrationAuthorized":False,"sites":None,"scanComplete":False}
    try:
        if raw.etag.strip('"')!=EXPECTED_ETAG:
            raise ValueError("archive version changed")
        reader=pq.ParquetFile(io.BufferedReader(raw),pre_buffer=False)
        meta=reader.metadata
        names=reader.schema_arrow.names
        geo=json.loads((meta.metadata or {}).get(b"geo",b"{}"))
        gc=geo.get("columns",{}).get("geometry",{})
        if not all(k in names for k in FIELDS) or geo.get("primary_column")!="geometry" or gc.get("encoding")!="WKB" or gc.get("geometry_types")!=["Point"]:
            raise ValueError("unexpected point schema")
        report.update(objectRows=meta.num_rows,rowGroups=meta.num_row_groups,geoVersion=geo.get("version"),selectedColumns=FIELDS,coordinateBasis="NOAA documented WGS84 WKB points; x longitude, y latitude",timestampBasis="NOAA documented UTC; naive archive timestamp interpreted as UTC")
        projected=sum(meta.row_group(i).column(j).total_compressed_size for i in range(meta.num_row_groups) for j in range(meta.row_group(i).num_columns) if meta.row_group(i).column(j).path_in_schema in FIELDS)
        report["projectedCompressedBytes"]=projected
        if projected+2*1024*1024>CAP:
            raise ValueError("projected columns exceed byte budget")
        data={k:defaultdict(dict) for k in SITES}
        duplicates={k:0 for k in SITES}
        rejected={k:0 for k in SITES}
        scanned=bad_geom=selected_rows=0
        report["rowGroupRows"]=[meta.row_group(i).num_rows for i in range(meta.num_row_groups)]
        report["batchRows"]=32768
        # Arrow batches bound Python allocations even when the source has large row groups.
        # Project only the four verified columns. No independent full-column buffers or joins.
        for i in range(meta.num_row_groups):
            rg=meta.row_group(i)
            group_bytes=sum(rg.column(j).total_uncompressed_size for j in range(rg.num_columns) if rg.column(j).path_in_schema in FIELDS)
            if rg.num_rows>2000000 or group_bytes>160*1024*1024:
                raise ValueError("row group exceeds bounded decoder allowance")
            group_scanned=0
            for batch in reader.iter_batches(batch_size=32768,row_groups=[i],columns=FIELDS,use_threads=False):
                geometries=batch.column(batch.schema.get_field_index("geometry"))
                indices=[]
                hits=[]
                for j,blob in enumerate(geometries.to_pylist()):
                    p=point(blob)
                    if p is None:
                        bad_geom+=1
                        continue
                    y,x=p
                    if not 45.9<=y<=48.4 or not -92.5<=x<=-83.4:
                        continue
                    h=site_hits(y,x)
                    if h:
                        indices.append(j);hits.append(h)
                group_scanned+=batch.num_rows
                scanned+=batch.num_rows
                selected_rows+=len(indices)
                if selected_rows>MAX_SELECTED:
                    raise ValueError("selected rows exceed memory budget")
                if not indices:
                    continue
                subset=batch.select(FIELDS[1:]).take(pa.array(indices,type=pa.int64())).to_pydict()
                for identity,t,kind,locations in zip(subset["mmsi"],subset["base_date_time"],subset["vessel_type"],hits):
                    t=observed_time(t)
                    if not isinstance(identity,int) or not 100000000<=identity<=999999999 or t is None:
                        for k in locations:rejected[k]+=1
                        continue
                    cls=vessel_class(kind)
                    for k in locations:
                        timestamps=data[k][identity]
                        if t in timestamps:
                            duplicates[k]+=1
                            if timestamps[t]!=cls:
                                timestamps[t]="unknown"
                        else:
                            timestamps[t]=cls
            if group_scanned!=rg.num_rows:
                raise ValueError("incomplete row group scan")
        if scanned!=meta.num_rows:
            raise ValueError("incomplete geometry scan")
        report.update(scanComplete=True,rowsScanned=scanned,invalidGeometryRows=bad_geom,selectedGeographicRows=selected_rows,status="COVERAGE_ONLY",sites={k:{"box":SITES[k],"duplicateVesselTimestampRows":duplicates[k],"invalidIdentityOrTimeRows":rejected[k],**summarize(data[k])} for k in SITES})
    except Exception as exc:
        report["status"]="BOUNDED_SCAN_UNAVAILABLE"
        report["errorClass"]=type(exc).__name__
        if isinstance(exc,ValueError):
            report["reason"]=str(exc)[:200]
    finally:
        report.update(rangeBytesRead=raw.transferred,rangeRequests=raw.calls,rangeReceiptSha256=raw.digest.hexdigest())
    return report

if __name__=="__main__":
    if sys.argv[1:]==["--self-test"]:
        self_test()
    else:
        report=main()
        print(json.dumps(report,sort_keys=True))
        with open(os.environ["NOAA_REPORT"],"x",encoding="utf-8") as f:
            json.dump(report,f,indent=2,sort_keys=True)
        if not report["scanComplete"]:
            sys.exit(1)
