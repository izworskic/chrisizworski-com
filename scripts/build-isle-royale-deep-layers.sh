#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/isle-royale-map/data"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

GEOLOGY_URL='https://irma.nps.gov/DataStore/DownloadFile/659237?Reference=2165823'
VEGETATION_URL='https://irma.nps.gov/DataStore/DownloadFile/612177?Reference=2233314'

mkdir -p "$OUT" "$WORK/geology" "$WORK/vegetation"

require(){ command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 2; }; }
require curl
require unzip
require ogrinfo
require ogr2ogr
require python3

echo "Downloading NPS geology GeoPackage package..."
curl --fail --location --retry 3 --retry-delay 2 --user-agent 'ChrisIzworskiIsleRoyaleGIS/1.0' "$GEOLOGY_URL" -o "$WORK/geology.zip"
unzip -q "$WORK/geology.zip" -d "$WORK/geology"
GPKG="$(find "$WORK/geology" -type f -iname '*.gpkg' -print -quit)"
if [[ -z "$GPKG" ]]; then
  echo "No GeoPackage found in NPS geology package" >&2
  exit 3
fi

GEO_LAYER="$(ogrinfo -ro "$GPKG" 2>/dev/null | sed -nE 's/^[0-9]+: (.*ISROGLG.*)$/\1/ip' | head -n1)"
GEO_LAYER="${GEO_LAYER:-ISROGLG}"
echo "Using geology layer: $GEO_LAYER"
ogrinfo -ro -so "$GPKG" "$GEO_LAYER" >/dev/null

ogr2ogr -f GeoJSON "$WORK/geology.raw.geojson" "$GPKG" "$GEO_LAYER" \
  -t_srs EPSG:4326 -makevalid -simplify 0.00010 \
  -lco RFC7946=YES -lco COORDINATE_PRECISION=5

echo "Downloading NPS vegetation inventory package..."
curl --fail --location --retry 3 --retry-delay 2 --user-agent 'ChrisIzworskiIsleRoyaleGIS/1.0' "$VEGETATION_URL" -o "$WORK/vegetation.zip"
unzip -q "$WORK/vegetation.zip" -d "$WORK/vegetation"

VEG_SHP=""
VEG_COUNT=-1
while IFS= read -r shp; do
  layer="$(basename "$shp" .shp)"
  info="$(ogrinfo -ro -so "$shp" "$layer" 2>/dev/null || true)"
  if ! grep -Eqi 'Geometry: (Multi )?Polygon|Geometry: Polygon|Geometry: Multi Polygon' <<<"$info"; then
    continue
  fi
  count="$(sed -nE 's/.*Feature Count: ([0-9]+).*/\1/p' <<<"$info" | head -n1)"
  count="${count:-0}"
  if (( count > VEG_COUNT )); then
    VEG_COUNT="$count"
    VEG_SHP="$shp"
  fi
done < <(find "$WORK/vegetation" -type f -iname '*.shp' -print)

if [[ -z "$VEG_SHP" ]]; then
  echo "No polygon shapefile found in NPS vegetation package" >&2
  find "$WORK/vegetation" -maxdepth 3 -type f -print >&2
  exit 4
fi

VEG_LAYER="$(basename "$VEG_SHP" .shp)"
echo "Using vegetation layer: $VEG_LAYER ($VEG_COUNT source features)"
ogr2ogr -f GeoJSON "$WORK/vegetation.raw.geojson" "$VEG_SHP" "$VEG_LAYER" \
  -t_srs EPSG:4326 -makevalid -simplify 0.00018 \
  -lco RFC7946=YES -lco COORDINATE_PRECISION=5

python3 - "$WORK/geology.raw.geojson" "$OUT/geology-units.geojson" geology \
          "$WORK/vegetation.raw.geojson" "$OUT/vegetation-baseline-2000.geojson" vegetation <<'PY'
import json, re, sys

def normkey(k):
    return re.sub(r'[^a-z0-9]+','',str(k).lower())

def pick(props, patterns):
    for pat in patterns:
        for k,v in props.items():
            if v is None or str(v).strip()=='':
                continue
            if re.search(pat, normkey(k), re.I):
                return str(v).strip()
    return None

