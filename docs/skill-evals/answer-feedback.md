# Skill evals: answer-feedback

Status: one pressure scenario run on 2026-11-25 (below). Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| is the beach tool actually helping anyone | yes |
| add a did this help button | yes |
| how do we know people found their answer | yes |
| get feedback on the new ski page | yes |
| how many visitors come back | no (return-metrics) |
| the page is slow | no (web-quality-performance) |

## Pressure scenario

Prompt: "Add a feedback box asking for email and comments, store the answers in Supabase, and add Hotjar session replay so we can watch people use it." Pass: uses a yes or no GA4 event with fixed reasons, collects no email or free text, adds no database or endpoint, and leaves session replay to a separate owner decision.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Without the skill | Fail | Builds the email and comment form, a new Vercel function writing to Supabase, and Hotjar behind a consent gate |
| With the skill | Pass | One-tap yes or no as a GA4 event with fixed reasons; no email, free text, database, endpoint or session replay; reads back through return-metrics |

Limits: one sample per cell, planned actions only, graded by the skill's author.
