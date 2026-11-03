"""Offline scientific and source-integrity tests for the MSU 2027 ingestion gate.

Synthetic 2027 report HTML exercises the parser; it is NOT an actual 2027
publication or evidence of 2027 pest activity. The 2026 golden table uses the
previously audited 80 MSU Extension cells.
"""
import csv
import datetime as dt
import importlib.util
import json
import tempfile
import unittest
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("msu_ingest", ROOT / "scripts/ingest_msu_earworm_2027.py")
I = importlib.util.module_from_spec(spec)
spec.loader.exec_module(I)
SOURCE_2026 = ROOT / "data/garden-earworm-msu-2026.csv"
BASE_2026 = "https://www.canr.msu.edu/news/michigan-vegetable-crop-report-september-2-2026"
BASE_2027 = "https://www.canr.msu.edu/news/michigan-vegetable-crop-report-july-14-2027"
HEADINGS = ["Ottawa Co.4", "Oceana Co.4", "Washtenaw Co.3", "Monroe Co.3",
            "Saginaw Co.3", "Lapeer Co.3", "Genesee Co.3", "Midland Co"]
FOOTNOTES = ("Cloth Heliothis traps track trends but catch fewer moths overall; "
             "Wire Harstack traps capture more moths. * This is a two-week total "
             "because traps were not emptied.")


def test_html(year=2026, rows=None, headings=None, title=None, url=None,
              publication=None, notes=FOOTNOTES, extra_time="", mutations=""):
    if rows is None:
        with SOURCE_2026.open(encoding="utf-8", newline="") as f:
            rows = list(csv.DictReader(f))
        values = [[dt.date.fromisoformat(r["week"]).strftime("%B") + " " +
                   str(dt.date.fromisoformat(r["week"]).day),
                   *[r[x] for x in HEAD_ID]] for r in rows]
    else:
        values = rows
    headings = headings or HEADINGS
    url = url or (BASE_2026 if year == 2026 else BASE_2027)
    title = title or ("Michigan vegetable crop report – " +
                      ("September 2, 2026" if year == 2026 else "July 14, 2027"))
    publication = publication or ("2026-09-04" if year == 2026 else "2027-07-15")
    table = ("<table><tbody><tr>" + "".join("<th><p><strong>" + escape(x) +
              "</strong></p></th>" for x in ["Week", *headings]) + "</tr>" +
             "".join("<tr>" + "".join("<td><p>" + escape(v) +
             "</p></td>" for v in row) + "</tr>" for row in values) +
             "</tbody></table>")
    return ("<!doctype html><html><head><meta property='og:title' content='" +
            escape(title, quote=True) + "'><link rel='canonical' href='" +
            url + "'></head><body><h1>MSU Extension Vegetables</h1>" +
            "<div class='article__title'><h2>" + escape(title) + "</h2></div>" +
            "<time datetime='" + publication + "'></time>" + extra_time +
            "<h4>Sweet corn</h4><p><strong>Table 1.</strong> Corn earworm captures. "
            "Total in trap for week (avg # per night).</p>" + mutations +
            table + "<p>" + notes + "</p></body></html>")


HEAD_ID = ["ottawa", "oceana", "washtenaw", "monroe",
           "saginaw", "lapeer", "genesee", "midland"]


