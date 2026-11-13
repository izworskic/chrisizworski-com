# Michigan snowmobile route planner: Rust/WebAssembly migration
Date: 2026-11-13

## What changed
The existing seven-region snowmobile tool continues to use Michigan DNR
designated snowmobile trail centerlines and the same region data pipeline.
`lib/snowmobile/build-region.mjs` owns DNR status, temporary closure
matching, evidence freshness and uncertain grooming. `routing.mjs`
excludes closed trail parts *before* building the graph.

The new `rust/snowmobile-routing/src/lib.rs` implements Dijkstra over the
already-filtered undirected graph. Rust receives only integer node IDs,
edge endpoint IDs and route lengths derived from DNR geometry. It returns
ordered edge IDs and direction flags. JavaScript independently validates
each returned edge and assembles all official lines, provenance, leg
mileage, weakest-scored segment and API text. Rust does **not** invent trail
connections, decide when a trail is open, label a surface rideable, or
interpret a weather forecast.

`lib/snowmobile/rust-route.mjs` validates the real WebAssembly module,
its ABI and a smoke-test graph. Missing, over-capacity, invalid, failed,
or disconnected WASM paths fall back to the preexisting, unchanged JS
Dijkstra. The existing public HTML, map controls, GA4, SEO, ad positions
and Vercel route contract are untouched.

## Build and release gate

Use pinned Rust 1.90.0 plus Node 22:

```sh
rustup toolchain install 1.90.0 --profile minimal
rustup target add wasm32-unknown-unknown --toolchain 1.90.0
rustc +1.90.0 --edition=2021 --test rust/snowmobile-routing/src/lib.rs -o /tmp/sm-rust-tests
/tmp/sm-rust-tests --test-threads=1
rustc +1.90.0 --edition=2021 --crate-type cdylib --target wasm32-unknown-unknown \
  -C opt-level=z -C codegen-units=1 -C lto=fat -C panic=abort \
  -C link-arg=--export-memory -C strip=symbols \
  -o /tmp/snowmobile-routing.wasm rust/snowmobile-routing/src/lib.rs
node scripts/build-snowmobile-rust.cjs --wasm=/tmp/snowmobile-routing.wasm
node scripts/verify-snowmobile-rust.cjs --wasm=/tmp/snowmobile-routing.wasm
node --test tests/snowmobile-routing.test.js tests/snowmobile-rust.test.js
node scripts/benchmark-snowmobile.mjs --check
```

GitHub Actions automates the pinned build, testing, generated binary parity,
and committing the verified UTF-8 WASM asset to the feature branch (only
on push to that branch). Do not merge until the generated binary is present,
source/asset parity passes, full route tests pass, and the PR checks are green.

## Safety invariants
- Never route across a segment the scored DNR graph marks closed, whether
  current or outside the active season. The JS graph builder alone enforces
  this, and the adapter independently rechecks returned edges.
- The only real trail junctions are original DNR line endpoints clustered
  under the existing 20m tolerance. Visible line crossings are **not**
  automatically legal turn points.
- Neither Rust nor JS creates a valid ride recommendation without current
  closure and local trail-surface evidence; the existing page explicitly
  labels unknown grooming and source recency.
- The route API retains its current JSON shape, including multi-stop
  legs, distance, uncertainty and official-source references.
- The WASM solver is single-threaded with a max of 4,096 nodes and 16,384
  edges; larger graphs transparently use existing JavaScript.
- The generated `lib/snowmobile/rust-binary.mjs` is compiled Rust bytes,
  NOT fabricated hand-coded WASM.
- Rust on its own is not an SEO improvement or evidence of faster pages.
  Compare observed API latency and route completion after release.
