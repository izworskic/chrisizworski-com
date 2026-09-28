from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing replacement target: {label}')
    return text.replace(old, new, 1)

# Decision-engine copy: preserve states, gates, thresholds, and source semantics.
lib_path = Path('lib/kilauea-decision.js')
s = lib_path.read_text()
repls = [
("One of the larger eruption-viewing parking areas.", "One of the larger summit-viewing parking areas; useful when you want a short walk and room to get oriented.", "uekahuna crowd"),
("Fastest low-walking option with restrooms, ranger presence when staffed, and a direct caldera view.", "This is the easiest place to get your bearings on the summit. The broad view across Kaluapele helps you read the scale of the caldera without committing to a long walk.", "uekahuna why"),
("Farther from the active vents than the Keanakākoʻi walk-in overlooks.", "You are farther from the active vents than at Keanakākoʻi, so this is a scale-and-context view more than a close lava view.", "uekahuna tradeoff"),
("NPS advises avoiding roughly 5–9 PM during eruption crowds; pre-sunrise is often easier.", "The small lot can fill quickly during active episodes; NPS notes that roughly 5–9 PM is often the hardest arrival window, while pre-sunrise can be easier.", "overlook crowd"),
("Short walk and broad, unobstructed views into Kaluapele; strong choice for photography and first-time visitors.", "This is the broad-view choice. From here you can read much of Kaluapele at once, which makes it easier to understand how eruption and collapse have reshaped the summit.", "overlook why"),
("Smaller parking area and can become heavily congested during eruptions.", "The lot is small and can fill quickly during active episodes; the view is excellent, but the arrival window matters.", "overlook tradeoff"),
("Extremely limited parking during eruptions; use Devastation Trail parking or Puʻupuaʻi as backup.", "Parking is very limited during active episodes; this is the viewpoint to choose when the closer look is worth a longer walk and a less certain parking plan.", "keanakakoi crowd"),
("Closest public eruption views when open, reached by a 1-mile walk from Devastation Trail parking.", "This is the closer, more committed viewing choice when it is open. The walk brings you nearer the active summit area, where changes in glow, spatter, and vent activity are easier to read.", "keanakakoi why"),
("Requires about a 2-mile round trip; the final section is uneven cinder and conditions can close the area.", "Plan on about a 2-mile round trip, uneven cinder near the end, and very limited parking. Conditions can close the area.", "keanakakoi tradeoff"),
("A fresh, timestamped HVO state could not be confirmed.", "The newest HVO observation is missing or too old to use as a current read of the summit.", "confidence hvo stale"),
("Current activity is observed, but HVO says eruption timing is not reliably modelable.", "We know what the summit is doing now, but HVO says the timing of the next eruptive episode is not on a reliable clock.", "confidence unpredictable"),
("Fresh official eruption, access and weather inputs agree.", "HVO, NPS access, summit weather, and the supporting live inputs are current and tell a consistent story.", "confidence high"),
("The eruption state is fresh, but at least one supporting input is degraded.", "HVO is current, but at least one supporting source is too weak to treat the whole visitor picture as settled.", "confidence reasonable"),
("Only the eruption state is available; viewing conditions or access could not be fully checked.", "HVO gives us part of the story, but access or viewing conditions are not current enough to finish the visitor picture.", "confidence limited"),
("Park access blocks eruption viewing", "The park is closed to this viewing trip", "closed headline"),
("Do not travel for eruption viewing until the National Park Service reopens access.", "This is an access decision, not an eruption decision. Follow NPS closure instructions and wait for reopening before traveling for eruption viewing.", "closed action"),
("NPS closure is a hard gate.", "NPS access comes first here; volcanic activity never overrides a closure.", "closed reason"),
("Park access could not be confirmed", "Confirm park access before you make the drive", "unknown access headline"),
("Confirm NPS current conditions before travel. Do not treat an attractive eruption or weather signal as clearance to go.", "Check NPS current conditions first. A clear camera, good weather, or active lava does not count as permission to enter an area whose access has not been verified.", "unknown access action"),
("NPS access status is an unresolved hard gate.", "Access is the first decision. Until NPS conditions are verified, the rest of the viewing picture stays secondary.", "unknown access reason"),
("Fresh eruption state not confirmed", "The volcano picture is too old to trust", "stale headline"),
("Check the newest HVO update or live summit camera before making a drive.", "Before you drive, open the newest HVO update and the summit camera. The point is to see what Kīlauea is doing now, not what it was doing yesterday.", "stale action"),
("Fountaining is active now, but tomorrow is not predictable", "Tomorrow’s weather can be forecast; tomorrow’s eruption cannot", "tomorrow fountain headline"),
("Tomorrow needs a fresh eruption check", "Tomorrow starts with a fresh HVO check", "tomorrow default headline"),
("is the current observed state; it is not evidence that the same eruption state will persist tomorrow.", "is what HVO is seeing now; it is not a promise that Kīlauea will look the same tomorrow.", "tomorrow reason suffix"),
("The eruption is paused now", "Kīlauea is between eruptive episodes right now", "today paused headline"),
("Do not make a lava-specific trip later today unless HVO confirms renewed activity.", "If visible lava is the reason for the trip, wait for HVO to confirm renewed activity. A quiet summit can still be worth understanding, but it is a different visit.", "today paused action"),
("No active eruptive episode is confirmed.", "HVO does not confirm an active eruptive episode right now.", "paused reason"),
("Fountaining is active now; later today needs another check", "Kīlauea is fountaining now; later today is a new decision", "today fountain headline"),
("Current summit activity may change before later today", "What the summit is doing now may not be what you find later", "today current headline"),
("Activity is worth watching, but timing matters", "The summit is worth watching, but timing matters", "default headline"),
("Check the summit camera before leaving.", "Look at the summit camera before you leave. It is the quickest way to see whether the view matches the official activity report.", "default action"),
("Eruption activity is reported, but the view may be obscured", "The eruption is active; the weather is hiding the story", "poor visibility headline"),
("Use the live camera before moving; weather may hide an active eruption.", "Use the live camera before you move. On this summit, cloud and rain can erase a view of active lava in minutes.", "poor visibility action"),
("is the limiting factor.", "is the limiting factor—not the volcanic activity itself.", "poor visibility reason suffix"),
("Active fountaining is the strongest reason to go", "Fountaining is happening now, but three hours is a long way from ‘now’", "long drive headline"),
("Check the newest HVO message and live camera immediately before a three-hour drive; episodes can change before arrival.", "Before committing to a three-hour drive, check the newest HVO message and the live camera. Eruptive episodes can change before you reach the rim.", "long drive action"),
("Fountaining is reported now, but long-drive failure cost is high.", "HVO reports fountaining now; the uncertainty is whether that same scene will still be there after a three-hour drive.", "long drive reason"),
("Active fountaining is reported at the summit", "Kīlauea is fountaining now", "go now headline"),
("If the camera is clear, head for ${viewpoint.name}.", "If the camera is clear, ${viewpoint.name} is your best fit. Once there, look across Kaluapele before narrowing in on the vent—the scale is part of the story.", "go now viewpoint action"),
("If the camera is clear, use an open NPS eruption viewpoint.", "If the camera is clear, use an open NPS eruption viewpoint and give yourself a minute to read the whole caldera before focusing on the lava.", "go now fallback action"),
("Elevated summit activity, but no reliable fountain countdown", "The summit is active, but it is not on a reliable clock", "elevated unpredictable headline"),
("The summit is building unrest, but the next episode is not on a reliable clock", "The summit is restless, but the next episode is not on a reliable clock", "unrest unpredictable headline"),
("Do not chase a modeled eruption time. Wait for a fresh HVO message or visible activity on the summit camera.", "Do not chase a modeled eruption time. For a three-hour drive, wait for a fresh HVO message or unmistakable activity on the summit camera.", "unpredictable long action"),
("If you are nearby, check the live camera; otherwise recheck when HVO posts a new message.", "If you are nearby, look at the live camera and read the summit for yourself; otherwise wait for the next HVO message before making the trip about lava.", "unpredictable nearby action"),
("HVO reports activity but says the next fountain window cannot be modeled reliably.", "HVO reports activity but says the next fountain window cannot be modeled reliably. The useful truth here is what the summit is doing now, not a countdown someone else has invented.", "unpredictable reason"),
("Elevated summit activity is being observed", "Kīlauea is showing active summit signals", "elevated headline"),
("Verify the live camera and newest HVO message before committing to the drive.", "Before committing to the drive, compare the newest HVO message with the live camera. If they tell the same story, you have a much stronger reason to move.", "elevated long action"),
("Use the camera first${viewpoint ? `, then favor ${viewpoint.name}` : ''}.", "Use the camera first${viewpoint ? `, then favor ${viewpoint.name}` : ''}. When you arrive, look for the features HVO is describing rather than only for bright lava.", "elevated nearby action"),
("The eruption is paused", "Kīlauea is between eruptive episodes", "paused now headline"),
("Do not make a lava-specific drive until HVO confirms renewed activity.", "If visible lava is the purpose of the drive, hold off until HVO confirms renewed activity. The pause is part of Kīlauea’s behavior, not a failure of the visit.", "paused now action"),
("No strong live eruption signal is available", "The summit is not giving a strong live eruption signal yet", "monitoring headline"),
("Open the official HVO update and live camera before deciding to travel.", "Read the newest HVO update and look at the live camera before deciding to travel. If the summit is quiet, let that be the answer rather than forcing a trip around an eruption that is not there.", "monitoring action"),
]
for old, new, label in repls:
    s = replace_once(s, old, new, label)