class MSUArchiveScientificTests(unittest.TestCase):
    def test_closed_2026_80_cells_round_trip(self):
        data = I.parse_report(test_html(), BASE_2026, 2026, dt.date(2026, 11, 3))
        self.assertEqual(len(data["counties"]), 8)
        self.assertEqual(sum(len(x["samples"]) for x in data["counties"]), 80)
        with SOURCE_2026.open(encoding="utf-8", newline="") as f:
            source = list(csv.DictReader(f))
        for c in data["counties"]:
            self.assertEqual([s["publishedCell"] for s in c["samples"]],
                             [r[c["id"]] for r in source])
        self.assertEqual(data["source"]["publishedDate"], "2026-09-04")
        self.assertEqual(data["source"]["latestCollectionWeek"], "2026-09-01")
        self.assertEqual(data["counties"][0]["samples"][7]["twoWeekTotal"], True)
        self.assertEqual(data["counties"][1]["samples"][8]["avgPerNight"], "47.4")
        self.assertEqual(data["counties"][4]["samples"][-1]["status"], "NOT_REPORTED")
        self.assertEqual(data["counties"][3]["samples"][3]["total"], 0)

    def test_august_2026_allegan_column_does_not_shift_existing_counties(self):
        # MSU's August 12 article had Allegan between Ottawa and Oceana, unlike
        # the final September table. Blank Allegan cells are ambiguous, not zero.
        headings = ["Ottawa Co.4", "Allegan Co.4", *HEADINGS[1:]]
        rows = [["August 4", "4 (0.8)", "", "13 (1.9)", "0", "2 (0.3)",
                 "2 (0.2)", "0", "0", "1 (0.1)"]]
        html = test_html(rows=rows, headings=headings)
        d = I.parse_report(html, BASE_2026, 2026, dt.date(2026, 11, 3))
        self.assertEqual(d["counties"][1]["id"], "allegan")
        self.assertEqual(d["counties"][1]["samples"][0]["status"], "MISSING_UNSPECIFIED")
        self.assertEqual(d["counties"][2]["id"], "oceana")
        self.assertEqual(d["counties"][2]["samples"][0]["total"], 13)
        self.assertIn("BLANK_CELLS_NEED_REVIEW", d["reviewFlags"])
        self.assertIn("COUNTY_ROSTER_CHANGED_FROM_2026", d["reviewFlags"])

    def test_official_listing_only_accepts_specific_same_origin_2027_reports(self):
        listing = """
          <a href='/news/michigan-vegetable-crop-report-july-14-2027'>
          Michigan vegetable crop report – July 14, 2027</a>
          <a href='https://bad.example/news/michigan-vegetable-crop-report-july-15-2027'>
          Michigan vegetable crop report – July 15, 2027</a>
          <a href='/news/michigan-vegetable-crop-report-july-2-2026'>
          Michigan vegetable crop report – July 2, 2026</a>
          <a href='/news/pest-alert-2027'>Michigan vegetable crop report 2027</a>
          <a href='/news/michigan-vegetable-crop-report-july-14-2027'>
          Michigan vegetable crop report – July 14, 2027</a>"""
        self.assertEqual(I.discover_links([listing], 2027), [BASE_2027])
        self.assertIsNone(I.article_url("https://bad.example/news/michigan-vegetable-crop-report-july-14-2027", 2027))
        self.assertIsNone(I.article_url("/news/michigan-vegetable-crop-report-july-14-2027", 2026))
        self.assertIsNone(I.article_url("/news/michigan-vegetable-crop-report-july-14-2027?utm=x", 2027))

    def test_2027_date_and_source_authority_are_both_required(self):
        values = [["July 7", "3 (0.4)", "-", "0", "2 (0.2)", "1 (0.1)", "-", "-", "0"],
                  ["July 14", "8 (1.2)", "3 (0.4)", "0", "0", "1 (0.1)", "1 (0.1)", "0", "-"]]
        good = test_html(year=2027, rows=values)
        d = I.parse_report(good, BASE_2027, 2027, dt.date(2027, 7, 16))
        self.assertEqual(d["season"], 2027)
        self.assertEqual(d["source"]["latestCollectionWeek"], "2027-07-14")
        self.assertEqual(d["source"]["publishedDate"], "2027-07-15")
        self.assertEqual(d["reviewFlags"], [])
        self.assertEqual(d["source"]["dataType"], "INDEPENDENT_REGIONAL_PHEROMONE_TRAPS")
        self.assertEqual(I.to_csv(d).splitlines()[0], "week," + ",".join(HEAD_ID))
        with self.assertRaisesRegex(I.Veto, "canonical"):
            I.parse_report(good.replace("href='" + BASE_2027, "href='https://evil.example/"),
                           BASE_2027, 2027, dt.date(2027, 7, 16))
        with self.assertRaisesRegex(I.Veto, "Publication date"):
            I.parse_report(test_html(year=2027, rows=values, publication="2027-09-25"),
                           BASE_2027, 2027, dt.date(2027, 7, 16))
        with self.assertRaisesRegex(I.Veto, "source|heading|report"):
            I.parse_report(test_html(year=2027, rows=values, title="Michigan corn earworm forecast – July 14, 2027"),
                           BASE_2027, 2027, dt.date(2027, 7, 16))

    def test_invalid_cells_row_order_and_footnotes_fail_or_flag(self):
        values = [["July 7", "3 (0.4)", "-", "0", "2 (0.2)", "1 (0.1)", "-", "-", "0"]]
        with self.assertRaisesRegex(I.Veto, "Unrecognized trap value"):
            I.parse_report(test_html(year=2027, rows=[["July 7", "Unknown", *values[0][2:]]]),
                           BASE_2027, 2027, dt.date(2027, 7, 16))
        with self.assertRaisesRegex(I.Veto, "row width"):
            I.parse_report(test_html(year=2027, rows=[values[0][:-1]]),
                           BASE_2027, 2027, dt.date(2027, 7, 16))
        with self.assertRaisesRegex(I.Veto, "increasing"):
            I.parse_report(test_html(year=2027, rows=[
                ["July 14", *values[0][1:]], ["July 7", *values[0][1:]]]),
                BASE_2027, 2027, dt.date(2027, 7, 16))
        no_footnotes = I.parse_report(test_html(year=2027, rows=values, notes=""),
                                      BASE_2027, 2027, dt.date(2027, 7, 16))
        self.assertIn("WIRE_TRAP_FOOTNOTE_NOT_VERIFIED", no_footnotes["reviewFlags"])
        self.assertIn("CLOTH_TRAP_FOOTNOTE_NOT_VERIFIED", no_footnotes["reviewFlags"])
        row_two_week = [["July 7", "3 (0.4)*", *values[0][2:]]]
        flag = I.parse_report(test_html(year=2027, rows=row_two_week,
                                        notes="Wire Harstack traps; Cloth Heliothis traps."),
                              BASE_2027, 2027, dt.date(2027, 7, 16))
        self.assertIn("ASTERISK_COLLECTION_PERIOD_NOT_VERIFIED", flag["reviewFlags"])

    def test_no_network_or_false_pest_report_before_may_2027(self):
        self.assertEqual(I.retrieve(2027, dt.date(2026, 11, 3))["status"],
                         "OUTSIDE_2027_MONITORING_WINDOW")
        self.assertEqual(I.retrieve(2027, dt.date(2027, 11, 3))["status"],
                         "OUTSIDE_2027_MONITORING_WINDOW")
        self.assertEqual(I.retrieve(2028, dt.date(2028, 7, 3))["status"],
                         "OUTSIDE_2027_MONITORING_WINDOW")

    def test_review_candidate_only_generated_on_2027_evidence(self):
        values = [["July 14", "8 (1.2)", "3 (0.4)", "0", "0", "1 (0.1)", "1 (0.1)", "0", "-"]]
        data = I.parse_report(test_html(year=2027, rows=values),
                              BASE_2027, 2027, dt.date(2027, 7, 16))
        with tempfile.TemporaryDirectory() as temporary:
            csvp, metap, jsp = (Path(temporary)/"records.csv", Path(temporary)/"source.json",
                                Path(temporary)/"candidate.js")
            originals = I.OUT_CSV, I.OUT_META, I.OUT_JS
            I.OUT_CSV, I.OUT_META, I.OUT_JS = csvp, metap, jsp
            try:
                I.stage(data)
                self.assertTrue(csvp.is_file())
                self.assertEqual(json.loads(metap.read_text())["reviewState"],
                                 "AUTOMATED_CANDIDATE_NOT_PUBLISHED_UNTIL_PR_MERGE")
                self.assertTrue(jsp.read_text().startswith("window.GardenEarwormTrap2027Data=Object.freeze("))
                self.assertIn("2027-07-14", jsp.read_text())
                newer = json.loads(json.dumps(data))
                newer["source"]["publishedDate"] = "2027-07-23"
                I.stage(newer)
                with self.assertRaisesRegex(I.Veto, "chronology"):
                    I.stage(data)
            finally:
                I.OUT_CSV, I.OUT_META, I.OUT_JS = originals


if __name__ == "__main__":
    unittest.main()
