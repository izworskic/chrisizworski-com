---
name: hf-visual-evidence
description: "Optional local vision-assisted photo QA for verified field-guide imagery; never claim the model establishes the photograph's source or location."
---
# Visual evidence assistant for Experience Foundry

Use when Experience Foundry or Field Guide V1 needs to triage already licensed, already sourced site photographs. Candidate models for separate review: `onnx-community/Florence-2-base-ft` (MIT) and `Xenova/clip-vit-base-patch32` (MIT).

Given a bounded photo list containing source page, image URL, photographer/credit, license URL, known place, and date, produce a review-only table: photo ID, proposed subject category, tentative caption/alt text, likely duplicate groups and **needs human confirmation** flags.

Rules:
1. First verify photo licensing/attribution and real-place provenance using owning source. Model output cannot establish a photo's location, copyright, place name, park access or publication rights.
2. Prefer offline batch inference, not visitor-request image ML. Respect source terms, PII, bandwidth and local disk budget.
3. Never alter hero images, source photo URLs, credit links or captions in production without human approval.
4. Test obvious mismatches and wrong-place photos, misleading generative captions and overlapping subject groups. Verify manual author copy reads like an interpretive guide, not an AI caption dump.
5. Preserve Experience OS, Playwright image-load tests, Auto ads and page performance.

Result: an editorial candidate report with source URLs and a clear NOT VERIFIED status for uncertain imagery. Not a deployable image generation service.
