"""Synthetic offline tests; these are not NOAA observations."""
import datetime as dt
import importlib.util
import tempfile
import unittest
from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import box

spec=importlib.util.spec_from_file_location("basin_snow",Path(__file__).resolve().parents[1]/"scripts/build-up-waterfall-basin-snow.py")
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class BasinTests(unittest.TestCase):
    def raster(self,root,vals):
        p=Path(root)/"synthetic.tif"
        with rasterio.open(p,"w",driver="GTiff",width=2,height=2,count=1,dtype="int16",crs="EPSG:5070",transform=from_origin(0,2000,1000,1000),nodata=-9999) as ds:
            ds.write(np.array(vals,dtype="int16"),1)
        return p

    def test_partial_pixels_and_scaling(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=self.raster(tmp,[[100,300],[100,300]])
            r=m.summarize_raster(p,box(500,0,2000,2000),1)
            self.assertEqual(r["status"],"AVAILABLE")
            self.assertAlmostEqual(r["mm"],233.333,places=3)
            self.assertAlmostEqual(r["coverage"],1)
            self.assertAlmostEqual(m.summarize_raster(p,box(500,0,2000,2000),.01)["mm"],2.333,places=3)

    def test_nodata_saturation_and_zero(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=self.raster(tmp,[[0,0],[0,-9999]])
            r=m.summarize_raster(p,box(0,0,2000,2000),1)
            self.assertEqual(r["status"],"UNAVAILABLE")
            self.assertAlmostEqual(r["coverage"],.75)
            self.assertNotIn("mm",r)
            p=self.raster(tmp,[[0,0],[0,0]])
            self.assertEqual(m.summarize_raster(p,box(0,0,2000,2000),1)["mm"],0)
            p=self.raster(tmp,[[32767,0],[0,0]])
            self.assertEqual(m.summarize_raster(p,box(0,0,2000,2000),1)["status"],"UNAVAILABLE")
            self.assertEqual(m.summarize_raster(p,box(5000,5000,6000,6000),1)["status"],"UNAVAILABLE")

    def test_dates_hash_empty_sources(self):
        now=dt.date(2026,11,24)
        for d in ("2026-11-25","2017-02-01","2026-02-30"):
            with self.assertRaises(ValueError):
                m.source_date(d,now)
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/"input"
            p.write_text("test")
            with self.assertRaises(ValueError):
                m.checked_file({"file":"input","sha256":"wrong"},Path(tmp))
            result=m.compile_candidate({"day":"2026-11-23","accessed":"2026-11-24","reviewedOriginalValues":True,"basins":{},"products":{}},Path(tmp),now)
            self.assertEqual(result["status"],"CANDIDATE")
            self.assertEqual(len(result["stations"]),3)
            self.assertTrue(all(not r["products"] for r in result["stations"]))

if __name__=="__main__":
    unittest.main()
