"""Offline official-source parser regression tests; no network access required."""
import importlib.util
import os
import sys
import unittest
from unittest.mock import patch

SCRIPTS=os.path.abspath('scripts')
if SCRIPTS not in sys.path:
    sys.path.insert(0,SCRIPTS)

SPEC = importlib.util.spec_from_file_location(
    "official_weather_worker", "scripts/monitor-space-coast-official-weather.py"
)
worker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(worker)

OFFICIAL = "https://45thweathersquadron.nebula.spaceforce.mil/assets/LaunchForecasts/Falcon%209%20Starlink%2010-43%20L-2%20Forecast%20-%203%20Nov%20Launch.pdf"
MISSION = {"id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "name": "Falcon 9 Block 5 | Starlink Group 10-43"}
SOURCE = """Launch Mission Execution Forecast
Mission: Falcon 9 Starlink 10-43
Issued: 1 Nov 2026 / 1330L (1830Z)
Valid: 3 Nov 2026 / 0700 – 0900L (1200 – 1400Z)
Forecast Discussion: Conditions will change during the launch window.
Launch Day
Probability of Violating Weather Constraints
60%
Primary Concerns: Thick Cloud Layers Rule, Cumulus Cloud Rule
Weather Conditions
Upper-Level Wind Shear: Low
Booster Recovery Weather: Moderate
Solar Activity: Low
24-Hour Delay
Probability of Violating Weather Constraints
30%
Primary Concerns: Liftoff Winds
Weather Conditions
Temp/Humidity: 72 F / 90%
"""


class FakePage:
    def __init__(self, text):
        self.text = text

    def extract_text(self, extraction_mode="layout"):
        return self.text


class FakeReader:
    def __init__(self, text):
        self.pages = [FakePage(text)]


class OfficialWeatherParserTest(unittest.TestCase):
    def test_valid_official_source_and_cross_host_rejection(self):
        self.assertEqual(worker.official_pdf_url(OFFICIAL), OFFICIAL)
        self.assertIsNone(worker.official_pdf_url(OFFICIAL.replace(
            "45thweathersquadron.nebula.spaceforce.mil",
            "45thweathersquadron.nebula.spaceforce.mil.evil.com"
        )))
        self.assertIsNone(worker.official_pdf_url("https://kscwx.com/forecast/764"))

    def test_primary_pov_is_not_backup_pov_or_humidity(self):
        with patch.object(worker, "PdfReader", return_value=FakeReader(SOURCE)):
            out = worker.parse_official_pdf(b"%PDF-fakefixture", OFFICIAL, MISSION)
        self.assertEqual(out["povPercent"], 60)
        self.assertEqual(out["validDate"], "2026-11-03")
        self.assertEqual(out["issuedAt"], "2026-11-01T18:30:00Z")
        self.assertEqual(out["sourceMission"], "Falcon 9 Starlink 10-43")
        self.assertIn("Cumulus Cloud Rule", out["primaryConcerns"])
        self.assertEqual(out["additionalRisks"]["boosterRecovery"], "Moderate")

    def test_unclear_primary_percentage_is_null(self):
        with patch.object(worker, "PdfReader", return_value=FakeReader(
            SOURCE.replace("\n60%\n", "\n<5%\n")
        )):
            out = worker.parse_official_pdf(b"%PDF-fakefixture", OFFICIAL, MISSION)
        self.assertIsNone(out["povPercent"])

    def test_pdf_without_official_header_fails_closed(self):
        with patch.object(worker, "PdfReader", return_value=FakeReader(
            "Weather bulletin " * 40
        )):
            with self.assertRaisesRegex(ValueError, "mission-issued-valid"):
                worker.parse_official_pdf(b"%PDF-fakefixture", OFFICIAL, MISSION)

    def test_no_pdf_signature_refused(self):
        with self.assertRaisesRegex(ValueError, "not-pdf"):
            worker.parse_official_pdf(b"HTML error page", OFFICIAL, MISSION)


if __name__ == "__main__":
    unittest.main()
