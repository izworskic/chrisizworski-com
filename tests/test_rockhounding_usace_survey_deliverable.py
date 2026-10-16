"""Offline regression: original USACE survey ZIP source, IGLD85 and polygon fail-closed."""
import datetime as dt
import importlib.util
import io
import json
import pathlib
import unittest
import zipfile
DIR=pathlib.Path(__file__).parents[1]/"scripts/rockhounding"
def script(filename,name):
 spec=importlib.util.spec_from_file_location(name,DIR/filename)
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
catalog=script("audit-usace-2026-deliverable.py","usace_catalog_source")
archive=script("inspect-usace-2026-zip.py","usace_original_zip")
def make_zip(vertical="IGLD 85",members=None):
 content=(
  "<metadata><spref><vertdef><altsys>"
  f"<altdatum>{vertical}</altdatum><altunits>US Survey Foot</altunits>"
  "</altsys><depthsys><depthdu>US Survey Foot</depthdu></depthsys>"
  "</vertdef></spref></metadata>")
 f=io.BytesIO()
 with zipfile.ZipFile(f,"w") as z:
  for name,data in (members or {
   "GR_01_MAS_20260730_CS.XML":content,
   "ReadMe_Survey_Data_Format.txt":"IGLD 85 US Survey Foot depth",
   "GR_01_MAS_20260730_CS.XYZ":"26505391.37 694557.1 -23.59\n26505392.08 694547.13 -22.92\n"
  }).items():z.writestr(name,data)
 return f.getvalue()
class OriginalUSACESurveyTests(unittest.TestCase):
 def test_known_2026_source_url_and_survey_spatial_projection_pinned(self):
  self.assertIn("OBJECTID%3D125722",catalog.metadata_url())
  self.assertTrue(catalog.ZIP.endswith("_20260730_CS.ZIP"))
  self.assertIn("Michigan_North_FIPS_2111_Feet",catalog.validate({
   "attributes":{"OBJECTID":catalog.OID,"sdsfeaturename":"Grand Marais Harbor",
   "sourcedatalocation":catalog.ZIP,"plotsheetlocation":catalog.PDF,
   "sourceprojection":"NAD_1983_StatePlane_Michigan_North_FIPS_2111_Feet",
   "usacedistrictcode":"CELRE",
   "surveydateend":int(dt.datetime(2026,7,30,tzinfo=dt.timezone.utc).timestamp()*1000),
   "sourcedatacontent":"original.XYZ, original.XML, ReadMe_Survey_Data_Format.txt"},
   "geometry":{"rings":[[[-85.972,46.675],[-85.969,46.675],[-85.969,46.686],[-85.972,46.686],[-85.972,46.675]]]}
  })["sourceProjectionLiteral"])
 def test_survey_polygon_contains_channel_not_beaches(self):
  ring=[[(-85.972,46.675),(-85.969,46.675),(-85.969,46.687),(-85.972,46.687)]]
  self.assertTrue(catalog.polygon_contains((-85.970,46.682),ring))
  self.assertFalse(catalog.polygon_contains((-85.9839,46.6719),ring))
  self.assertFalse(catalog.polygon_contains((-85.9853,46.676),ring))
 def test_bounded_zip_decrypts_numeric_xyz_and_exact_vertical_source_metadata(self):
  parsed=archive.inspect_zip(make_zip())
  self.assertEqual(parsed["xyzNumericPreview"][0]["parsedNumericRows"],2)
  self.assertEqual(parsed["xyzNumericPreview"][0]["rawStatePlaneFeetXYZRanges"][2],[-23.59,-22.92])
  self.assertEqual(parsed["reportedCoordinateReference"]["verticalDatumReportedByOriginalXML"],"IGLD 85")
  self.assertEqual(parsed["reportedCoordinateReference"]["ZUnitsReportedByOriginalXML"],"US Survey Foot")
  self.assertFalse(parsed["verticalDatumIndependentlyReconciled"])
  self.assertIsNone(parsed["safeNavigableClearance"])
  self.assertFalse(parsed["canPredictStoneExposure"])
 def test_wrong_vertical_datum_rejected_before_reporting_depth(self):
  with self.assertRaisesRegex(ValueError,"vertical metadata"):
   archive.inspect_zip(make_zip(vertical="NAVD88"))
 def test_path_traversal_in_survey_zip_rejected(self):
  payload={"../STOLEN.XYZ":"1 2 3","GR_01_MAS_20260730_CS.XML":"source","ReadMe_Survey_Data_Format.txt":"readme"}
  with self.assertRaisesRegex(ValueError,"Unsafe"):
   archive.inspect_zip(make_zip(members=payload))
 def test_both_sites_are_not_automatically_cleared_by_harbor_channel_survey(self):
  self.assertFalse(catalog.polygon_contains(catalog.POINTS["bayshore-park-approx"],
   [[(-85.973,46.675),(-85.969,46.675),(-85.969,46.686),(-85.973,46.686)]]))
if __name__=="__main__":unittest.main()