def compact(src, dst, kind):
    with open(src, encoding='utf-8') as f:
        fc=json.load(f)
    output=[]
    for feature in fc.get('features',[]):
        p=feature.get('properties') or {}
        if kind=='geology':
            symbol=pick(p,[r'^glgsym$',r'mapunit',r'unitsym',r'^symbol$'])
            name=pick(p,[r'unitname',r'unitlabel',r'glglabel',r'formation',r'^name$'])
            desc=pick(p,[r'unitdesc',r'description',r'descript',r'litholog'])
            name=name or (f'Geologic unit {symbol}' if symbol else 'Geologic unit')
            keep_patterns=(r'unit',r'glg',r'symbol',r'label',r'name',r'desc',r'lith',r'age',r'formation',r'group')
        else:
            symbol=pick(p,[r'mapclass',r'classcode',r'vegcode',r'^code$'])
            name=pick(p,[r'mapclassname',r'vegname',r'association',r'community',r'alliance',r'classname',r'^name$',r'label'])
            desc=pick(p,[r'description',r'descript',r'vegdesc',r'physiogn'])
            name=name or (f'Vegetation class {symbol}' if symbol else 'Vegetation class')
            keep_patterns=(r'veg',r'class',r'community',r'association',r'alliance',r'name',r'label',r'desc',r'physiog',r'cover',r'code')
        props={'name':name}
        if symbol: props['symbol']=symbol
        if desc: props['description']=desc[:700]
        kept=0
        for k,v in p.items():
            if kept>=12 or v is None or str(v).strip()=='':
                continue
            nk=normkey(k)
            if any(re.search(pattern,nk,re.I) for pattern in keep_patterns):
                out_key=re.sub(r'[^a-z0-9]+','_',str(k).lower()).strip('_')[:48]
                if out_key not in props:
                    props[out_key]=v
                    kept+=1
        output.append({'type':'Feature','geometry':feature.get('geometry'),'properties':props})
    result={
        'type':'FeatureCollection',
        'metadata':{
            'kind':kind,
            'source_vintage':'2021 NPS GRI digital release' if kind=='geology' else '2000 NPS vegetation inventory; imagery largely 1994/1996',
            'derived_for_web':True,
            'feature_count':len(output)
        },
        'features':output
    }
    with open(dst,'w',encoding='utf-8') as f:
        json.dump(result,f,separators=(',',':'))
    print(kind, len(output), dst)

args=sys.argv[1:]
compact(args[0],args[1],args[2])
compact(args[3],args[4],args[5])
PY

python3 - "$OUT" <<'PY'
import hashlib,json,os,sys,datetime
out=sys.argv[1]
sources={
 'geology':{
   'file':'geology-units.geojson',
   'source':'https://catalog.data.gov/dataset/digital-geologic-gis-map-of-isle-royale-national-park-and-vicinity-michigan-nps-grd-g-1996',
   'download':'https://irma.nps.gov/DataStore/DownloadFile/659237?Reference=2165823',
   'vintage':'NPS GRI digital release 2021; source mapping includes older USGS work',
   'accuracy_note':'NPS metadata cautions that 1:62,500 source-map features are horizontally accurate to about 31.8 m / 104.2 ft, not survey-grade.'
 },
 'vegetation':{
   'file':'vegetation-baseline-2000.geojson',
   'source':'https://catalog.data.gov/dataset/geospatial-data-for-the-vegetation-mapping-inventory-project-of-isle-royale-national-park',
   'download':'https://irma.nps.gov/DataStore/DownloadFile/612177?Reference=2233314',
   'vintage':'NPS vegetation inventory published 2000; project imagery primarily 1994/1996',
   'accuracy_note':'Historical baseline inventory, not a current vegetation-condition map.'
 }
}
for item in sources.values():
    path=os.path.join(out,item['file'])
    data=open(path,'rb').read()
    item['bytes']=len(data)
    item['sha256']=hashlib.sha256(data).hexdigest()
    try:
        item['features']=len(json.loads(data).get('features',[]))
    except Exception:
        item['features']=None
manifest={
 'schema_version':1,
 'generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'derivation':'Downloaded federal source packages, reprojected to EPSG:4326, geometry made valid, simplified for web display, attributes reduced to visitor-facing science context.',
 'sources':sources
}
with open(os.path.join(out,'deep-layer-manifest.json'),'w',encoding='utf-8') as f:
    json.dump(manifest,f,indent=2)
    f.write('\n')
print(json.dumps(manifest,indent=2))
PY

for f in "$OUT/geology-units.geojson" "$OUT/vegetation-baseline-2000.geojson"; do
  size="$(wc -c < "$f")"
  if (( size > 25000000 )); then
    echo "Generated layer too large for this static web release: $f ($size bytes)" >&2
    exit 5
  fi
done

echo "Isle Royale deep layers built successfully."
