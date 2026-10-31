# Pukaskwa official-condition monitor — operational runbook

Checked: 2026-10-31
Repository: izworskic/chrisizworski-com
Public live tool status: NOT CONNECTED (data foundation only)

## Official source and limitations
https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions

Parks Canada publishes a dated HTML table, not a verified official status API and not live sensor data. The retrieval time describes our collection, while each trail's issuedOn field describes Parks Canada's separate observation date. Operating seasons and permits are independent and remain conservative. Neither a successful fetch nor an older "Open." status establishes present visitor access.

## Workflow and state
- Workflow: .github/workflows/pukaskwa-conditions-monitor.yml
- Frequency: 03:17, 09:17, 15:17, 21:17 UTC (four checks per day, subject to GitHub schedule delays/skips).
- Manual: GitHub Actions > Pukaskwa official condition monitor > Run workflow (on main).
- Request: one 15-second-bounded HTTPS request to the public Parks Canada conditions page per check.
- Output: ONLY the dedicated branch pukaskwa-conditions-data, file pukaskwa/conditions-latest.json. The data branch is created on the first run.
- No routine commit on main; no public visitor page or automatic trail reopening. A Vercel ignored-build rule is scoped ONLY to the data branch to avoid deploying the site for polling heartbeats.
- GitHub Issues: one stable issue for new condition changes and a separate issue for failures. A recovered feed closes only the failure issue.
- GitHub Actions: the workflow is red when a source fetch fails or a dated closure conflicts with a purported reopening. Thirty-day artifacts preserve the checked feed and report.

## Feed meaning
- schemaVersion: 1; park: pukaskwa.
- health: ok, review-required, or source-error.
- checkedAt: when we attempted this check.
- lastSuccessAt: last successful fetch and parse, NOT the official observation issue time.
- snapshot.retrievedAt: actual fetch timestamp for the last successfully parsed page. On failure it remains unchanged.
- snapshot.sourceRecords[].issuedOn: trail-by-trail Parks Canada reported condition date. Never replace it with fetch time.
- fingerprint: hash of sorted, normalized condition records only, EXCLUDING retrieval time. Identical source content creates no change event.
- recentChanges: bounded 40-item audit history of statuses, report dates, comments, additions/removals.
- closureHolds: a previously dated closure cannot be removed by a same-day, older or undated purported reopening. Human review required.
- consecutiveFailures: increments across polling errors; recovery resets it.

## Visitor truth safeguards
Downstream code must check source record date AND the polling heartbeat independently. Treat checkedAt or lastSuccessAt older than 18 hours as a stale monitoring service, even if the underlying Parks Canada row says Open. If health is source-error, show source unavailable and do not promote an older open row. An official Closed remains blocked unless the park publishes a strictly newer dated Open. Backcountry out-of-season restrictions remain a separate gate. These are operational guidelines, not live-publication claims.

## Alert handling
1. Condition-change issue: inspect official evidence; verify the affected hike, components, dates and park restrictions before changing any public recommendations.
2. Source-error issue: inspect run logs and failed HTTP/parser/content-state checks. A successful recovery closes only this failure issue, without implying any trail reopened.
3. Closure hold: remain closed, mark manual review and keep the GitHub Actions workflow red. Same-day open is not adequate to override a prior closure.
4. Missed schedules: GitHub schedules are best effort. They may be delayed or dropped. The checkedAt-based freshness gate is essential. A separate independent heartbeat watchdog is a later enhancement.
5. Permission errors: inspect repository Actions contents/issue write permissions; never fallback to writing on main.

## Verification
- node --test tests/pukaskwa-conditions.test.js tests/pukaskwa-condition-monitor.test.js
- node --test tests/deployment-cost-controls.test.js
- node scripts/pukaskwa/monitor-conditions.mjs --output /tmp/latest.json --report /tmp/report.json
- npm run verify:all
- Inspect the first scheduled/manual run for a durable baseline and check the data branch exists before wiring visitor-facing reads.

## Future work
Next: independent missed-run alert, source-change comparison across official advisories, verified access graph and parking GIS, then a small accessible, photo-led status card with alternatives and a CARTO map. No visitor interface, new indexable URL, map or customer-facing "open now" promise is included in this release.
