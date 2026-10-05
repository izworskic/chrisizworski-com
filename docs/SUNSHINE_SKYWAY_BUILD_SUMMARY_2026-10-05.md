# Sunshine Skyway build summary

The Sunshine Skyway product is a decision-first I-275 crossing surface derived from the proven Mackinac, CBBT, Niagara and Maryland Bay Bridge architectures.

Key implementation choices:

- FDOT / FHP / FL511 operational evidence outranks weather.
- NWS wind is context only; 40 mph is represented as an FHP decision context, not an automatic closure trigger.
- Live FL511 traffic is read from the data path backing the official traffic table and filtered to explicit Skyway references.
- Current Florida Turnpike toll rules remain server-side.
- Vehicle treatment does not invent class-specific legal restrictions.
- FL511 Skyway camera video is rendered in-page through native HLS or Hls.js, with the official FL511 page as fallback.
- The first screen is status first, then vehicle / traffic / toll; weather, camera and explanatory detail follow.
- Discovery includes canonical/search/social metadata, creator linkage, tools, national tools, sitemap, llms.txt and bridge-network links.
