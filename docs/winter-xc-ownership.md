# XC live ownership record

Status date: 2026-08-18

## Production surface

- Live application: `https://xcski.chrisizworski.com/`
- Search/authority owner: `https://chrisizworski.com/michigan-cross-country-skiing/`
- Live application repository: `izworskic/xcski`
- Main-domain winter repository: `izworskic/chrisizworski-com`
- Vercel project: `xcski` / `prj_t4K5iVJQDJAj7uW5VfvFuHtYe3qb`

## Recovery evidence

The live XC application predates its listing in the core repository. Commit `f8e408903e28ffa7dbb669fbe7174a6bb5efe882` in the core repo states that `xcski.chrisizworski.com` had already been live on its own subdomain since early July 2026 and describes a 48-trail application with live snow depth, new snowfall, and trailhead temperature.

On 2026-08-18 Claude recovered the actual running application from the Vercel deployment-files API into `izworskic/xcski`. Recovery commit `052cae8410847373da34c2ec7955061d3de7cae2` records the provenance. The recovered `index.html` was byte-identical to production at recovery time with SHA-256:

`78283130a996cf4d3268fc519743435b52464b56e61f221ce1f34b6555c78c95`

The recovered repo identifies the historical Vercel project and deployment, and Vercel's GitHub integration now reports successful deployments from `izworskic/xcski`. PR #2 in that repo exposed the same production project ID through the Vercel bot and produced a Ready preview from the recovered repository.

## 2026-27 hardening

The recovered production artifact remains unchanged as the source-of-record. Merge commit `28171070eb3e2195af843e5e6e4e735c9ada8cc9` adds a deterministic static build that generates the deploy output and fails Vercel deployment if the winter trust boundary regresses.

The production build now enforces:

- all 48 existing trail cards remain present;
- `https://xcski.chrisizworski.com/` remains the single live XC canonical;
- Open-Meteo snow depth, recent snowfall, and temperature are screening signals, not grooming/open/skiability claims;
- every trail retains an operator or land-manager `Verify trail status` path as final truth;
- the regional modeled-snow signal carries a Michigan-time freshness stamp;
- the live app hands back to the main-domain Michigan XC planning authority without creating another search owner;
- no cookies, browser storage, geolocation, or fingerprinting are introduced.

Post-merge GitHub status for `28171070eb3e2195af843e5e6e4e735c9ada8cc9` is Vercel `success`.

## Governance conclusion

XC source ownership and Git-to-Vercel deployment ownership are **recovered**. The old 15-point orphan/operability penalty no longer applies.

The remaining control rule is narrower: a green GitHub/Vercel status proves the repository deployment built successfully, but a merge must not be described as visible on the custom domain until the custom domain is separately verified. This is a deployment-verification rule, not an ownership penalty.

## Trust boundary

The live application may use model/weather signals to help a skier narrow choices. It must not use those signals to state or imply that a trail is open, groomed, safe, or skiable today. Operator/groomer/land-manager reports remain the final trail-status source.

The main-domain authority page may continue to provide planning comparisons, regional context, cameras, and measured handoffs. It should not compete with the live subdomain for the primary conditions-tool intent.

## Winter freeze rule

After this ownership recovery and trust hardening, do not add winter features merely to raise a build score. Reopen winter product work only for one of these triggers:

1. a production bug or broken source/feed;
2. a safety or trust defect;
3. a deployment ownership/control regression;
4. enough in-season Search Console or first-party behavior data to identify a measured loss;
5. a material change to an authoritative upstream data source.

Absent one of those triggers, collect winter data and leave the system alone.
