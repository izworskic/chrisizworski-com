# Technology Fit Review: select the smallest capable stack

Run this review during Experience Investment PROPOSE, REVIEW, or IMPLEMENT for every substantial tool or redesign. It is **mandatory as a decision**, not a mandate to add a language, engine, framework, or build step. Tiny CSS/copy fixes may record "existing HTML/CSS appropriate" in one line.

## Ask about the visitor outcome first

1. Name the evidence-backed visitor problem: first answer too slow, source data inconsistent, a computational model incomplete, a map interaction unclear, or seasonal copy stale. What measurement establishes the problem?
2. Inventory **actual** languages/runtimes in the owning repository, deployment environment, dependencies, services, tests and other shared engines. Never assume a site must use Java, Python, Rust, React or WebGL because they are available.
3. Compare **HTML/CSS, browser JavaScript/TypeScript, existing Node.js backend, Python, Rust/WASM, Java**, and any relevant existing shared service. For each, mark **keep**, **consider**, or **reject**, with a concrete benefit, evidence, cost and risk. "Not needed" is a legitimate and often optimal result.
4. Decide where work belongs: semantic first-screen HTML/CSS; browser state; build-time ETL/validation; request-time API; optional offline compute. Preserve correct source ownership and data/provenance flow.
5. Demand a measured trigger before a language migration: profile runtime CPU, API latency breakdown, bundle transfer, long tasks, Core Web Vitals or data-validation errors. Never prescribe Rust merely for performance, Python merely for analysis, or Java merely for backend maturity.
6. State rollout/rollback and test paths, including deterministic fixtures and failure/unknown states. Verify CDN/cache, mobile, SEO indexability, accessibility, source-age labels, AdSense, security, rights and Vercel function/build costs. No Redis by default.

## Language fit

| Technology | Appropriate use | Avoid |
| --- | --- | --- |
| Semantic HTML / scoped CSS | Fast indexed explanation, accessible form and result, source evidence, no-JS alternative | Decorative layouts that bury the answer |
| Browser JavaScript / TypeScript | Typed/voice input, tabs, state changes, synchronized map and comparisons | New runtime for static prose; heavy bundles for a few buttons |
| Existing Node.js / serverless | Small APIs, approved data adapters, cached/source-timestamped response | Function proliferation or duplicating a working service |
| Python | Offline climate/statistical QA, station provenance audits, build-time ETL, fixtures | Per-visitor Python service without measured need |
| Rust / WASM | Proven CPU bottleneck, dense repeated geospatial or numerical processing that materially benefits | Rewriting simple formulas or adding WebAssembly to render a static page |
| Java | Existing Java integration, required mature library or service with a documented operational owner | New JVM stack for an already-working Node.js tool |
| Existing map/chart/3D library | Documented feature gap with verified data, fallback and accessibility | Map or animation as a decorative centerpiece |

## Required deliverable

Include a short **Technology Fit Review** in the project decision record, even when the answer is "keep the stack":

- Visitor outcome + current architecture + actual measurement or "NOT MEASURED".
- Candidate technologies (HTML/CSS, JavaScript, Python, Rust, Java and relevant shared services), each with an accept/reject reason.
- Selected solution with data/provenance implications, expected complexity, security/ops/cost, browser and API behavior.
- Trigger that would justify revisiting the decision; explicit rollback.
- Exact proof: tests, failure cases, browser evidence, latency/cost benchmark if performance is claimed. No speed or conversion assertion without measured before/after.

### White Christmas example

Use the existing HTML/CSS for indexed city guides and browser JavaScript for the choice between falling snow and snow on the ground. Keep Node.js for station and forecast API integration. Consider offline Python to audit 1991-2020 snow-depth station records, missing years and station mismatch before changing probability copy. Do not replace the simple probability arithmetic with Rust or stand up a Java server without profiling and a demonstrated functional benefit. A calendar rollover belongs in the existing Node build process, not a new visitor API.

## Gate

If technology fit is absent for a substantial investment, the review is incomplete. If the chosen solution expands infrastructure without a documented visitor benefit and measured/credible need, return to the smallest practical option. Existing repository hard gates always govern the final release.