lib_path.write_text(s)

# Page copy: shift dashboard language to interpretive-ranger language without impersonating NPS.
page_path = Path('public/labs/kilauea-live/index.html')
h = page_path.read_text()
page_repls = [
("Official eruption state + park access + summit weather, interpreted for an actual visit.", "An interpretive read of official eruption, access, weather, and air evidence—so you can understand what the summit is doing and make a better visit decision.", "hero sub"),
("After this refresh, the tool will remember the prior official state locally and show material source changes without treating your control experiments as real-world changes.", "This device will remember only the official activity, access, and viewing-weather picture. Next time, this space will tell you what actually changed at the summit—not what changed because you tapped a control.", "first check static"),
("<div class=\"kicker\">Time machine</div><h2>What matters next</h2><p class=\"lede\">This timeline highlights changes in usable viewing conditions. Eruption onset remains controlled by HVO evidence.</p>", "<div class=\"kicker\">Read the next few hours</div><h2>What may change the view</h2><p class=\"lede\">This is about whether the summit may become easier or harder to see—not when Kīlauea will erupt. HVO remains the authority on eruptive activity.</p>", "timeline static"),
("Webcam visibility is evidence, not a guarantee: fog and rain can hide active lava, and a dark frame does not prove the eruption stopped.", "Use the camera the way a ranger would use a window: to confirm what the summit looks like right now. Cloud can hide active lava, and a dark frame never proves the eruption stopped.", "camera lede"),
("<h3>Use this for</h3><p>Visual confirmation of glow, fountaining, spatter and whether clouds are blocking the crater.</p>", "<h3>Look for</h3><p>Glow, fountaining, spatter—and, just as important, whether cloud is hiding Kaluapele.</p>", "camera look for"),
("<h3>Do not infer</h3><p>No visible lava can mean cloud, darkness, camera trouble or a pause. HVO remains the eruption authority.</p>", "<h3>Remember</h3><p>A camera can show you the view, not the whole volcano. HVO remains the eruption authority, and a blank-looking frame may simply mean cloud, darkness, camera trouble, or a temporary pause.</p>", "camera remember"),
("<div class=\"kicker\">Why this answer</div><h2>What is driving the decision</h2><div class=\"why-grid\"><div class=\"why-block\"><h3>Helping</h3><p id=\"helping\">Waiting for evidence.</p></div><div class=\"why-block\"><h3>Hurting</h3><p id=\"hurting\">Waiting for evidence.</p></div><div class=\"why-block\"><h3>Could change it</h3><p id=\"couldChange\">A new HVO message, NPS access change, or a material visibility change.</p></div>", "<div class=\"kicker\">Read the conditions</div><h2>What the summit is telling you</h2><div class=\"why-grid\"><div class=\"why-block\"><h3>What helps</h3><p id=\"helping\">Waiting for evidence.</p></div><div class=\"why-block\"><h3>What limits the view</h3><p id=\"hurting\">Waiting for evidence.</p></div><div class=\"why-block\"><h3>Watch for next</h3><p id=\"couldChange\">A new HVO message, NPS access change, or a material visibility change.</p></div>", "why headings"),
("The map is intentionally sparse. Each point represents a different tradeoff in walking, parking and view — not a generic list of park attractions.", "These are not three interchangeable pins. Each viewpoint teaches you something different about the summit, and each asks a different amount of walking, parking patience, and commitment.", "map lede"),
("Parking counts and crowd guidance are NPS planning information, not live stall occupancy. A “busy” estimate must never be shown as a real-time parking count.", "Parking numbers are NPS planning information, not a live count. During an active episode, the best viewpoint on paper may not be the best place to spend your time circling for a space.", "parking note"),
("<div class=\"kicker\">Sources & status</div><h2>What the decision is standing on</h2><p class=\"lede\">Observed, forecast and operational inputs are kept separate. A failed source reduces confidence instead of being silently replaced with model prose.</p>", "<div class=\"kicker\">What we’re listening to</div><h2>The official voices behind this answer</h2><p class=\"lede\">HVO tells us what the volcano is doing. NPS tells us where visitors can go. NWS tells us what the summit view may be like. Hawaiʻi DOH adds regional SO₂ context. If one goes quiet, confidence drops instead of being filled in with guesswork.</p>", "sources intro"),
("Decision path: <code>official inputs → freshness → hard gates → activity state → viewing window → viewpoint → confidence → explanation</code>. No language model can override a closure or fabricate a missing live input.", "How the answer is built: <code>official evidence → freshness → access gates → activity → viewing weather → place fit → confidence</code>. Interpretation can explain the evidence; it cannot override a closure or invent a missing observation.", "method"),
("Experimental noindex lab. Always follow current USGS HVO and National Park Service instructions. © 2026 Chris Izworski.", "Independent interpretive tool; not an NPS or USGS product. Always follow current USGS HVO and National Park Service instructions. © 2026 Chris Izworski.", "footer disclaimer"),
("? 'Now — verify the camera and access first' : 'No defensible viewing window'", "? 'Now — look at the camera and confirm access first' : 'No useful viewing window can be defended from the current evidence'", "best window fallback"),
("if(a?.state==='FOUNTAINING') helping.push('HVO reports active fountaining.');", "if(a?.state==='FOUNTAINING') helping.push('HVO reports active fountaining. If the camera is clear, the eruption itself is not the limiting factor.');", "why fountaining"),
("if(a?.state==='ELEVATED') helping.push('HVO reports current overflow, spatter, flow or strong glow signals.');", "if(a?.state==='ELEVATED') helping.push('HVO is seeing overflow, spatter, lava-flow, or strong-glow signals at the summit.');", "why elevated"),
("if(wx?.score>=.55) helping.push(`Viewing weather is relatively favorable: ${wx.shortForecast||'clearer conditions'}.`);", "if(wx?.score>=.55) helping.push(`The summit weather is giving you a better chance to see the crater: ${wx.shortForecast||'clearer conditions'}.`);", "why weather good"),
("if(!d.access?.parkClosed && !d.access?.closureUnknown) helping.push('No park-wide closure was detected in the verified NPS access input.');", "if(!d.access?.parkClosed && !d.access?.closureUnknown) helping.push('NPS access is verified and no park-wide closure is active.');", "why access"),
("if(f?.state==='UNPREDICTABLE') hurting.push('HVO says the next fountain window cannot be modeled reliably.');", "if(f?.state==='UNPREDICTABLE') hurting.push('The volcano is active, but HVO says the next fountain window cannot be modeled reliably. There is no trustworthy countdown.');", "why unpredictable"),
("if(wx?.score<.35) hurting.push(`Visibility may be poor: ${wx.shortForecast||'weather is limiting'}.`);", "if(wx?.score<.35) hurting.push(`Cloud, fog, or showers may hide an active eruption: ${wx.shortForecast||'weather is limiting the view'}.`);", "why weather bad"),
("$('helping').textContent=helping.join(' ')||'No strong positive signal beyond the current official activity state.';", "$('helping').textContent=helping.join(' ')||'Nothing beyond the official activity state is currently improving the viewing picture.';", "why helping fallback"),
("$('hurting').textContent=hurting.join(' ')||'No major limiting signal is currently identified.';", "$('hurting').textContent=hurting.join(' ')||'No major limit is showing beyond ordinary summit variability.';", "why hurting fallback"),
("$('couldChange').textContent='A new HVO message, confirmed fountaining on official cameras, NPS closure/reopening, or a material summit-weather change.';", "$('couldChange').textContent='A new HVO message, visible fountaining on the USGS camera, an NPS access change, or a real shift in summit visibility.';", "why could change"),
("rows.push({label:'Now',main:", "rows.push({label:'Right now',main:", "timeline now label"),
("rows.push({label:dec.profile?.plan==='tomorrow'?'Tomorrow':'Best view'", "rows.push({label:dec.profile?.plan==='tomorrow'?'Tomorrow':'Weather window'", "timeline best label"),
("rows.push({label:'Next change'", "rows.push({label:'Next weather change'", "timeline next label"),
("rows.push({label:'Eruption timing',main:'No reliable fountain countdown',meta:'HVO wording blocks third-party timing models from driving this recommendation'});", "rows.push({label:'Volcano timing',main:'No reliable fountain countdown',meta:'HVO says current behavior is too irregular for a dependable timing model'});", "timeline eruption row"),
("${isClosed?'<div class=\"place-tag\">Reported closed by NPS</div>':v.id===rec?'<div class=\"place-tag\">Best fit for your choices</div>':''}", "${isClosed?'<div class=\"place-tag\">Reported closed by NPS</div>':v.id===rec?'<div class=\"place-tag\">Best fit for this visit</div>':''}", "place recommendation tag"),
("Do not choose this viewpoint while the closure remains in effect. ", "Do not use this viewpoint while the closure remains in effect. ", "closed viewpoint copy"),
("The next visit will compare official activity, access and viewing weather with this check.", "Next time, this space will compare the official activity, access, and viewing-weather picture with what you are seeing now.", "first visit dynamic"),
("The official activity, access and current viewing picture are materially similar to your prior visit on this device.", "The official activity, access, and viewing picture are telling essentially the same story as your last check on this device.", "no change dynamic"),
("Live timeline cleared because the latest request failed.", "The latest request failed, so this timeline has been cleared rather than showing you an old summit picture as if it were current.", "clear timeline"),
("Viewpoint recommendation unavailable", "Viewpoint guidance unavailable", "clear place title"),
("Confirm NPS access before choosing a viewing location.", "Confirm NPS access before choosing where to stand. A good view is never worth guessing about a closure.", "clear place copy"),
("Live evidence unavailable.", "The current summit picture is unavailable.", "clear helping"),
("The newest request failed, so prior evidence has been cleared.", "The newest request failed, so old evidence has been cleared instead of being dressed up as current conditions.", "clear hurting"),
("Live feeds could not be verified", "The live summit picture could not be verified", "load failure headline"),
("The live decision endpoint failed.", "The live evidence bundle failed before a current visitor picture could be built.", "load failure reason"),
("Use the official HVO update, USGS webcams and NPS current conditions before travel.", "Use the newest HVO update, the USGS summit cameras, and NPS current conditions before you travel.", "load failure action"),
]
for old, new, label in page_repls:
    h = replace_once(h, old, new, label)
