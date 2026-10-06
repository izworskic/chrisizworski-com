# Petoskey Wine static export provenance

The source of truth for this section is the owner repository, `izworskic/petoskey-wine-region`. Main does not develop Petoskey tool behavior; it deploys the reviewed static export beneath `public/petoskey-wine/`.

The owner change landed in PR #4 at merge commit `f33ffde110807e086df2da1253d32d0d62af32e8`. The exact source build was commit `9fc8401922d05b56810848e56ef85da55f84a7bf`, verified in GitHub Actions run `37422724787` and artifact `11394081089`. The downloaded archive was 590,761 bytes with SHA-256 `885fa3c27fde5e2122ca7cfbb6bab0aa9a060d4e5c09547f3739ddb19daa4510`. It contains the static assets, crawler text exports and 33 canonical content-page HTML files.

The main repository overlays those owner-built files into the vendored output and regenerates `public/sitemap-petoskey-wine.xml` from the 33 HTML routes. The sitemap content date is October 6, 2026, matching the owner source build's America/Detroit calendar date. The merge preserves any older hashed static assets already referenced by public cacheable URLs while the new export supplies its current assets.

The shared emitted/live audit checks the registered Petoskey root canonical. The owner repository's page tests cover the source page family; the main creator-entity contract also checks all 33 vendored canonical pages for the canonical Person definition, visible credit, readable heading/text, canonical URL, indexability, Tools discovery link, and sitemap entry. None of these checks measures ranking gains.
