#!/usr/bin/env python3
import datetime
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile

try:
    from osgeo import ogr
except Exception as exc:
    raise SystemExit(f"GDAL Python bindings required: {exc}")

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "isle-royale-map" / "data"
OUT.mkdir(parents=True, exist_ok=True)

USER_AGENT = "ChrisIzworskiIsleRoyaleContextGIS/1.0 (+https://chrisizworski.com/isle-royale-map/)"
QUIET_WEBMAP = "900def55-d66d-4761-8898-634feaea5cd8"
QUIET_PAGE = "https://www.nps.gov/isro/planyourvisit/quiet-no-wake.htm"
QUIET_DATASTORE = "https://irma.nps.gov/DataStore/Collection/Profile/9705"
VEG_PARENT = "65c246f9d34ef4b119ca6c8b"
VEG_DOI = "10.5066/P9393VFK"
FIRE_PARENT = "6659f2cfd34ef3137d36a465"
FIRE_DOI = "10.5066/P13QWXNI"


def fetch_bytes(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def fetch_json(url, timeout=60):
    return json.loads(fetch_bytes(url, timeout).decode("utf-8"))


def arcgis_query(url):
    query = url.rstrip("/") + "/query"
    params = {
        "where": "1=1",
        "outFields": "*",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
        "resultRecordCount": "5000",
    }
    return fetch_json(query + "?" + urllib.parse.urlencode(params))


def collect_arcgis_service(url, title):
    clean = url.rstrip("/")
    candidates = []
    if re.search(r"/(?:FeatureServer|MapServer)/\d+$", clean, re.I):
        try:
            data = arcgis_query(clean)
            candidates.append((title, clean, data))
        except Exception as exc:
            print(f"ArcGIS sublayer query failed {title}: {exc}", file=sys.stderr)
        return candidates

    try:
        meta = fetch_json(clean + "?f=json")
    except Exception as exc:
        print(f"ArcGIS service metadata failed {title}: {exc}", file=sys.stderr)
        return candidates
    for layer in meta.get("layers") or []:
        layer_url = clean + "/" + str(layer["id"])
        layer_title = layer.get("name") or title
        try:
            candidates.append((layer_title, layer_url, arcgis_query(layer_url)))
        except Exception as exc:
            print(f"ArcGIS layer query failed {layer_title}: {exc}", file=sys.stderr)
    return candidates


def esri_geom_to_geojson(geom):
    if not geom:
        return None
    if isinstance(geom.get("x"), (int, float)) and isinstance(geom.get("y"), (int, float)):
        return {"type": "Point", "coordinates": [geom["x"], geom["y"]]}
    if "paths" in geom:
        paths = geom["paths"]
        return {"type": "LineString" if len(paths) == 1 else "MultiLineString",
                "coordinates": paths[0] if len(paths) == 1 else paths}
    if "rings" in geom:
        return {"type": "Polygon", "coordinates": geom["rings"]}
    if "points" in geom:
        return {"type": "MultiPoint", "coordinates": geom["points"]}
    return None


def collect_embedded_feature_sets(layer, out):
    title = layer.get("title") or layer.get("name") or "embedded NPS layer"
    fc = layer.get("featureCollection") or {}
    for child in fc.get("layers") or []:
        fs = child.get("featureSet") or {}
        features = []
        for item in fs.get("features") or []:
            geom = esri_geom_to_geojson(item.get("geometry") or {})
            if geom:
                features.append({"type": "Feature", "geometry": geom, "properties": item.get("attributes") or {}})
        if features:
            child_title = (child.get("layerDefinition") or {}).get("name") or title
            out.append((child_title, "embedded-webmap", {"type": "FeatureCollection", "features": features}))
    for child in layer.get("layers") or []:
        collect_embedded_feature_sets(child, out)


def feature_collection_polygon(fc):
    features = fc.get("features") or []
    if not features:
        return False
    types = {((f.get("geometry") or {}).get("type") or "") for f in features}
    return all("Polygon" in t for t in types if t)


def wake_score(title, fc):
    features = fc.get("features") or []
    sample = " ".join(
        str(v) for f in features[:20] for v in (f.get("properties") or {}).values()
        if v is not None
    )
    hay = (title + " " + sample).lower()
    score = 0
    if "quiet" in hay: score += 70
    if "wake" in hay: score += 80
    if len(features) == 17: score += 120
    if feature_collection_polygon(fc): score += 30
    return score


def compact_quiet_zones(fc):
    out = []
    for idx, f in enumerate(fc.get("features") or [], 1):
        p = f.get("properties") or {}
        strings = [str(v).strip() for v in p.values() if v is not None and str(v).strip()]
        joined = " ".join(strings)
        name = None
        for key in ["name", "Name", "NAME", "title", "Title", "MAPLABEL", "LABEL", "Zone", "ZONE"]:
            if p.get(key):
                name = str(p[key]).strip()
                break
        name = name or next((x for x in strings if len(x) < 120 and not x.isdigit()), f"Quiet/no-wake zone {idx}")
        lower = joined.lower()
        if "quiet" in lower and "no" in lower and "wake" in lower:
            zone_type = "Quiet/No-Wake"
        elif "no-wake" in lower or "no wake" in lower:
            zone_type = "No-Wake"
        elif "quiet" in lower:
            zone_type = "Quiet/No-Wake"
        else:
            zone_type = "Quiet/No-Wake or No-Wake"
        props = {"name": name, "zone_type": zone_type, "speed_limit_mph": 5}
        kept = 0
        for k, v in p.items():
            if kept >= 10 or v is None or str(v).strip() == "":
                continue
            key = re.sub(r"[^a-z0-9]+", "_", str(k).lower()).strip("_")[:48]
            if key not in props:
                props[key] = v
                kept += 1
        out.append({"type": "Feature", "geometry": f.get("geometry"), "properties": props})
    return {"type": "FeatureCollection", "features": out}


def nps_quiet_diagnostics():
    for url in [
        QUIET_PAGE,
        f"https://www.nps.gov/maps/embed.html?mapId={QUIET_WEBMAP}",
        f"https://www.nps.gov/maps/full.html?mapId={QUIET_WEBMAP}",
    ]:
        try:
            html = fetch_bytes(url, timeout=30).decode("utf-8", errors="replace")
        except Exception as exc:
            print(f"NPS diagnostic fetch failed {url}: {exc}", file=sys.stderr)
            continue
        print(f"NPS diagnostic {url} bytes={len(html)}", file=sys.stderr)
        links = re.findall(r'''(?:href|src)=["']([^"']+)["']''', html, flags=re.I)
        for link in links:
            low = link.lower()
            if any(token in low for token in ["9705", "downloadfile", "datastore", "quiet", "wake", "map", "gis", "api"]):
                print(f"  link {link}", file=sys.stderr)
        for match in re.finditer(r".{0,180}(?:9705|DownloadFile|quiet|wake|mapId|FeatureServer|MapServer|DataStore).{0,260}", html, flags=re.I | re.S):
            snippet = re.sub(r"\s+", " ", match.group(0)).strip()
            print(f"  snippet {snippet[:700]}", file=sys.stderr)

    for asset in [
        "https://www.nps.gov/maps/assets/js/load.min.js",
        "https://www.nps.gov/maps/assets/libs/reqwest.min.js",
    ]:
        try:
            body = fetch_bytes(asset, timeout=30).decode("utf-8", errors="replace")
            print(f"NPS map asset {asset} bytes={len(body)}", file=sys.stderr)
            print(body[:16000], file=sys.stderr)
        except Exception as exc:
            print(f"NPS map asset fetch failed {asset}: {exc}", file=sys.stderr)


def build_quiet_no_wake():
    data_url = f"https://www.arcgis.com/sharing/rest/content/items/{QUIET_WEBMAP}/data?f=json"
    try:
        webmap = fetch_json(data_url)
    except Exception as exc:
        print(f"ArcGIS interpretation of NPS map id failed: {exc}", file=sys.stderr)
        webmap = {}
    candidates = []
    for layer in webmap.get("operationalLayers") or []:
        collect_embedded_feature_sets(layer, candidates)
        url = layer.get("url")
        if url and re.search(r"(FeatureServer|MapServer)", url, re.I):
            candidates.extend(collect_arcgis_service(url, layer.get("title") or "NPS quiet/no-wake"))
        for child in layer.get("layers") or []:
            url = child.get("url")
            if url and re.search(r"(FeatureServer|MapServer)", url, re.I):
                candidates.extend(collect_arcgis_service(url, child.get("title") or layer.get("title") or "NPS quiet/no-wake"))

    scored = []
    for title, source, fc in candidates:
        if not isinstance(fc, dict) or not fc.get("features"):
            continue
        score = wake_score(title, fc)
        print(f"quiet candidate title={title!r} features={len(fc.get('features') or [])} score={score} source={source}", file=sys.stderr)
        if feature_collection_polygon(fc):
            scored.append((score, title, source, fc))

    exact = [c for c in scored if len(c[3].get("features") or []) == 17]
    if exact:
        chosen = max(exact, key=lambda x: x[0])
        fc = chosen[3]
        chosen_sources = [chosen[2]]
    else:
        wake_layers = [c for c in scored if c[0] >= 100]
        combined = []
        chosen_sources = []
        for c in sorted(wake_layers, reverse=True):
            combined.extend(c[3].get("features") or [])
            chosen_sources.append(c[2])
        if len(combined) != 17:
            nps_quiet_diagnostics()
            raise RuntimeError(f"Could not reconcile NPS quiet/no-wake geometry to 17 zones; polygon candidates={[(c[1],len(c[3].get('features') or []),c[0]) for c in scored]}")
        fc = {"type": "FeatureCollection", "features": combined}

    compact = compact_quiet_zones(fc)
    if len(compact["features"]) != 17:
        raise RuntimeError("Quiet/no-wake output must contain exactly 17 zones")
    target = OUT / "quiet-no-wake-zones.geojson"
    target.write_text(json.dumps(compact, separators=(",", ":")), encoding="utf-8")
    return target, {
        "source": QUIET_PAGE,
        "geometry_source": data_url,
        "datastore_collection": QUIET_DATASTORE,
        "vintage": "Official NPS quiet/no-wake web map; page last updated April 22, 2025",
        "regulation_note": "NPS states 17 zones; vessels in designated zones must not exceed 5 mph or create a wake greater than lake conditions. Verify current park regulations before operating.",
        "features": 17,
        "geometry_sources": chosen_sources,
    }


def sciencebase_descendants(parent_id):
    found = []
    queue = [parent_id]
    seen = set()
    while queue:
        item_id = queue.pop(0)
        if item_id in seen:
            continue
        seen.add(item_id)
        item = fetch_json(f"https://www.sciencebase.gov/catalog/item/{item_id}?format=json")
        found.append(item)
        url = "https://www.sciencebase.gov/catalog/items?" + urllib.parse.urlencode({
            "filter": f"parentId={item_id}",
            "format": "json",
            "max": "100",
        })
        try:
            children = fetch_json(url).get("items") or []
        except Exception as exc:
            print(f"ScienceBase child listing failed for {item_id}: {exc}", file=sys.stderr)
            children = []
        for child in children:
            cid = child.get("id")
            if cid and cid not in seen:
                queue.append(cid)
    return found


def download_sciencebase_tree(parent_id, dest):
    dest.mkdir(parents=True, exist_ok=True)
    items = sciencebase_descendants(parent_id)
    print(f"ScienceBase {parent_id}: {len(items)} items discovered", file=sys.stderr)
    for item in items:
        item_id = item.get("id") or "unknown"
        title = item.get("title") or ""
        files = item.get("files") or []
        print(f"  item {item_id} title={title!r} files={len(files)}", file=sys.stderr)
        item_dir = dest / item_id
        item_dir.mkdir(exist_ok=True)
        (item_dir / "_item.json").write_text(json.dumps(item, indent=2), encoding="utf-8")
        for entry in files:
            url = entry.get("url")
            name = entry.get("name")
            if not url or not name:
                continue
            safe = pathlib.Path(name).name
            path = item_dir / safe
            try:
                path.write_bytes(fetch_bytes(url, timeout=120))
                print(f"    downloaded {safe} {path.stat().st_size} bytes", file=sys.stderr)
                if zipfile.is_zipfile(path):
                    unzip = item_dir / (path.stem + "_unzipped")
                    unzip.mkdir(exist_ok=True)
                    with zipfile.ZipFile(path) as z:
                        z.extractall(unzip)
            except Exception as exc:
                print(f"    download failed {safe}: {exc}", file=sys.stderr)
    return items


def vector_candidates(root, purpose):
    candidates = []
    vector_paths = []
    for suffix in ("*.shp", "*.gpkg", "*.geojson", "*.json"):
        vector_paths.extend(root.rglob(suffix))
    for path in sorted(set(vector_paths)):
        if path.name == "_item.json":
            continue
        ds = ogr.Open(str(path), 0)
        if ds is None:
            continue
        for i in range(ds.GetLayerCount()):
            layer = ds.GetLayerByIndex(i)
            geom = ogr.GeometryTypeToName(layer.GetLayerDefn().GetGeomType())
            if "polygon" not in geom.lower():
                continue
            count = layer.GetFeatureCount()
            defn = layer.GetLayerDefn()
            fields = [defn.GetFieldDefn(j).GetNameRef() for j in range(defn.GetFieldCount())]
            samples = []
            layer.ResetReading()
            for _ in range(12):
                feature = layer.GetNextFeature()
                if feature is None:
                    break
                for field in fields[:18]:
                    value = feature.GetField(field)
                    if value is not None and str(value).strip():
                        samples.append(str(value).strip())
            hay = " ".join([str(path), layer.GetName(), " ".join(fields), " ".join(samples)]).lower()
            score = 20
            if purpose == "vegetation-change":
                if "change" in hay: score += 100
                if "veget" in hay: score += 70
                if "2017" in hay: score += 40
                if "1996" in hay or "1994" in hay: score += 25
                if "random" in hay: score -= 120
                if "site" in hay and "change" not in hay: score -= 50
            else:
                if "burn" in hay: score += 100
                if "severity" in hay: score += 100
                if "horne" in hay: score += 70
                if "fire" in hay: score += 45
            if count and count > 0:
                score += min(30, int(count).bit_length() * 3)
            candidates.append((score, count, path, layer.GetName(), fields, samples[:12]))
            print(f"{purpose} candidate score={score} features={count} path={path} layer={layer.GetName()!r} fields={fields}", file=sys.stderr)
    return sorted(candidates, reverse=True, key=lambda x: (x[0], x[1]))


def normalize_vector(candidate, target, purpose):
    score, count, path, layer_name, fields, _samples = candidate
    tmp = target.with_suffix(".raw.geojson")
    cmd = [
        "ogr2ogr", "-f", "GeoJSON", str(tmp), str(path), layer_name,
        "-t_srs", "EPSG:4326", "-makevalid",
        "-simplify", "0.00012" if purpose == "horne-fire" else "0.00016",
        "-lco", "RFC7946=YES", "-lco", "COORDINATE_PRECISION=5",
    ]
    subprocess.run(cmd, check=True)
    fc = json.loads(tmp.read_text(encoding="utf-8"))
    out = []
    for idx, feature in enumerate(fc.get("features") or [], 1):
        p = feature.get("properties") or {}
        strings = [str(v).strip() for v in p.values() if v is not None and str(v).strip()]
        name = next((x for x in strings if any(ch.isalpha() for ch in x) and len(x) <= 160), None)
        if not name:
            name = ("Vegetation change area " if purpose == "vegetation-change" else "Horne Fire burn-severity area ") + str(idx)
        props = {"name": name}
        kept = 0
        for k, v in p.items():
            if kept >= 14 or v is None or str(v).strip() == "":
                continue
            key = re.sub(r"[^a-z0-9]+", "_", str(k).lower()).strip("_")[:48]
            if key not in props:
                props[key] = v
                kept += 1
        out.append({"type": "Feature", "geometry": feature.get("geometry"), "properties": props})
    result = {"type": "FeatureCollection", "features": out}
    target.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    tmp.unlink(missing_ok=True)
    return len(out), score, str(path), layer_name


def build_science_layer(parent_id, doi, purpose, filename):
    with tempfile.TemporaryDirectory() as td:
        root = pathlib.Path(td)
        download_sciencebase_tree(parent_id, root)
        candidates = vector_candidates(root, purpose)
        threshold = 110 if purpose == "vegetation-change" else 130
        if not candidates or candidates[0][0] < threshold:
            raise RuntimeError(f"No defensible polygon dataset found for {purpose}; top candidates={[(c[0],c[1],str(c[2]),c[3]) for c in candidates[:10]]}")
        target = OUT / filename
        count, score, source_path, layer_name = normalize_vector(candidates[0], target, purpose)
        if target.stat().st_size > 15_000_000:
            raise RuntimeError(f"{purpose} layer exceeds 15 MB web gate: {target.stat().st_size}")
        return target, {
            "source": f"https://doi.org/{doi}",
            "sciencebase_parent": f"https://www.sciencebase.gov/catalog/item/{parent_id}",
            "license": "CC0 1.0 Universal / U.S. public domain",
            "features": count,
            "selection_score": score,
            "selected_source_path": source_path,
            "selected_layer": layer_name,
        }


def fingerprint(path):
    data = path.read_bytes()
    return {"file": path.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def main():
    built = {}
    quiet_path, quiet_meta = build_quiet_no_wake()
    built["quiet_no_wake"] = {**fingerprint(quiet_path), **quiet_meta}

    veg_path, veg_meta = build_science_layer(VEG_PARENT, VEG_DOI, "vegetation-change", "vegetation-change-1996-2017.geojson")
    built["vegetation_change"] = {
        **fingerprint(veg_path),
        **veg_meta,
        "vintage": "2017 high-resolution imagery compared with the 2000 NPS vegetation map (1994/1996 imagery)",
        "interpretation_note": "Shows mapped vegetation cover type, density or pattern change and proposed reasons from the USGS release; not a present-day 2026 vegetation map.",
    }

    fire_path, fire_meta = build_science_layer(FIRE_PARENT, FIRE_DOI, "horne-fire", "horne-fire-burn-severity.geojson")
    built["horne_fire"] = {
        **fingerprint(fire_path),
        **fire_meta,
        "vintage": "2021 Horne Fire; USGS data release published 2024",
        "interpretation_note": "Burn-severity assessment derived from pre/post-fire high-resolution imagery; use as historical ecological context, not a current fire-status layer.",
    }

    manifest_path = OUT / "context-layer-manifest.json"
    previous = {}
    if manifest_path.exists():
        try:
            previous = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            previous = {}
    previous_layers = previous.get("layers") or {}
    same = all(previous_layers.get(k, {}).get("sha256") == v.get("sha256") for k, v in built.items())
    generated_at = previous.get("generated_at") if same and previous.get("generated_at") else datetime.datetime.now(datetime.timezone.utc).isoformat()
    manifest = {
        "schema_version": 1,
        "generated_at": generated_at,
        "derivation": "Official NPS ArcGIS quiet/no-wake geometry plus USGS ScienceBase geospatial releases normalized to EPSG:4326 and simplified for opt-in web display.",
        "layers": built,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
