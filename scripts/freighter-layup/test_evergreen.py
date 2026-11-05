"""Evergreen winter rollover: dates, evidence, idempotence and failure states.

Simulation uses the same curated registry and real page; no external requests,
ship positions, AIS, predictions, or edits to production assets.
"""
import copy
from datetime import datetime
import json
from pathlib import Path
import unittest

from evergreen import (
    assemble, current_winter, records_from_events, synchronize,
    winter_day_is_valid, winter_label,
)

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = json.loads((ROOT / "public/assets/freighter-layup-registry.json").read_text())
PAGE = (ROOT / "public/great-lakes-freighter-winter-layup/index.html").read_text()
SITEMAP = (ROOT / "public/sitemap-winter.xml").read_text()


def dt(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def sample_event(kind="arrival", confidence="confirmed", source_class="port_authority",
                 day="2027-01-17", vessel="sample-ship", harbor="superior"):
    return {
        "id": "2026-27-" + vessel + "-" + kind,
        "vessel": {"key": vessel, "name": "Sample Ship"},
        "kind": kind, "harborId": harbor, "date": day,
        "confidence": confidence,
        "summary": "Dated report about Sample Ship's winter movement.",
        "source": {
            "url": "https://port.example.org/" + kind + "-2027",
            "title": "Dated source", "publisher": "Port Authority",
            "class": source_class,
        },
    }


def ledger(active, previous=None, events=None):
    return {
        "schemaVersion": 1, "season": active, "startedAt": None,
        "updatedAt": None, "events": events or [], "previousSeasons": previous or [],
    }


class AnnualCalendar(unittest.TestCase):
    def test_november_first_uses_detroit_time_even_when_utc_day_differs(self):
        self.assertEqual(current_winter(dt("2027-11-01T03:59:59Z")), "2026-27")
        self.assertEqual(current_winter(dt("2027-11-01T04:00:00Z")), "2027-28")
        self.assertEqual(current_winter(dt("2028-11-01T03:59:59Z")), "2027-28")
        self.assertEqual(current_winter(dt("2028-11-01T04:00:00Z")), "2028-29")
        self.assertEqual(current_winter(dt("2029-04-15T12:00:00Z")), "2028-29")
        self.assertEqual(current_winter(dt("2033-11-03T14:00:00Z")), "2033-34")

    def test_valid_source_dates_are_season_scoped(self):
        self.assertTrue(winter_day_is_valid("2026-11-01", "2026-27"))
        self.assertTrue(winter_day_is_valid("2027-10-31", "2026-27"))
        self.assertFalse(winter_day_is_valid("2027-11-01", "2026-27"))
        self.assertFalse(winter_day_is_valid("2027-02-30", "2026-27"))
        self.assertEqual(winter_label("2030-31"), "Winter 2030–2031")


class EvidencePreservingArchive(unittest.TestCase):
    def test_empty_winter_is_archived_explicitly_not_erased(self):
        now = dt("2027-11-02T14:00:00Z")
        source = copy.deepcopy(REGISTRY)
        sync = synchronize(source, ledger("2027-28", [
            {"season": "2026-27", "events": []},
        ]), now)
        self.assertEqual(sync["seasons"][0]["id"], "2027-28")
        self.assertEqual(sync["seasons"][0]["state"], "upcoming_unconfirmed")
        year = next(s for s in sync["seasons"] if s["id"] == "2026-27")
        self.assertEqual(year["state"], "historical_snapshot")
        self.assertEqual(year["records"], [])
        self.assertIn("Empty", year["note"])
        self.assertEqual(len(next(s for s in sync["seasons"] if s["id"] == "2025-26")["records"]), 12)
        self.assertEqual(synchronize(sync, ledger("2027-28", [
            {"season": "2026-27", "events": []},
        ]), now), sync)

    def test_source_dated_arrivals_and_departures_are_preserved_without_new_berths(self):
        arrivals = [
            sample_event(),
            sample_event(kind="departure", day="2027-03-24"),
            sample_event(confidence="reported", source_class="journalistic_report",
                         vessel="reported-ship", harbor="sarnia"),
        ]
        # A distinct vessel name must be carried by the source rather than
        # conflated with a known other hull.
        arrivals[2]["vessel"]["name"] = "Reported Ship"
        year = {"season": "2026-27", "events": arrivals}
        rows = records_from_events(year, REGISTRY)
        self.assertEqual(len(rows), 2)
        confirmed = next(x for x in rows if x["id"] == "sample-ship")
        reported = next(x for x in rows if x["id"] == "reported-ship")
        self.assertEqual(confirmed["status"], "confirmed_historical")
        self.assertEqual(reported["status"], "reported_historical")
        self.assertEqual(confirmed["harborId"], "superior")
        self.assertEqual(confirmed["berthPrecision"], "berth_unverified")
        self.assertEqual(confirmed["events"][-1]["type"], "departure")
        self.assertEqual(confirmed["statusAsOf"], "2027-03-24")
        self.assertEqual(reported["identity"]["imo"], None)
        self.assertEqual(reported["evidenceClass"], "journalistic_report")

    def test_no_unverified_source_can_become_a_verified_historical_berth(self):
        wrong = sample_event(confidence="confirmed", source_class="community_report")
        with self.assertRaisesRegex(ValueError, "Cannot convert unverified"):
            records_from_events({"season": "2026-27", "events": [wrong]}, REGISTRY)
        unknown = sample_event(harbor="invented-dock")
        with self.assertRaises(ValueError):
            records_from_events({"season": "2026-27", "events": [unknown]}, REGISTRY)
        orphan = sample_event(kind="maintenance")
        with self.assertRaisesRegex(ValueError, "Non-arrival"):
            records_from_events({"season": "2026-27", "events": [orphan]}, REGISTRY)
        future = sample_event(day="2027-11-11")
        with self.assertRaises(ValueError):
            records_from_events({"season": "2026-27", "events": [future]}, REGISTRY)

    def test_duplicate_sources_and_backward_or_stale_current_ledger_fail_closed(self):
        one = sample_event()
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            records_from_events({"season": "2026-27", "events": [one, dict(one)]}, REGISTRY)
        with self.assertRaisesRegex(ValueError, "not Detroit current"):
            synchronize(REGISTRY, ledger("2026-27"), dt("2027-11-01T15:00:00Z"))
        with self.assertRaisesRegex(ValueError, "Unarchived prior"):
            synchronize(REGISTRY, ledger("2028-29"), dt("2028-11-01T15:00:00Z"))

    def test_many_years_retain_original_source_snapshots_without_cross_year_carryover(self):
        previous = [
            {"season": "2026-27", "events": [sample_event()]},
            {"season": "2027-28", "events": []},
            {"season": "2028-29", "events": []},
        ]
        result = synchronize(REGISTRY, ledger("2029-30", previous),
                             dt("2029-11-01T15:00:00Z"))
        self.assertEqual([s["id"] for s in result["seasons"][:4]],
                         ["2029-30", "2028-29", "2027-28", "2026-27"])
        self.assertEqual([s["records"] for s in result["seasons"][:3]], [[], [], []])
        self.assertEqual(result["seasons"][3]["records"][0]["status"], "confirmed_historical")
        self.assertEqual(sum(len(s["records"]) for s in result["seasons"]), 15)


class PublicationConsistency(unittest.TestCase):
    def test_generated_year_picker_and_history_reflect_2027_rollover(self):
        now = dt("2027-11-02T14:00:00Z")
        current = ledger("2027-28", [{"season": "2026-27", "events": []}])
        registry, history, html, sitemap = assemble(
            REGISTRY, current, PAGE, SITEMAP, now)
        self.assertIn('<option value="2027-28">2027–2028 · living season</option>', html)
        self.assertIn('data-history-pick="2026-27"', html)
        self.assertIn('data-history-season="2026-27"', html)
        self.assertIn("No source-backed layup reports", html)
        self.assertIn("Three winters.", html)
        self.assertIn('<strong id="live-season">Winter 2027–2028</strong>', html)
        self.assertIn('"dateModified":"2027-11-02"', html)
        self.assertIn('<lastmod>2027-11-02</lastmod>', sitemap)
        self.assertIn('"id": "2026-27"', history)
        self.assertFalse(registry["seasons"][0]["records"])

    def test_idempotent_html_and_sitemap_after_rerun(self):
        now = dt("2027-11-02T14:00:00Z")
        live = ledger("2027-28", [{"season": "2026-27", "events": []}])
        a, h, page, sitemap = assemble(REGISTRY, live, PAGE, SITEMAP, now)
        b, h2, page2, site2 = assemble(a, live, page, sitemap,
                                       dt("2027-11-03T14:00:00Z"))
        self.assertEqual(a, b)
        self.assertEqual((h, page, sitemap), (h2, page2, site2))
        self.assertIn('"dateModified":"2027-11-02"', page2)

    def test_missing_sitemap_or_duplicate_selector_fails_instead_of_partial_publish(self):
        live = ledger("2027-28", [{"season": "2026-27", "events": []}])
        when = dt("2027-11-02T14:00:00Z")
        with self.assertRaises(ValueError):
            assemble(REGISTRY, live, PAGE, "<urlset/>", when)
        with self.assertRaises(ValueError):
            assemble(REGISTRY, live, PAGE.replace('</select>', '</select><select id="season"></select>', 1),
                     SITEMAP, when)


if __name__ == "__main__":
    unittest.main()
