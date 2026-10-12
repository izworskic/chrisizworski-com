# Redis removal

The main site uses private Postgres state in the existing free-plan Supabase
project `hzsydskkscdtytimtjqc`. Daily public Gazette and fall-color editions keep
using their existing GitHub data branches. No Redis fallback is permitted.

`lib/tool-state.js` sends a current, awaited Vercel OIDC identity with each
request. The authenticated `tool-state` function checks the signature, issuer,
audience, team, project ID, project name and token times. Only explicitly
registered projects can call it. Production and preview namespaces are separate.
The database service key stays inside the Supabase function.

`supabase/tool-state.sql` defines private TTL values, ordered watch indexes,
sets and lists. The RPC is SECURITY INVOKER, restricted to service_role, with
an empty search_path. Private tables have RLS, no public policies and no
anon/authenticated grants. No-policy advisor INFO notices are intentional deny
by default, not a request to create public policies. Seed-store tables remain
separate and are not available through this endpoint.

The adapter preserves ordered missing MGET values, NX leases, token-owned
lease release, EX/PX expiry, sorted score ranges and existing alert timing.
Large values are compressed before storage to reduce bandwidth. Existing
private GSC report retention remains 400 days. Expired values are excluded
from every read and are removed in bounded batches.

Before closing Upstash, audit all Vercel project environment-variable names,
verify replacement production deployments, and remove obsolete Redis variables.
The October 12 audit covered all 82 projects and found 12 with Redis settings,
all referencing winning-dogfish-39241.upstash.io. Some were obsolete settings or
retired deployments; active standalone consumers require owner-repo changes.

Upstash's Gazette database is actually Free Tier with $0.00 current cost,
104K/500K commands, 8 MB storage and 10GB/10GB monthly bandwidth. It is
suspended by bandwidth, and its console disables CLI, Data Browser and exports.
No backup is available there. Old Redis-only records cannot be reported as
migrated until recovered. Keep the database intact until explicit confirmation
of permanent deletion or a successful export; do not upgrade to a paid plan or
turn on auto-upgrade to work around the migration.

Verified local checks and backend setup are recorded in the session handoff.
Completed PR and deployment results should be recorded on the repair PR.
