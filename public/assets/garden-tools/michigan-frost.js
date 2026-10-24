/* Michigan frost stations and crop timing, shared by the Michigan garden tools.
 * Spring dates: Michigan State Climatologist Office freeze probability table (32 F), published by
 * MSU Extension: the date after which a freeze still occurs in 75, 50 and 25 percent of springs, and
 * the latest freeze on record. Fall dates: typical first fall frost, NOAA 1991 to 2020 normals.
 * Crop windows are day offsets from the last spring frost (i: start indoors, t: plant out,
 * d: sow outside) or from the first fall frost (f: fall sowing); s is the minimum soil temperature (F).
 * Requires garden-kit.js for date parsing.
 */
(function (root) {
  'use strict';
  var K = root.GardenKit;
  var STATIONS = [
  {"s": "adrian", "n": "Adrian", "r": "Southeast", "p75": "Apr 27", "p50": "May 3", "p25": "May 9", "lx": "May 23", "ff": "Oct 5"},
  {"s": "allegan", "n": "Allegan", "r": "Southwest", "p75": "Apr 28", "p50": "May 6", "p25": "May 14", "lx": "Jun 12", "ff": "Oct 8"},
  {"s": "alma", "n": "Alma", "r": "Central", "p75": "May 3", "p50": "May 10", "p25": "May 17", "lx": "May 27", "ff": "Sep 28"},
  {"s": "alpena-wso", "n": "Alpena WSO", "r": "Northeast Lower", "p75": "May 22", "p50": "May 31", "p25": "Jun 8", "lx": "Jun 21", "ff": "Sep 25"},
  {"s": "alpena", "n": "Alpena", "r": "Northeast Lower", "p75": "May 1", "p50": "May 8", "p25": "May 15", "lx": "May 29", "ff": "Sep 25"},
  {"s": "ann-arbor", "n": "Ann Arbor", "r": "Southeast", "p75": "Apr 22", "p50": "Apr 29", "p25": "May 6", "lx": "May 27", "ff": "Oct 12"},
  {"s": "atlanta", "n": "Atlanta", "r": "Northeast Lower", "p75": "May 24", "p50": "Jun 2", "p25": "Jun 11", "lx": "Jul 6", "ff": "Sep 8"},
  {"s": "bad-axe", "n": "Bad Axe", "r": "Thumb", "p75": "May 8", "p50": "May 15", "p25": "May 22", "lx": "Jun 8", "ff": "Oct 3"},
  {"s": "battle-creek", "n": "Battle Creek", "r": "Southwest", "p75": "Apr 28", "p50": "May 5", "p25": "May 11", "lx": "May 27", "ff": "Oct 6"},
  {"s": "bay-city", "n": "Bay City", "r": "Saginaw Valley", "p75": "Apr 25", "p50": "May 2", "p25": "May 9", "lx": "May 26", "ff": "Oct 3"},
  {"s": "big-rapids", "n": "Big Rapids", "r": "West Central", "p75": "May 13", "p50": "May 20", "p25": "May 26", "lx": "Jun 12", "ff": "Sep 22"},
  {"s": "bloomingdale", "n": "Bloomingdale", "r": "Southwest", "p75": "May 1", "p50": "May 10", "p25": "May 19", "lx": "Jun 12", "ff": "Oct 8"},
  {"s": "cadillac", "n": "Cadillac", "r": "Northwest Lower", "p75": "May 21", "p50": "Jun 1", "p25": "Jun 12", "lx": "Jul 11", "ff": "Sep 18"},
  {"s": "caro", "n": "Caro", "r": "Thumb", "p75": "May 15", "p50": "May 23", "p25": "May 31", "lx": "Jun 22", "ff": "Oct 3"},
  {"s": "charlotte", "n": "Charlotte", "r": "Central", "p75": "May 5", "p50": "May 13", "p25": "May 21", "lx": "Jun 12", "ff": "Oct 3"},
  {"s": "chatham", "n": "Chatham", "r": "Upper Peninsula", "p75": "Jun 1", "p50": "Jun 11", "p25": "Jun 21", "lx": "Jul 31", "ff": "Sep 25"},
  {"s": "cheboygan", "n": "Cheboygan", "r": "Northeast Lower", "p75": "May 10", "p50": "May 17", "p25": "May 24", "lx": "Jun 21", "ff": "Sep 28"},
  {"s": "coldwater", "n": "Coldwater", "r": "South Central", "p75": "Apr 29", "p50": "May 7", "p25": "May 14", "lx": "May 27", "ff": "Oct 5"},
  {"s": "detroit-city", "n": "Detroit city", "r": "Southeast", "p75": "Apr 18", "p50": "Apr 24", "p25": "Apr 30", "lx": "May 12", "ff": "Oct 25"},
  {"s": "detroit-metro", "n": "Detroit Metro", "r": "Southeast", "p75": "Apr 25", "p50": "May 3", "p25": "May 11", "lx": "May 29", "ff": "Oct 15"},
  {"s": "east-jordan", "n": "East Jordan", "r": "Northwest Lower", "p75": "May 22", "p50": "May 30", "p25": "Jun 6", "lx": "Jun 22", "ff": "Sep 8"},
  {"s": "east-tawas", "n": "East Tawas", "r": "Northeast Lower", "p75": "May 14", "p50": "May 22", "p25": "May 30", "lx": "Jun 14", "ff": "Oct 3"},
  {"s": "eau-claire", "n": "Eau Claire", "r": "Southwest", "p75": "Apr 25", "p50": "May 2", "p25": "May 9", "lx": "May 29", "ff": "Oct 15"},
  {"s": "escanaba", "n": "Escanaba", "r": "Upper Peninsula", "p75": "May 5", "p50": "May 11", "p25": "May 17", "lx": "May 30", "ff": "Oct 3"},
  {"s": "fayette", "n": "Fayette", "r": "Upper Peninsula", "p75": "May 9", "p50": "May 16", "p25": "May 23", "lx": "Jun 8", "ff": "Oct 3"},
  {"s": "fife-lake", "n": "Fife Lake", "r": "Northwest Lower", "p75": "May 29", "p50": "Jun 7", "p25": "Jun 17", "lx": "Jul 6", "ff": "Sep 18"},
  {"s": "flint", "n": "Flint", "r": "East Central", "p75": "May 2", "p50": "May 8", "p25": "May 15", "lx": "May 27", "ff": "Oct 5"},
  {"s": "frankfort", "n": "Frankfort", "r": "Northwest Lower", "p75": "May 10", "p50": "May 18", "p25": "May 26", "lx": "Jun 23", "ff": "Oct 8"},
  {"s": "gladwin", "n": "Gladwin", "r": "North Central", "p75": "May 13", "p50": "May 20", "p25": "May 28", "lx": "Jun 22", "ff": "Sep 22"},
  {"s": "grand-haven", "n": "Grand Haven", "r": "Lakeshore", "p75": "Apr 25", "p50": "May 1", "p25": "May 8", "lx": "May 18", "ff": "Oct 15"},
  {"s": "grand-marais", "n": "Grand Marais", "r": "Upper Peninsula", "p75": "May 23", "p50": "Jun 4", "p25": "Jun 15", "lx": "Jul 20", "ff": "Sep 12"},
  {"s": "grand-rapids", "n": "Grand Rapids", "r": "West", "p75": "Apr 24", "p50": "May 2", "p25": "May 10", "lx": "May 27", "ff": "Oct 8"},
  {"s": "grayling", "n": "Grayling", "r": "North Central", "p75": "May 21", "p50": "May 31", "p25": "Jun 10", "lx": "Jul 21", "ff": "Sep 12"},
  {"s": "greenville", "n": "Greenville", "r": "West", "p75": "May 1", "p50": "May 9", "p25": "May 18", "lx": "Jun 12", "ff": "Oct 8"},
  {"s": "gull-lake", "n": "Gull Lake", "r": "Southwest", "p75": "May 1", "p50": "May 7", "p25": "May 13", "lx": "May 29", "ff": "Oct 8"},
  {"s": "hale-loud-dam", "n": "Hale Loud Dam", "r": "Northeast Lower", "p75": "May 16", "p50": "May 23", "p25": "May 30", "lx": "Jun 20", "ff": "Oct 3"},
  {"s": "harbor-beach", "n": "Harbor Beach", "r": "Thumb", "p75": "May 2", "p50": "May 9", "p25": "May 16", "lx": "May 26", "ff": "Oct 3"},
  {"s": "harrisville", "n": "Harrisville", "r": "Northeast Lower", "p75": "May 14", "p50": "May 23", "p25": "Jun 1", "lx": "Jun 25", "ff": "Sep 25"},
  {"s": "hart", "n": "Hart", "r": "Lakeshore", "p75": "May 12", "p50": "May 20", "p25": "May 27", "lx": "Jun 13", "ff": "Oct 10"},
  {"s": "hastings", "n": "Hastings", "r": "Southwest", "p75": "May 6", "p50": "May 13", "p25": "May 21", "lx": "Jun 12", "ff": "Oct 8"},
  {"s": "hillsdale", "n": "Hillsdale", "r": "South Central", "p75": "May 4", "p50": "May 12", "p25": "May 20", "lx": "Jun 12", "ff": "Oct 5"},
  {"s": "holland", "n": "Holland", "r": "Lakeshore", "p75": "Apr 29", "p50": "May 8", "p25": "May 17", "lx": "Jun 12", "ff": "Oct 12"},
  {"s": "houghton", "n": "Houghton", "r": "Upper Peninsula", "p75": "May 15", "p50": "May 23", "p25": "May 31", "lx": "Jul 10", "ff": "Sep 28"},
  {"s": "houghton-lake", "n": "Houghton Lake", "r": "North Central", "p75": "May 22", "p50": "Jun 2", "p25": "Jun 14", "lx": "Jun 20", "ff": "Sep 15"},
  {"s": "iron-mountain", "n": "Iron Mountain", "r": "Upper Peninsula", "p75": "May 23", "p50": "May 30", "p25": "Jun 6", "lx": "Jun 22", "ff": "Sep 18"},
  {"s": "ironwood", "n": "Ironwood", "r": "Upper Peninsula", "p75": "May 17", "p50": "May 24", "p25": "May 31", "lx": "Jun 14", "ff": "Sep 15"},
  {"s": "ishpeming", "n": "Ishpeming", "r": "Upper Peninsula", "p75": "May 21", "p50": "May 28", "p25": "Jun 4", "lx": "Jun 18", "ff": "Oct 1"},
  {"s": "jackson", "n": "Jackson", "r": "South Central", "p75": "May 1", "p50": "May 8", "p25": "May 15", "lx": "May 31", "ff": "Oct 5"},
  {"s": "kalamazoo", "n": "Kalamazoo", "r": "Southwest", "p75": "Apr 26", "p50": "May 3", "p25": "May 11", "lx": "May 27", "ff": "Oct 8"},
  {"s": "lake-city", "n": "Lake City", "r": "North Central", "p75": "May 19", "p50": "May 29", "p25": "Jun 8", "lx": "Jul 11", "ff": "Sep 18"},
  {"s": "lansing", "n": "Lansing", "r": "Central", "p75": "Apr 30", "p50": "May 8", "p25": "May 17", "lx": "Jun 12", "ff": "Oct 3"},
  {"s": "lapeer", "n": "Lapeer", "r": "East Central", "p75": "May 5", "p50": "May 14", "p25": "May 23", "lx": "Jun 8", "ff": "Oct 5"},
  {"s": "ludington", "n": "Ludington", "r": "Lakeshore", "p75": "May 4", "p50": "May 13", "p25": "May 22", "lx": "Jun 14", "ff": "Oct 10"},
  {"s": "manistee", "n": "Manistee", "r": "Lakeshore", "p75": "May 3", "p50": "May 11", "p25": "May 18", "lx": "May 31", "ff": "Oct 10"},
  {"s": "marquette-wso", "n": "Marquette WSO", "r": "Upper Peninsula", "p75": "May 7", "p50": "May 13", "p25": "May 19", "lx": "May 29", "ff": "Oct 1"},
  {"s": "midland", "n": "Midland", "r": "Saginaw Valley", "p75": "Apr 30", "p50": "May 8", "p25": "May 17", "lx": "Jun 12", "ff": "Oct 1"},
  {"s": "milford", "n": "Milford", "r": "Southeast", "p75": "May 1", "p50": "May 8", "p25": "May 15", "lx": "May 30", "ff": "Oct 10"},
  {"s": "mio", "n": "Mio", "r": "Northeast Lower", "p75": "May 24", "p50": "Jun 1", "p25": "Jun 10", "lx": "Jun 21", "ff": "Sep 12"},
  {"s": "monroe", "n": "Monroe", "r": "Southeast", "p75": "Apr 19", "p50": "Apr 26", "p25": "May 2", "lx": "May 13", "ff": "Oct 15"},
  {"s": "mt-clemens", "n": "Mt. Clemens", "r": "Southeast", "p75": "Apr 19", "p50": "Apr 27", "p25": "May 5", "lx": "May 23", "ff": "Oct 18"},
  {"s": "mt-pleasant", "n": "Mt. Pleasant", "r": "Central", "p75": "May 8", "p50": "May 14", "p25": "May 21", "lx": "May 30", "ff": "Sep 28"},
  {"s": "munising", "n": "Munising", "r": "Upper Peninsula", "p75": "Jun 2", "p50": "Jun 10", "p25": "Jun 17", "lx": "Jul 4", "ff": "Sep 25"},
  {"s": "muskegon", "n": "Muskegon", "r": "Lakeshore", "p75": "Apr 28", "p50": "May 6", "p25": "May 14", "lx": "Jun 12", "ff": "Oct 12"},
  {"s": "newaygo", "n": "Newaygo", "r": "West Central", "p75": "May 18", "p50": "May 26", "p25": "Jun 3", "lx": "Jun 22", "ff": "Sep 22"},
  {"s": "newberry", "n": "Newberry", "r": "Upper Peninsula", "p75": "May 19", "p50": "May 26", "p25": "Jun 2", "lx": "Jun 18", "ff": "Sep 12"},
  {"s": "onaway", "n": "Onaway", "r": "Northeast Lower", "p75": "May 17", "p50": "May 25", "p25": "Jun 1", "lx": "Jun 15", "ff": "Sep 28"},
  {"s": "owosso", "n": "Owosso", "r": "Central", "p75": "May 5", "p50": "May 12", "p25": "May 19", "lx": "May 30", "ff": "Oct 3"},
  {"s": "paw-paw", "n": "Paw Paw", "r": "Southwest", "p75": "May 4", "p50": "May 11", "p25": "May 19", "lx": "Jun 12", "ff": "Oct 8"},
  {"s": "pontiac", "n": "Pontiac", "r": "Southeast", "p75": "Apr 30", "p50": "May 6", "p25": "May 13", "lx": "May 25", "ff": "Oct 10"},
  {"s": "port-huron", "n": "Port Huron", "r": "Thumb", "p75": "Apr 25", "p50": "May 3", "p25": "May 11", "lx": "Jun 5", "ff": "Oct 12"},
  {"s": "saginaw", "n": "Saginaw", "r": "Saginaw Valley", "p75": "Apr 27", "p50": "May 4", "p25": "May 11", "lx": "May 28", "ff": "Oct 5"},
  {"s": "sault-ste-marie", "n": "Sault Ste. Marie", "r": "Upper Peninsula", "p75": "May 14", "p50": "May 22", "p25": "May 29", "lx": "Jun 21", "ff": "Sep 22"},
  {"s": "south-haven", "n": "South Haven", "r": "Southwest", "p75": "Apr 26", "p50": "May 3", "p25": "May 9", "lx": "May 23", "ff": "Oct 15"},
  {"s": "three-rivers", "n": "Three Rivers", "r": "Southwest", "p75": "Apr 30", "p50": "May 8", "p25": "May 15", "lx": "May 29", "ff": "Oct 8"},
  {"s": "traverse-city", "n": "Traverse City", "r": "Northwest Lower", "p75": "May 15", "p50": "May 23", "p25": "Jun 1", "lx": "Jul 6", "ff": "Oct 8"},
  {"s": "vanderbilt", "n": "Vanderbilt", "r": "North Central", "p75": "Jun 10", "p50": "Jun 20", "p25": "Jun 30", "lx": "Jul 31", "ff": "Sep 8"},
  {"s": "west-branch", "n": "West Branch", "r": "North Central", "p75": "May 19", "p50": "May 27", "p25": "Jun 4", "lx": "Jun 18", "ff": "Sep 18"},
  {"s": "willis", "n": "Willis", "r": "Southeast", "p75": "May 2", "p50": "May 10", "p25": "May 17", "lx": "May 29", "ff": "Oct 12"}
  ];
  var CROPS = [
  {"n": "Tomatoes", "c": "veg", "i": [-56, -42], "t": [7, 21], "d": null, "f": null, "s": 60, "o": "Wait for 60F soil and settled nights; a week of patience beats a month of sulking"},
  {"n": "Peppers", "c": "veg", "i": [-63, -49], "t": [14, 21], "d": null, "f": null, "s": 65, "o": "Slower than tomatoes at every stage; never rush them out"},
  {"n": "Eggplant", "c": "veg", "i": [-63, -49], "t": [14, 21], "d": null, "f": null, "s": 65, "o": "The most cold-sensitive transplant in the garden"},
  {"n": "Broccoli", "c": "veg", "i": [-49, -35], "t": [-21, -7], "d": null, "f": [-95, -80], "s": 45, "o": "Spring and fall crop; fall heads are sweeter"},
  {"n": "Cabbage", "c": "veg", "i": [-49, -35], "t": [-28, -14], "d": null, "f": [-100, -85], "s": 45, "o": "Takes light frost at both ends of the season"},
  {"n": "Cauliflower", "c": "veg", "i": [-42, -28], "t": [-14, 0], "d": null, "f": [-95, -80], "s": 50, "o": "Fussier than broccoli; steady water or it buttons"},
  {"n": "Brussels sprouts", "c": "veg", "i": [-28, -14], "t": [0, 14], "d": null, "f": null, "s": 50, "o": "One long season; sprouts sweeten after fall frost"},
  {"n": "Kale", "c": "veg", "i": [-42, -28], "t": [-28, -14], "d": [-28, -14], "f": [-75, -55], "s": 45, "o": "Nearly indestructible; fall kale after frost is the best kale"},
  {"n": "Lettuce", "c": "veg", "i": [-35, -21], "t": [-21, -7], "d": [-28, 7], "f": [-60, -30], "s": 40, "o": "Sow a short row every 2 weeks; bolts in July heat"},
  {"n": "Spinach", "c": "veg", "i": null, "t": null, "d": [-42, -21], "f": [-50, -35], "s": 40, "o": "Cold soil is fine; summer sowings bolt"},
  {"n": "Swiss chard", "c": "veg", "i": [-35, -21], "t": [-7, 7], "d": [-14, 7], "f": [-70, -55], "s": 50, "o": "One sowing cuts all season"},
  {"n": "Peas", "c": "veg", "i": null, "t": null, "d": [-42, -28], "f": null, "s": 40, "o": "As soon as soil crumbles; heat ends them by July"},
  {"n": "Green beans", "c": "veg", "i": null, "t": null, "d": [7, 21], "f": null, "s": 60, "o": "Resow every 2 to 3 weeks into early July for a steady picking"},
  {"n": "Sweet corn", "c": "veg", "i": null, "t": null, "d": [7, 21], "f": null, "s": 60, "o": "Cold soil rots the seed; blocks beat rows for pollination"},
  {"n": "Cucumbers", "c": "veg", "i": [-21, -14], "t": [14, 21], "d": [7, 21], "f": null, "s": 65, "o": "Direct sowing usually catches up to transplants"},
  {"n": "Zucchini", "c": "veg", "i": null, "t": null, "d": [7, 21], "f": null, "s": 60, "o": "Two plants feed a neighborhood; resow in late June for fresh fall plants"},
  {"n": "Winter squash", "c": "veg", "i": null, "t": null, "d": [7, 14], "f": null, "s": 60, "o": "Needs the full season; get it in promptly"},
  {"n": "Pumpkins", "c": "veg", "i": null, "t": null, "d": [7, 14], "f": null, "s": 60, "o": "In the ground by mid-June even up north"},
  {"n": "Melons", "c": "veg", "i": [-28, -21], "t": [14, 28], "d": null, "f": null, "s": 70, "o": "Michigan melons want black plastic or a very warm site"},
  {"n": "Watermelon", "c": "veg", "i": [-28, -21], "t": [14, 28], "d": null, "f": null, "s": 70, "o": "Short-season varieties only; heat is everything"},
  {"n": "Carrots", "c": "veg", "i": null, "t": null, "d": [-21, 14], "f": [-85, -70], "s": 45, "o": "Slow to germinate; keep the row damp for 2 weeks"},
  {"n": "Beets", "c": "veg", "i": null, "t": null, "d": [-28, 7], "f": [-70, -55], "s": 45, "o": "Each seed is a cluster; thin without mercy"},
  {"n": "Radishes", "c": "veg", "i": null, "t": null, "d": [-35, 0], "f": [-45, -25], "s": 40, "o": "3 weeks seed to salad; sow small and often"},
  {"n": "Turnips", "c": "veg", "i": null, "t": null, "d": [-28, -7], "f": [-65, -50], "s": 45, "o": "The fall sowing is the good one"},
  {"n": "Onions from seed", "c": "veg", "i": [-70, -56], "t": [-28, -14], "d": null, "f": null, "s": 45, "o": "Start early or buy plants; day length ends bulbing in July"},
  {"n": "Onion sets", "c": "veg", "i": null, "t": null, "d": [-28, -14], "f": null, "s": 45, "o": "The easy path; plant when soil works"},
  {"n": "Potatoes", "c": "veg", "i": null, "t": null, "d": [-14, 7], "f": null, "s": 45, "o": "Sprouts take a light frost and regrow"},
  {"n": "Garlic", "c": "veg", "i": null, "t": null, "d": null, "f": [0, 21], "s": null, "o": "Plant in fall, after first light frost and before the ground freezes; harvest next July"},
  {"n": "Basil", "c": "herb", "i": [-42, -28], "t": [7, 14], "d": [14, 21], "f": null, "s": 65, "o": "Sulks below 50F nights; the last thing out the door"},
  {"n": "Parsley", "c": "herb", "i": [-70, -56], "t": [-14, 0], "d": [-21, 0], "f": null, "s": 50, "o": "Painfully slow germination; soak seed overnight"},
  {"n": "Cilantro", "c": "herb", "i": null, "t": null, "d": [-14, 7], "f": [-55, -40], "s": 50, "o": "Bolts fast in heat; sow every 3 weeks and again for fall"},
  {"n": "Dill", "c": "herb", "i": null, "t": null, "d": [-14, 7], "f": null, "s": 50, "o": "Direct sow only; resents transplanting"},
  {"n": "Chives", "c": "herb", "i": [-56, -42], "t": [-14, 0], "d": null, "f": null, "s": 45, "o": "Perennial; one planting lasts decades"},
  {"n": "Oregano", "c": "herb", "i": [-56, -42], "t": [0, 14], "d": null, "f": null, "s": 50, "o": "Perennial in most of Michigan with snow cover"},
  {"n": "Thyme", "c": "herb", "i": [-56, -42], "t": [0, 14], "d": null, "f": null, "s": 50, "o": "Perennial; wants sharp drainage more than warmth"},
  {"n": "Sage", "c": "herb", "i": [-56, -42], "t": [0, 14], "d": null, "f": null, "s": 50, "o": "Perennial; woody plants shrug off Zone 5 winters"},
  {"n": "Rosemary", "c": "herb", "i": [-70, -56], "t": [14, 21], "d": null, "f": null, "s": 60, "o": "Not hardy here; pot it and bring it in by October"},
  {"n": "Zinnias", "c": "flower", "i": [-28, -21], "t": [7, 14], "d": [7, 14], "f": null, "s": 60, "o": "Direct sowing works fine; cut hard for more blooms"},
  {"n": "Marigolds", "c": "flower", "i": [-42, -28], "t": [7, 14], "d": [7, 14], "f": null, "s": 60, "o": "Foolproof from seed either way"},
  {"n": "Sunflowers", "c": "flower", "i": null, "t": null, "d": [0, 21], "f": null, "s": 55, "o": "Sow every 2 weeks for a rolling show"},
  {"n": "Cosmos", "c": "flower", "i": null, "t": null, "d": [0, 14], "f": null, "s": 55, "o": "Thrives on neglect and poor soil"},
  {"n": "Nasturtiums", "c": "flower", "i": null, "t": null, "d": [0, 14], "f": null, "s": 55, "o": "Soak the big seeds; lean soil means more flowers"},
  {"n": "Sweet peas", "c": "flower", "i": null, "t": null, "d": [-35, -21], "f": null, "s": 45, "o": "Cold-lovers; plant with the edible peas"},
  {"n": "Snapdragons", "c": "flower", "i": [-70, -56], "t": [-14, 0], "d": null, "f": null, "s": 45, "o": "Take light frost; among the first out"},
  {"n": "Petunias", "c": "flower", "i": [-70, -56], "t": [7, 14], "d": null, "f": null, "s": 60, "o": "Tiny seed on the surface, light to germinate"},
  {"n": "Calendula", "c": "flower", "i": null, "t": null, "d": [-21, 0], "f": null, "s": 50, "o": "Self-sows once you have it"},
  {"n": "Morning glories", "c": "flower", "i": null, "t": null, "d": [7, 14], "f": null, "s": 60, "o": "Nick and soak seed; do not start early or it strangles the shelf"}
  ];
  var CAT = { veg: 'Vegetables', herb: 'Herbs', flower: 'Flowers' };
  function station(slug) { for (var i = 0; i < STATIONS.length; i++) if (STATIONS[i].s === slug) return STATIONS[i]; return null; }
  function crop(name) { for (var i = 0; i < CROPS.length; i++) if (CROPS[i].n === name || slugify(CROPS[i].n) === name) return CROPS[i]; return null; }
  function slugify(n) { return String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  // Frost anchors as day-of-year. mode 'cautious' plans on the 25 percent date.
  function anchors(st, mode, customSpring) {
    var spring = customSpring !== null && customSpring !== undefined ? customSpring : K.parse(mode === 'cautious' ? st.p25 : st.p50);
    return { spring: spring, fall: K.parse(st.ff), median: K.parse(st.p50), cautious: K.parse(st.p25), early: K.parse(st.p75), latest: K.parse(st.lx) };
  }
  function windows(c, a) {
    var out = [];
    if (c.i) out.push({ kind: 'indoor', from: a.spring + c.i[0], to: a.spring + c.i[1] });
    if (c.t) out.push({ kind: 'transplant', from: a.spring + c.t[0], to: a.spring + c.t[1] });
    if (c.d) out.push({ kind: 'sow', from: a.spring + c.d[0], to: a.spring + c.d[1] });
    if (c.f) out.push({ kind: 'fall', from: a.fall + c.f[0], to: a.fall + c.f[1] });
    return out.map(function (w) { return { kind: w.kind, from: K.wrapDay(w.from), to: K.wrapDay(w.to) }; });
  }
  function inside(d, w) { return w.from <= w.to ? d >= w.from && d <= w.to : d >= w.from || d <= w.to; }
  function until(d, w) { return ((w.from - d) % 365 + 365) % 365; }
  var VERB = { indoor: 'Start {c} indoors', transplant: 'Plant {c} out', sow: 'Sow {c} outside', fall: 'Sow {c} for fall' };
  function verb(kind, name) { return VERB[kind].replace('{c}', name.toLowerCase().replace(/^brussels/, 'Brussels').replace(/^swiss/, 'Swiss')); }
  // What is in its window on day d, and what opens in the next `horizon` days.
  function plan(a, d, horizon, only) {
    var now = [], soon = [];
    CROPS.forEach(function (c) {
      if (only && only.indexOf(c.n) < 0) return;
      windows(c, a).forEach(function (w) {
        if (inside(d, w)) now.push({ crop: c, w: w, text: verb(w.kind, c.n), left: ((w.to - d) % 365 + 365) % 365 });
        else if (until(d, w) <= horizon) soon.push({ crop: c, w: w, text: verb(w.kind, c.n), inDays: until(d, w) });
      });
    });
    now.sort(function (x, y) { return x.left - y.left; });
    soon.sort(function (x, y) { return x.inDays - y.inDays; });
    return { now: now, soon: soon };
  }
  /* Chance that a 32 F freeze still occurs on or after day d. Linear between the published 75, 50 and
   * 25 percent dates and the latest freeze on record (taken as about 2 percent). An estimate between
   * published points, never a forecast. */
  function risk(st, d) {
    var p = [[K.parse(st.p75), 0.75], [K.parse(st.p50), 0.5], [K.parse(st.p25), 0.25], [K.parse(st.lx), 0.02]];
    if (d <= p[0][0]) { var slope = (p[0][1] - p[1][1]) / Math.max(1, p[1][0] - p[0][0]); return Math.min(0.98, p[0][1] + slope * (p[0][0] - d)); }
    for (var i = 0; i < p.length - 1; i++) if (d <= p[i + 1][0]) { var f = (d - p[i][0]) / Math.max(1, p[i + 1][0] - p[i][0]); return p[i][1] + f * (p[i + 1][1] - p[i][1]); }
    return d > K.parse(st.lx) ? 0 : 0.02;
  }
  // Plain odds: "about 1 spring in 3".
  function odds(pr) {
    if (pr >= 0.93) return 'nearly every spring';
    if (pr <= 0) return 'never in the record';
    if (pr < 0.04) return 'rarely, about 1 spring in 50 or fewer';
    var opts = [[9, 10], [4, 5], [3, 4], [2, 3], [1, 2], [1, 3], [1, 4], [1, 5], [1, 7], [1, 10], [1, 20]], best = opts[0];
    opts.forEach(function (o) { if (Math.abs(o[0] / o[1] - pr) < Math.abs(best[0] / best[1] - pr)) best = o; });
    return 'about ' + best[0] + ' spring' + (best[0] > 1 ? 's' : '') + ' in ' + best[1];
  }
  root.MIFrost = { STATIONS: STATIONS, CROPS: CROPS, CAT: CAT, station: station, crop: crop, slugify: slugify, anchors: anchors, windows: windows, inside: inside, plan: plan, risk: risk, odds: odds, verb: verb };
})(typeof window !== 'undefined' ? window : globalThis);
