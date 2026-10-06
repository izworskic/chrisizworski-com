# Michigan Ice main mirror identity sync

The main site owns the deployed `/michigan-ice/` shell and preserves its existing title, heading, body, live map/runtime, ads, API behavior, and routes. The owner repository remains authoritative for the canonical Person and author/publisher graph.

Source evidence: `izworskic/michigan-ice-report` merged commit `536ac877ddaa37ef6b1fc639603ad03e5ac71d59`; full-history generation and 10-page identity check passed in Actions run `37428107043` (job `112152314493`). The emitted owner artifact (artifact `11396100697`) records generated-file SHA-256 `cd9ded6bc78a900b5c4cd1dfbb0f728fa4c36935cd0a53cf9a6af256bf76bdec` and ZIP SHA-256 `c4720b7e54963d2d1a635f5cd05e376acbaeea2d9cf4885702aad3862f83aaf1`.

The main mirror's canonical Person was already complete and matched the owner's verified homepage URL and sameAs values. Only seven main HTML files lacked a publisher edge on nodes matched by canonical `@id`: the root WebSite and WebPage, and six regional WebPages. This sync adds those publisher references and advances any matching existing `dateModified` values and sitemap lastmod dates to the actual October 6, 2026 metadata edit. The three main Article pages already had the owner-matched author and publisher references and remain unchanged. No generated HTML was replaced wholesale.
