"""Offline regression tests for independent, first-party forecast discovery."""
import datetime as dt
import importlib.util
import os
import sys
import unittest
from unittest.mock import patch

SCRIPTS = os.path.abspath("scripts")
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

from space_coast_weather_discovery import (
    OFFICIAL, PUBLIC_SOURCES, source_links, mission_marker,
    pdf_filename_date, local_launch_date, match_direct_candidates,
    inspect_sources,
)

SPEC = importlib.util.spec_from_file_location(
    "official_weather_worker", "scripts/monitor-space-coast-official-weather.py"
)
worker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(worker)

NOW = dt.datetime(2026, 11, 1, 20, tzinfo=dt.timezone.utc)
A = {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "name": "Falcon 9 Block 5 | Starlink Group 10-43",
    "net": "2026-11-03T12:30:00Z",
}
B = {
    "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "name": "Falcon 9 Block 5 | Starlink Group 10-44",
    "net": "2026-11-04T12:30:00Z",
}
PDF_A = "https://" + OFFICIAL + "/assets/LaunchForecasts/Falcon%209%20Starlink%2010-43%20L-1%20Forecast%20-%203%20Nov%20Launch.pdf"
PDF_A_OLD = PDF_A.replace("L-1", "L-2")
PDF_B = PDF_A.replace("10-43", "10-44").replace("3%20Nov", "4%20Nov")
BASE = PUBLIC_SOURCES[0][1]


