# Michigan Boat Launch Finder — live source audit

Audit date: 2026-08-19  
Source: Michigan DNR Parks & Recreation `PRDBASPublicView/FeatureServer/0`  
Reproducible command: `npm run audit:boat-launch-source`  
First GitHub-hosted audit: Agent branch verification run 224 / workflow run 32255308912

## Finding that explains the production zero-result failure

The live DNR layer returned 64 records that met the V3 strict Great Lakes qualification used by the audit: open boating-access site, a `Yes*` Great Lakes connection, valid published coordinates, no reference-only status, and no nonblank DNR review flag.

**All 64 of those records had a blank/null `facilityid`.**

The V2 API required `facilityid IS NOT NULL` and its browser normalizer also rejected records without `facilityid`. As a result, the V2 architecture could reduce a real source inventory to zero even though stable authoritative `globalid` and `OBJECTID` values were present.

V3 therefore uses this source identity order:

1. `facilityid` when supplied;
2. otherwise `globalid`;
3. otherwise `OBJECTID`.

A blank optional facility number is no longer grounds to discard a valid DNR record.

## Live layer counts

- Total layer records: **1,202**
- Boating Access Site records: **1,189**
- Open boating-access records: **1,152**
- Strict source-qualified open Great Lakes-access records: **64**
- Qualified records with blank/null `facilityid`: **64**
- Open reference-only records: **0**
- Open records with `flag=InProgress`: **347**
- Qualified Grant-In-Aid records: **5**

Open boating-site Great Lakes connection values in the audit:

- `Yes, within 0.5 miles`: **112**
- `Yes, 0.5 - 2 miles`: **19**
- `No, within 2 miles but navigational obstacle present`: **6**
- `No, greater than 2 miles or does not connect (inland lake, etc.)`: **1,014**
- null: **1**

The strict 64-record production-qualified set is smaller than the 131 open `Yes*` records because V3 withholds any record carrying a nonblank DNR review flag rather than presenting review-in-progress data as verified.

## Examples of valid records that V2 erased

| Launch | DNR stable identity | Coordinates |
|---|---|---|
| Harrisville State Park | `globalid=db4bb2d4-565a-4b05-bdd3-7e126a758d2f` | 44.6456823, -83.29561233 |
| Black River Mouth | `globalid=ae6f181a-9477-4217-9338-b69345e526b6` | 44.81530166, -83.302096 |
| Rockport | `globalid=6cd4ab1e-bda1-4c15-aa4f-a4b961476872` | 45.20214169, -83.38175752 |
| Snug Harbor | `globalid=0baaece9-6a1e-4749-8dbe-a7d3d8c07e51` | 44.90347084, -83.39499944 |
| Au Gres River Mouth | `globalid=f987069b-a9ae-4d69-9255-c48b43b16bb3` | 44.02691834, -83.67911213 |
| Pine River Mouth | `globalid=bb212273-eb21-4d76-aed7-7393ed62d151` | 43.9766555, -83.85643563 |

## Acceptance-destination coverage from the strict DNR set

Straight-line source-record distance, before any supplemental public-launch registry:

| Destination | Qualified launches within 25 mi | Nearest examples |
|---|---:|---|
| Bay City | 3 | Saginaw River Mouth 3.7 mi; Quanicassee River 10.4 mi; Coggins Road 14.5 mi |
| Tawas City | 4 | East Tawas 1.6 mi; Singing Bridge 9.1 mi; Au Sable River Mouth 13.4 mi |
| Alpena | 5 | Devil's River 9.6 mi; Rockport 10.0 mi; Snug Harbor 11.1 mi |
| Mackinaw City | 4 | Straits State Harbor 0.2 mi; Wilderness State Park 9.0 mi |
| Petoskey | 1 | Nine Mile Point 10.5 mi |
| Ludington | 2 | First Street 20.9 mi; Arthur Street 21.9 mi |
| Holland | 1 | Pigeon Lake 9.2 mi |
| South Haven | 0 | V3 must expand the search radius or add an independently verified public supplemental site |
| Munising | 1 | Laughing Whitefish River John H. Hammer 19.6 mi |
| Marquette | 2 | Chocolay River M-28 Bridge 4.9 mi; Laughing Whitefish River John H. Hammer 17.5 mi |
| Monroe | 3 | Bolles Harbor 3.1 mi; Sterling State Park Bartnik 3.2 mi; Halfway Creek 12.6 mi |

This is why V3 treats 25 miles as the initial search area rather than a hard cutoff. When fewer than three qualified choices exist, the UI expands transparently to the distance needed to show the nearest verified choices.

## Product consequences

- Source accuracy remains a hard gate, but inventory completeness is now tested separately from record validity.
- Destination lookup must be geospatial. A user searching `Bay City` should see launches near Bay City even when the DNR record is named for the Saginaw River or another connected waterbody.
- Missing source fields remain `not listed`; they are never inferred.
- The known false `Bay City State Park Launch` remains prohibited unless a future authoritative source establishes an actual launch there.
- South Haven and other sparse destinations are explicit supplemental-research candidates after the primary V3 geospatial flow is working.
