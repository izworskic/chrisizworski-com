# XC live ownership record

Status date: 2026-08-18

## Production surface

- Live application: `https://xcski.chrisizworski.com/`
- Search/authority owner: `https://chrisizworski.com/michigan-cross-country-skiing/`
- Controlled repository: `izworskic/chrisizworski-com`

## What is established

The live XC application predates its listing in the core repository. Commit `f8e408903e28ffa7dbb669fbe7174a6bb5efe882` states that `xcski.chrisizworski.com` had already been live on its own subdomain since early July 2026 and describes a 48-trail application with live snow depth, new snowfall, and trailhead temperature.

A recursive inspection of the complete Git tree at that commit contains no XC application source. The historical `add/xcski-tool` branch is not an application-source branch: it has no commits ahead of the core repository history that introduced the listing. Searches across repositories available to the connected GitHub account found no separate XC/ski application repository. The connected Vercel team likewise contains no XC/ski project.

## Governance conclusion

The live application is a known production dependency whose source/deployment ownership is **not recovered in the connected estate**. That is different from saying the application is broken or abandoned. It means this repository cannot safely mutate its production implementation.

The winter-engine scorecard therefore keeps the 15-point XC operability penalty in full.

## Stop-loss rule

Do not change, replace, redeploy, or make authoritative grooming claims on behalf of `xcski.chrisizworski.com` until its source and deployment owner are recovered. Safe work from this repository is limited to:

- the main-domain Michigan XC authority/planning page;
- links and measured handoffs to the live XC application;
- fixed trail facts tied to operator/public-agency sources;
- weather, snow, and camera signals explicitly labeled as screening context;
- operator/groomer links as the final trail-condition source.

If the live source is later found, put it under explicit version control and deployment ownership before changing the production app. At that point the governance penalty can be reevaluated against evidence rather than removed by assumption.

## Winter freeze rule

After the final winter-hardening merge, do not add winter features merely to raise a build score. Reopen winter product work only for one of these triggers:

1. a production bug or broken source/feed;
2. a safety or trust defect;
3. recovered XC source/deployment ownership;
4. enough in-season Search Console or first-party behavior data to identify a measured loss;
5. a material change to an authoritative upstream data source.

Absent one of those triggers, collect the winter data and leave the system alone.
