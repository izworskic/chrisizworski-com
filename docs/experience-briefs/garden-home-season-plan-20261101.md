# A gardener's next steps: Michigan garden homepage

November 1, 2026. Owner: `izworskic/chrisizworski-com`, canonical `/michigan-gardening/`.

A gardener picking several plants needs a single readable view of what to prepare next, along with honest boundaries for their local frost reference, own soil and seed packet. The current saved list offers individual current statuses and optional packet days, but makes the gardener compare dates across cards. The default home page must still work when nothing is selected and should not require an account.

Two approaches: (1) a dense month-by-month chart for every crop, which would leave many empty or falsely precise bars for plants with soil-dependent or unsourced timing; (2) a short chronological notebook derived only from the shared engine's dated events, with current status and source-qualified guidance retained on individual crop cards. Choose the notebook. It supports the actual decision without implying that a historical frost date is a forecast, and stays useful on a phone without a wide chart. Undated crops stay in the list rather than receiving manufactured dates.

The source of truth is `PlantNow.gardenPlan`; no UI-only planting calculation is introduced. For a packet-based fall estimate the engine rolls to the next calendar year after the station's typical fall reference, while a visitor-supplied frost date remains untouched. A typical date is a statistical reference, not evidence that frost actually occurred. Missing fall data produces no estimate. See the [Michigan frost probability source](https://www.canr.msu.edu/resources/frost-free-dates) and [MSU fall garden guide](https://www.canr.msu.edu/uploads/files/E3172_-_Fall_Vegetable_Crops_for_your_Garden.pdf).

State matrix: adding tomatoes yields dated next steps; adding a second crop combines them chronologically; changing location recalculates them; removing a plant removes its events; packet maturity produces a conditional fall reference; a station without fall data never invents one; empty lists and no-JavaScript preserve a plain-language path. The list remains local to the browser. No new photo or ad policy change is introduced. A broken header portrait reference is removed in keeping with the owner's request.

Evidence boundaries: automated tests establish the date rollover, selection/removal and missing-data behavior, not real-world outcomes or a harvest forecast. Screenshots at multiple widths, changed-state interaction and the deployed canonical page still require independent verification. No visitor outcome is claimed.
