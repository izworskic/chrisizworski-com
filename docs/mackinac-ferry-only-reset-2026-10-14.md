# Mackinac Ferry-Only Reset — October 14, 2026

The owner chose to preserve the Mackinac Island ferry fare/parking decision engine and retire the wider Mackinac trip-planning experience until it can be redesigned from the ground up.

**Survivor:** /mackinac-island/ferry-planner/ including fare/children/discount calculations, dock/parking instructions, real photographs, official booking, and optional current marine/published-schedule lookup through the existing /api/mackinac-island endpoint. Never rename its canonical URL.

**Retired:** /mackinac-island/ plus /mackinac-island/plan/, /mackinac-island/where-to-stay/, /mackinac-island/dining/, /mackinac-island/things-to-do/, /mackinac-island/events/, /mackinac-island/around-the-straits/, /mackinac-island/day-trip/, /mackinac-island/with-kids/, /mackinac-island/2-day-itinerary/, /mackinac-island/from-detroit/, /mackinac-island/from-chicago/, /mackinac-island/from-traverse-city/, /mackinac-island/from-grand-rapids/, /mackinac-island/limited-walking/, /mackinac-island/bike-day/, /mackinac-island/fall/. The sixteen subpage HTML files have been removed from the public bundle, their generators disabled, their URLs excluded from the sitemap, and a temporary Vercel redirect sends existing links to the ferry page. The old root HTML remains unreachable behind a redirect to retain legacy source/test compatibility during this controlled retirement. Its code stays in Git and must not be exposed as another competing user journey.

**Unrelated tools protected:** Mackinac Bridge Live, bridge toll calculator, Michigan fall-color trackers, other tools. No original Mackinac Live API has been deleted since ferry schedule lookup uses it.

**Future:** Rebuild any new Mackinac planning tools individually around a concrete visitor decision; do not recreate the former seven-tab information architecture or generic itinerary network. Only restore a page after a clear value function, source-backed facts, mobile acceptance tests and SEO intent review.