class IndependentWeatherDiscoveryTest(unittest.TestCase):
    def test_first_party_page_can_nominate_explicit_document_url(self):
        body = (
            '<a href="' + PDF_A + '">Official forecast</a>'
            '<a href="https://cdn.kscwx.com/a.pdf">Unofficial mirror</a>'
            '<a href="//evil.example/assets/LaunchForecasts/p.pdf">Spoof</a>'
            '<script>let pdf="' + PDF_B + '"</script>'
        ).encode()
        self.assertEqual(source_links(body, BASE, "html", worker.official_pdf_url), [PDF_A])

    def test_official_relative_links_resolve_but_escape_does_not(self):
        body = ('<a href="/assets/LaunchForecasts/' +
                PDF_A.split("/")[-1] + '">PDF</a>').encode()
        self.assertEqual(source_links(body, BASE, "html", worker.official_pdf_url), [PDF_A])
        with self.assertRaisesRegex(ValueError, "source-too-large"):
            source_links(b"x" * 700_000, BASE, "html", worker.official_pdf_url)

    def test_sitemap_explicit_pdf_urls_only(self):
        xml = ('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
               '<url><loc>' + PDF_A + '</loc></url>'
               '<url><loc>https://cdn.kscwx.com/forecast.pdf</loc></url>'
               '</urlset>').encode()
        self.assertEqual(source_links(xml, PUBLIC_SOURCES[1][1], "xml",
                                      worker.official_pdf_url), [PDF_A])

    def test_match_only_one_exact_launch_identifier_and_valid_day(self):
        matches = match_direct_candidates([PDF_A, PDF_B], [A, B],
                                          worker.official_pdf_url)
        self.assertEqual(matches[A["id"]], [PDF_A])
        self.assertEqual(matches[B["id"]], [PDF_B])
        self.assertEqual(mission_marker(A["name"]), "starlink:10-43")
        self.assertEqual(mission_marker(PDF_A.replace("%20", " ")), "starlink:10-43")
        self.assertEqual(local_launch_date(A), dt.date(2026, 11, 3))
        self.assertTrue(pdf_filename_date(PDF_A, 2026))

    def test_spoofed_name_and_date_or_ambiguous_identity_fail_closed(self):
        wrong_date = PDF_A.replace("3%20Nov", "20%20Nov")
        self.assertEqual(match_direct_candidates([PDF_B, wrong_date], [A],
                                                 worker.official_pdf_url), {})
        self.assertEqual(match_direct_candidates([PDF_A], [A, dict(A, id=B["id"])],
                                                 worker.official_pdf_url), {})

    def test_latest_l1_preferred_and_candidates_deduped(self):
        matches = match_direct_candidates([PDF_A_OLD, PDF_A, PDF_A],
                                          [A], worker.official_pdf_url)
        self.assertEqual(matches[A["id"]], [PDF_A, PDF_A_OLD])

    def test_page_failure_records_unavailable_not_zero_forecasts(self):
        def fail(*args):
            raise RuntimeError("official-source-403")
        got, health = inspect_sources([A], fail, worker.official_pdf_url)
        self.assertEqual(got, {})
        self.assertEqual(len(health), 3)
        self.assertTrue(all(r["status"] == "unavailable" for r in health))

    def test_official_page_success_without_pdf_links_reports_coverage_gap(self):
        def fake_download(address, limit, accept):
            return b"<html><a href='/pages/help.html'>FAQ</a></html>"
        got, health = inspect_sources([A], fake_download, worker.official_pdf_url)
        self.assertEqual(got, {})
        self.assertTrue(all(r["status"] == "checked-no-links" for r in health))

    def test_official_document_found_without_any_ll2_update_link(self):
        schedule = {"results": [A]}
        def fake_json(url):
            return schedule if "/upcoming/" in url else {"updates": []}
        def fake_download(url, limit, accept=""):
            if url == PDF_A:
                return b"%PDF-verification-fixture"
            raise ValueError("should not fetch another PDF")
        def fake_parse(data, url, mission):
            self.assertEqual(url, PDF_A)
            return {"missionId": mission["id"], "sourceUrl": url}
        health = [{"id":"45ws-forecast-support", "status":"links-found", "links":1}]
        with patch.object(worker, "get_json", side_effect=fake_json), \
             patch.object(worker, "inspect_sources",
                          return_value=({A["id"]:[PDF_A]}, health)), \
             patch.object(worker, "download", side_effect=fake_download), \
             patch.object(worker, "parse_official_pdf", side_effect=fake_parse):
            out = worker.collect(NOW)
        self.assertEqual(out["verified"], 1)
        self.assertEqual(out["reports"][0]["discoveredVia"], "45ws-public-page")
        self.assertEqual(out["discoveryStatus"], "ok")

    def test_ll2_fallback_preserved_when_official_pages_blocked(self):
        schedule = {"results": [A]}
        def fake_json(url):
            return schedule if "/upcoming/" in url else {
                "updates": [{"info_url": PDF_A, "comment": "200% GO"}]}
        def fake_parse(data, url, mission):
            return {"missionId": mission["id"], "sourceUrl": url}
        health = [{"id":"45ws-forecast-support", "status":"unavailable", "links":0}]
        with patch.object(worker, "get_json", side_effect=fake_json), \
             patch.object(worker, "inspect_sources",
                          return_value=({}, health)), \
             patch.object(worker, "download", return_value=b"%PDF-fake"), \
             patch.object(worker, "parse_official_pdf", side_effect=fake_parse):
            out = worker.collect(NOW)
        self.assertEqual(out["verified"], 1)
        self.assertEqual(out["reports"][0]["discoveredVia"], "ll2-update-link")
        self.assertEqual(out["discoveryStatus"], "partial")

    def test_same_pdf_is_fetched_only_once_across_independent_and_ll2_sources(self):
        schedule = {"results": [A]}
        calls = []
        def fake_json(url):
            return schedule if "/upcoming/" in url else {
                "updates": [{"info_url": PDF_A, "comment": "untrusted 100%"}]}
        def fetch(url,limit,accept=""):
            calls.append(url)
            return b"%PDF-fake"
        with patch.object(worker, "get_json", side_effect=fake_json), \
             patch.object(worker, "inspect_sources",
                          return_value=({A["id"]:[PDF_A]}, [])), \
             patch.object(worker, "download", side_effect=fetch), \
             patch.object(worker, "parse_official_pdf",
                          return_value={"missionId":A["id"],"sourceUrl":PDF_A}):
            out=worker.collect(NOW)
        self.assertEqual(calls,[PDF_A])
        self.assertEqual(out["verified"],1)


if __name__ == "__main__":
    unittest.main()
