# Pictured Rocks Planner v2

## Product contract

This preview turns the existing Pictured Rocks guide into a decision-first trip composer. It is intentionally `noindex` until ownership of `picturedrocks.chrisizworski.com` is resolved and the replacement can be attached to the canonical publisher safely.

### Primary user decision

Given the visitor's usable time, starting side, walking tolerance, party constraints, trip priority, and preferred way to see the cliffs, produce a realistic itinerary that answers:

1. What should I actually do?
2. In what order?
3. What should I deliberately skip?
4. What changes if weather/access breaks the plan?
5. What must I save or verify before cell service disappears?

### Hard rules before preferences

- Pet restrictions remove prohibited Chapel/Sable/backcountry choices.
- Limited walking removes Chapel, Miners Falls, the Au Sable Light walk, and Sable Falls.
- Young-kid kayak requests do not blindly route to a guided paddle.
- A full-day long-hike profile can make Chapel the single anchor instead of pretending a cruise also fits.
- Grand Marais starts and easy-walking constraints override generic cliff-view preferences.

### Search/discovery surfaces retained on the page

- one day in Pictured Rocks
- Pictured Rocks with a dog
- Pictured Rocks without a boat
- two days at Pictured Rocks
- Munising vs Grand Marais context
- offline map/current-conditions actions

### Verification

- `node --test tests/pictured-rocks-planner-v2.test.js`
- `node scripts/benchmark-pictured-rocks-planner-v2.mjs --check`

The final implementation has nine behavioral regression checks and a 100/100 v2 benchmark target result.