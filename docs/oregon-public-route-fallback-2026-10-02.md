# Oregon coastal public-route fallback

The canonical Oregon Coast pages are served as first-party static files from `chrisizworski-com` under `/national-tools/coastal/oregon/`.

Decision logic remains owned by `izworskic/national-coastal-water`. The main site calls that specialist service through `/api/oregon-coastal-proxy`, which targets the specialist API directly rather than relying on a nested clean-path rewrite.

This deliberately separates:

- public canonical route ownership: `chrisizworski-com`
- Oregon decision logic and source model ownership: `national-coastal-water`

The fallback exists because the generic cross-project `/national-tools/coastal/:path*` rewrite produced production `404_NOT_FOUND` responses for the Oregon nested pages even while the specialist deployment itself was green.