page_path.write_text(h)

# Add voice-regression tests. Keep existing safety tests untouched.
test_path = Path('tests/kilauea-live.test.js')
t = test_path.read_text()
anchor = "test('live endpoint budgets staged upstream fallbacks inside the 10-second function envelope', () => {"
voice_test = r'''test('Kilauea copy follows interpretive-ranger voice without impersonating NPS', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'labs', 'kilauea-live', 'index.html'), 'utf8');
  const decision = fs.readFileSync(path.join(__dirname, '..', 'lib', 'kilauea-decision.js'), 'utf8');
  const combined = `${html}\n${decision}`;
  assert.match(html, /What the summit is telling you/);
  assert.match(html, /Use the camera the way a ranger would use a window/);
  assert.match(html, /The official voices behind this answer/);
  assert.match(html, /Independent interpretive tool; not an NPS or USGS product/);
  assert.match(decision, /Tomorrow’s weather can be forecast; tomorrow’s eruption cannot/);
  assert.match(decision, /The eruption is active; the weather is hiding the story/);
  assert.match(decision, /look across Kaluapele before narrowing in on the vent/i);
  for (const phrase of ['breathtaking','hidden gem','must-see','adventure awaits','nature’s raw power','immerse yourself']) {
    assert.doesNotMatch(combined, new RegExp(phrase, 'i'));
  }
});

'''
if anchor not in t:
    raise SystemExit('test insertion anchor missing')
t = t.replace(anchor, voice_test + anchor, 1)
test_path.write_text(t)
