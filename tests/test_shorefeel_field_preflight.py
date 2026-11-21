"""Synthetic co-location gate tests. No site permissions or installed sensors assumed."""
import importlib.util
import io
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "scripts" / "shorefeel-field-preflight.py"
SPEC = importlib.util.spec_from_file_location("shorefeel_field_preflight", PATH)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)
NOW = datetime(2026, 11, 21, 16, tzinfo=timezone.utc)
START = datetime(2026, 7, 1, 0, tzinfo=timezone.utc)
MANIFEST = {
    "schema": "shorefeel.field-logger-bench.v1",
    "coLocatedSameExposure": True, "benchSitePermissionDocumented": True,
    "distanceBetweenSensorsM": 1.1,
    "devices": [
        {"stationId": "SYNTHETIC-A", "radiationShielded": True,
         "sameLoggerModelAsPartner": True, "sensorHeightM": 1.5,
         "calibratedOn": "2026-06-10"},
        {"stationId": "SYNTHETIC-B", "radiationShielded": True,
         "sameLoggerModelAsPartner": True, "sensorHeightM": 1.5,
         "calibratedOn": "2026-06-10"}
    ]
}


def readings(*, bias=.1, points=301, offset=0, flagged=False, conflict=False):
    a = ["observed_at_utc,temperature_c,quality_flag"]
    b = list(a)
    for i in range(points):
        t = START + timedelta(minutes=i*5)
        u = t + timedelta(minutes=offset)
        c = 19 + 4*((i%288)/288)
        a.append(f"{MOD.stamp(t)},{c:.5f},valid")
        b.append(f"{MOD.stamp(u)},{c+bias:.5f},{'invalid' if flagged and i==12 else 'valid'}")
    if conflict:
        a.append(f"{MOD.stamp(START)},{45},valid")
    return io.StringIO("\n".join(a)+"\n"), io.StringIO("\n".join(b)+"\n")


class PreflightBench(unittest.TestCase):
    def audit(self, manifest=None, **kwargs):
        a, b = readings(**kwargs)
        return MOD.audit(MANIFEST if manifest is None else manifest, a, b, now=NOW)

    def test_complete_stable_instrument_agreement_only_qualifies_for_review(self):
        r = self.audit()
        self.assertEqual(r["status"], "BENCH_AGREEMENT_FOR_REVIEW")
        self.assertEqual(r["coverage"]["paired"], 301)
        self.assertEqual(r["coverage"]["spanHours"], 25)
        self.assertTrue(all(r["checks"].values()))
        self.assertAlmostEqual(r["differences"]["meanFirstMinusSecondF"], -.18, places=3)
        for guard in ("absoluteAccuracyCertified", "fieldSitingVerified",
                      "landManagerPermissionVerified", "deploymentApproved",
                      "automaticBiasCorrection", "publicationAuthorized"):
            self.assertIs(r[guard], False)

    def test_missing_night_samples_and_too_short_interval_fail(self):
        r = self.audit(points=100)
        self.assertEqual(r["status"], "BENCH_INSUFFICIENT_OR_DISAGREES")
        self.assertFalse(r["checks"]["pairedSamples200"])
        self.assertFalse(r["checks"]["full24HourSpan"])

    def test_large_bias_is_not_a_weather_gradient(self):
        r = self.audit(bias=2.0)
        self.assertFalse(r["checks"]["maeAtMost1F"])
        self.assertEqual(r["status"], "BENCH_INSUFFICIENT_OR_DISAGREES")

    def test_missing_quality_or_conflicting_duplicates_not_silently_accepted(self):
        r = self.audit(flagged=True, conflict=True)
        self.assertFalse(r["checks"]["noRejectionOrDuplicateConflict"])
        self.assertEqual(r["coverage"]["rejected"]["first"]["conflict"], 1)
        self.assertEqual(r["coverage"]["rejected"]["second"]["flagged"], 1)

    def test_clock_skew_larger_than_two_minutes_blocks_pairs(self):
        r = self.audit(offset=3)
        self.assertEqual(r["coverage"]["paired"], 0)
        self.assertEqual(r["status"], "BENCH_INSUFFICIENT_OR_DISAGREES")

    def test_no_permission_or_sensor_metadata_refuses_audit(self):
        for patch in (
            {"benchSitePermissionDocumented": False},
            {"coLocatedSameExposure": False},
            {"distanceBetweenSensorsM": 9},
        ):
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                self.audit({**MANIFEST, **patch})
        duplicate = {**MANIFEST, "devices": [MANIFEST["devices"][0]]*2}
        with self.assertRaisesRegex(ValueError, "separate instruments"):
            self.audit(duplicate)
        a = dict(MANIFEST["devices"][0], calibratedOn="2027-01-01")
        with self.assertRaisesRegex(ValueError, "future"):
            self.audit({**MANIFEST, "devices": [a, MANIFEST["devices"][1]]})

    def test_unambiguous_utc_and_dst_are_resolved_from_america_detroit(self):
        self.assertEqual(MOD.stamp(START), "2026-07-01T00:00:00Z")
        self.assertEqual(MOD.LOCAL.key, "America/Detroit")
        self.assertEqual(MOD.percentile_abs([-.7, .2, -.1], .95), .7)


if __name__ == "__main__":
    unittest.main()
