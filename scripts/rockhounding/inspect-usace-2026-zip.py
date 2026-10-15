#!/usr/bin/env python3
"""Inspect one known July 2026 USACE Grand Marais survey ZIP safely, offline.

Do not publish a soundings-based current navigational depth, nearshore waves,
harbor attenuation or rockhounding recommendation from this research output.
"""
import argparse
import datetime as dt
import hashlib
import io
import json
import math
import pathlib
import re
import urllib.request
import zipfile

SOURCE="https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys/CELRE/CELRE_DIS_GR_01_MAS_20260730_CS.ZIP"
MAX_DOWNLOAD=16*1024*1024
MAX_ENTRIES=1200
MAX_UNCOMPRESSED=300*1024*1024
MAX_TEXT_READ=1_600_000
ZIP_ID="CELRE_DIS_GR_01_MAS_20260730_CS"
RESEARCH_RE='datum|vertical|horizontal|igld|navd|feet|meters|metres|projection|coordinate|depth|elevation|chart|mllw|low water|geoid'
def download():
 req=urllib.request.Request(SOURCE,headers={"User-Agent":"MichiganRockhoundingResearch/1.0"})
 with urllib.request.urlopen(req,timeout=40) as response:
  size=response.headers.get("Content-Length")
  if not size or not size.isdigit() or int(size)>MAX_DOWNLOAD:
   raise ValueError("Survey ZIP download lacks acceptable size")
  raw=response.read(MAX_DOWNLOAD+1)
 if len(raw)>MAX_DOWNLOAD or len(raw)<500:
  raise ValueError("Survey ZIP outside approved size limit")
 return raw
def inspect_zip(raw):
 result={"archiveBytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
 entries=[]
 with zipfile.ZipFile(io.BytesIO(raw)) as archive:
  infos=archive.infolist()
  if not infos or len(infos)>MAX_ENTRIES:
   raise ValueError("Unexpected USACE archive entry count")
  total=0
  for info in infos:
   name=info.filename.replace("\\","/")
   if (name.startswith("/") or ".." in pathlib.PurePosixPath(name).parts
       or "\x00" in name or (info.flag_bits&1)):
    raise ValueError("Unsafe or encrypted USACE archive member")
   total+=info.file_size
   if info.file_size>90*1024*1024 or total>MAX_UNCOMPRESSED:
    raise ValueError("Oversized archive extraction potential")
   entries.append({"name":name,"bytes":info.file_size,
                   "compressedBytes":info.compress_size})
  names=[x["name"] for x in entries]
  xyz=[name for name in names if name.lower().endswith(".xyz")]
  xml=[name for name in names if name.lower().endswith(".xml")]
  readme=[name for name in names if "readme" in name.lower() and name.lower().endswith(".txt")]
  if not xyz or not xml or not readme:
   raise ValueError("Expected original XYZ, XML metadata and survey format README")
  snippets=[]
  for name in (xml[:2]+readme[:2]):
   info=archive.getinfo(name)
   if info.file_size>MAX_TEXT_READ:
    snippets.append({"file":name,"status":"TOO_LARGE_FOR_BOUNDED_TEXT_PARSE"})
    continue
   with archive.open(info) as stream:
    text=stream.read(MAX_TEXT_READ+1).decode("utf8","replace")
   lines=text.splitlines()
   hits=[]
   for idx,line in enumerate(lines):
    if re.search(RESEARCH_RE,line,re.I):
     # Source excerpt only: matching a keyword does NOT verify a geodetic datum.
     hits.append({"sourceLine":idx+1,"excerpt":line.strip()[:220]})
    if len(hits)>=38:break
   snippets.append({"file":name,"textBytes":len(text),"relevantMetadataExcerpts":hits,
                    "notAnEstablishedVerticalDatum":True})
  xyz_summaries=[]
  for name in xyz[:3]:
   info=archive.getinfo(name)
   rows=[];invalid=0
   with archive.open(info) as stream:
    for i,line in enumerate(stream):
     if i>=1500:break
     txt=line.decode("ascii","replace").strip()
     if not txt or txt.startswith(("#","!",";")):continue
     v=re.split(r"[,\s]+",txt)
     try:
      numbers=[float(x) for x in v[:3]]
      if len(numbers)<3 or not all(math.isfinite(x) for x in numbers):
       invalid+=1;continue
      rows.append(numbers)
     except (ValueError,TypeError): invalid+=1
   xyz_summaries.append({"file":name,"uncompressedBytes":info.file_size,
      "parsedFirstRows":len(rows),"skippedNonNumericRows":invalid,
      "firstThreeNumericRows":rows[:3],
      "first1500RowNumericColumnRanges":[[round(min(row[i] for row in rows),3),
          round(max(row[i] for row in rows),3)] for i in range(3)] if rows else None,
      "rowsNotGeoreferencedUntilHorizontalDatumAndUnitValidated":True,
      "zValuesNotInterpretedAsCurrentHarborDepth":True})
  result.update({"memberCount":len(entries),"totalUncompressedBytes":total,
    "manifest":[e for e in entries if not e["name"].lower().startswith("__macosx")][:180],
    "xyzFileCount":len(xyz),"metadataXmlCount":len(xml),"readmeFileCount":len(readme),
    "sourceMetadataSnippets":snippets,"xyzNumericPreview":xyz_summaries})
 result["surveyedHarborChannelStudyOnly"]=True
 result["isSurveyFootprintProofOfBayshoreParkBathymetry"]=False
 result["verticalDatumIndependentlyReconciled"]=False
 result["safeNavigableClearance"]=None
 result["harborWaveTransmissionFactor"]=None
 result["canPredictStoneExposure"]=False
 result["canPublishVisitWindow"]=False
 return result
def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument("--out",required=True)
 args=parser.parse_args()
 data=inspect_zip(download())
 data={"schemaVersion":"grand-marais-usace-2026-survey-original-archive-v1",
   "obtainedAtUTC":dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z"),
   "source":SOURCE,**data}
 out=pathlib.Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps(data,indent=2)+"\n",encoding="utf8")
 print("USACE_2026_SURVEY_ZIP "+json.dumps({
  "sha256":data["sha256"],"archiveBytes":data["archiveBytes"],
  "files":data["memberCount"],"xyz":data["xyzNumericPreview"],
  "metadataExtract":data["sourceMetadataSnippets"],
  "safeDepth":False,"shelter":False},separators=(",",":")))
if __name__=="__main__":main()
