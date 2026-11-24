"""One-time read-only official geographic reference query. No vessel records."""
import hashlib,json,os,urllib.parse,urllib.request,urllib.error
SOURCES=[
 ("usace_locks","https://services7.arcgis.com/n1YM8pTrFmm7L4hs/ArcGIS/rest/services/Locks/FeatureServer/0/query","-84.36,46.49,-84.34,46.51","CHAMBN,PMSNAME,WIDTH,CHMBUW,LENGTH,CHMBUL,NDCCODE"),
 ("noaa_bridge","https://encdirect.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer/87/query","-92.094,46.777,-92.091,46.780","OBJNAM,HORCLR,SORDAT,SORIND,DSNM,CATBRG")
]
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs): raise ValueError("redirect rejected")
out=[]
for name,url,box,fields in SOURCES:
 query=urllib.parse.urlencode(dict(where="1=1",geometry=box,geometryType="esriGeometryEnvelope",inSR=4326,outSR=4326,outFields=fields,returnGeometry="true",f="json"))
 item={"name":name,"url":url+"?"+query,"status":"UNAVAILABLE"}
 try:
  with urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(item["url"],headers={"Accept":"application/json","User-Agent":"GreatLakesResearch/1.0"}),timeout=20) as response:
   raw=response.read(262145)
  if len(raw)>262144: raise ValueError("response exceeds cap")
  obj=json.loads(raw)
  if "error" in obj or obj.get("exceededTransferLimit") or not isinstance(obj.get("features"),list) or len(obj["features"])>30: raise ValueError("invalid or incomplete feature response")
  item.update(status="RETRIEVED",sha256=hashlib.sha256(raw).hexdigest(),spatialReference=obj.get("spatialReference"),features=obj["features"])
 except urllib.error.HTTPError as exc: item["httpStatus"]=exc.code
 except Exception as exc: item["errorClass"]=type(exc).__name__
 out.append(item)
report={"kind":"OFFICIAL_GEOMETRY_REFERENCE_QUERY_NOT_HISTORICAL_SURVEY","sources":out,"geometryApproved":False,"independentPassages":0}
print(json.dumps(report,sort_keys=True))
with open(os.environ["REPORT"],"x",encoding="utf-8") as f: json.dump(report,f,indent=2)
