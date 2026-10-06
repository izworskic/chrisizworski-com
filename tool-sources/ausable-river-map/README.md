# Au Sable River Map source recovery

`index.html` is the complete page recovered from the existing production host on
October 6, 2026. Its unedited SHA-1 exactly matched Vercel's original source file
identifier, as recorded in `provenance.json`.

The recovery changes only three canonical publisher references and a small,
static creator-profile credit. The title, canonical, map data, inline scripts,
FAQ, existing links, analytics and advertising integrations remain intact.

The original 50-file deployment manifest is recorded for repeatable deployment.
Only `index.html` is replaced; the other 49 source files retain their original
content hashes. Vercel can resolve these already-uploaded content hashes when
creating a preview with `deploymentId` set to the original deployment. Do not
deploy the page by itself: that would omit the APIs and share images.

Preview `dpl_3AowwfYzLbt8pGq2CzFFSFme193i` reached READY. Its source-file inventory
matches the original manifest, with exactly one changed file. The page returned
HTTP 200 with the expected new SHA-1, and both `/api/snapshot` and the `/trip`
share route returned HTTP 200.

Full auxiliary API source text remains to be recovered. The connector's file
content responses are truncated, so they must never be treated as complete
source files. The creator contract deliberately keeps this recovery pending
until those auxiliary sources are versioned; passing public HTML is a separate
claim from complete source ownership.
