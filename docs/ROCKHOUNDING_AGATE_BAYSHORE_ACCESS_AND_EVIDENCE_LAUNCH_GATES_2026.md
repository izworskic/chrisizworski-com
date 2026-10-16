# Grand Marais pilot: verified public beaches versus rockhounding authorization

Reviewed UTC 2026-10-16. **Research only: no live safe-visit or stone-exposure forecast.**

## Independent original public sources

- [Burt Township Agate Beach](https://burttownshipacmi.gov/recreation/agate-beach-lake-superior/): township documents a Lake Superior public beach and its historic 2005 boardwalk. [Grand Marais Chamber](https://grandmaraismichigan.com/visit-us/attractions/beaches/) identifies the traditional agate-hunting destination and gives general directions north from downtown's main street. Neither source supplies a surveyed present-day parking entrance, proves a ramp renovation completed, or grants permission to remove rocks.
- [Burt Township Bayshore Park](https://burttownshipacmi.gov/recreation/bayshore-park-public-swimming-areas/): public harbor swimming beach, bathhouse, handicap parking, playground. [Grand Marais Chamber](https://grandmaraismichigan.com/visit-us/attractions/beaches/) distinguishes the protected harbor beach from Agate and describes general downtown approach. No independently verified agate substrate, exact legal parking gate, or site collecting permission.
- [EGLE rockhounding guide](https://www.michigan.gov/egle/public/learn/geology/rockhounding) describes a general annual personal **25-pound aggregate** limit for state-owned land and applicable public-trust land, subject to local restrictions; [Michigan DNR state-owned land administrative rule R 299.922](https://ars.apps.lara.state.mi.us/AdminCode/DownloadAdminCodeFile?FileName=R+299.921+to+R+299.933.pdf&ReturnHTML=True) likewise restricts aggregate rock/mineral/invertebrate fossils removed from **state-owned** land. The state-owned land limit DOES NOT establish permission at either township beach; posted and local rules are independently unverified.

## Four separate decisions

1. **Public destination**: both facilities confirmed; general visitor approach documented; no surveyed current gate/parking route.
2. **Actual offshore disturbance**: the 2026 Grand Marais GLOS archive has **5,243 authentic open-lake wave observations**, eight sufficiently sampled offshore episodes. Not measured surf at Agate; protected Bayshore has **no separately verified harbor wave series**, so the open-lake heights cannot be assigned to its swimming beach.
3. **Actual beach rock/sediment outcome**: July 21 measured **1.62 m** offshore wave peak is the best *archival research lead* because of an approximate later photo date, but no matching pre-storm beach image. Eight episodes, **zero** verified same-camera before-and-after rock exposures. A larger offshore storm is not necessarily better for exposed rocks.
4. **Safe/lawful collection**: a fresh independent NWS hazard check, confirmed actual site-specific collecting policy and legally verified approach/parking remain essential. The absence of relevant NWS alerts never proves calm or safe surf. This historical source report DOES NOT query current hazards and DOES NOT recommend a visit.

## Implementation

- Source-locked original reference file: data/rockhounding/grand-marais-two-site-public-source-truth-2026.json, crosschecked against existing pilot-access-reviews.json and actual 2026 GLOS archive.
- Engine: lib/rockhounding/pilot-publication-readiness.cjs; seven independently auditable source/claim dimensions for each pilot, all unsupported conclusion flags false. Agate waves are offshore and Bayshore waves are unknown, not zero.
- Reproducible snapshot: scripts/rockhounding/generate-pilot-readiness.cjs writes public/rockhounding-lab/pilot-readiness-2026.json as a **noindex research** artifact, verified by node regression tests and a controlled GitHub Actions branch-only source gate. Does not poll services on public page load.
- New research-page comparison: source-linked two-column mobile-responsive Agate-versus-Bayshore presentation, scoped Michigan EGLE collection rule, separate condition/permit blockers, and July event next-research lead.
- Multiple tests reject assumed township permission, false parking GPS, transferred harbor wave heights, guessed new agates, missing original photo proof, and claim of safe conditions from a stale/historical hazard feed.

**Release status: both sites are officially documented as public destinations, but public rockhounding visit-window publishing remains blocked.** No public indexed URL, ads, canonical, sitemap, paid service, remote field trip or municipal contact modified.
