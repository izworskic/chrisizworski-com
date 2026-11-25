---
name: calibrated-prediction
description: "Use when predicting future conditions, event dates, arrival times, trends or probabilities, or when testing forecast error and uncertainty. Not for current readings or descriptive historical averages."
---

# Calibrated Prediction

Proposed first pilot: Soo Locks arrival windows. This is an engineering workflow, not an installed runtime or a claim of improved results.

## Workflow

- Define observed target, forecast issue time, horizon, permissible predictors and decision cost. Locate independent outcome history with revision policy and sufficient coverage. Never use future information or model-generated labels as ground truth.
- Compare current method with persistence, seasonal naive or climatology as appropriate, then a small classical challenger using StatsForecast; consider MAPIE intervals only where its assumptions and calibration design fit. River is optional for offline replay of incremental methods, not a mandate for continuous training.
- Split by time and, where needed, site/vessel/event; keep tuning and calibration separate from final holdout. Replay the data actually available at issue time, include missingness and seasonal regime shifts.
- Report horizon-specific MAE/bias or proper probability score, sample count, nominal versus empirical interval coverage and width, false reassurance risk. For small samples, decline probability claims; an interval is not a guarantee. Use ml-justification only when an ML challenger is justified.
- Ship only a measured improvement over current and naive baselines with a documented fallback and uncertainty UI. No live online learning, new model API or paid inference by default.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Scope this skill to the authorized task, preserve source rights, canonical Person/URLs, Auto ads, existing dependencies and owning-repository release gates. No new route, cron, paid service, database, push notification, or package install is authorized by loading this skill. Use skill-eval for adoption, compare against baseline, record unrun tests as NOT VERIFIED, and open a reviewed PR; do not auto-merge.

## Upstream references

- [Nixtla/statsforecast](https://github.com/Nixtla/statsforecast)
- [scikit-learn-contrib/MAPIE](https://github.com/scikit-learn-contrib/MAPIE)
- [online-ml/river](https://github.com/online-ml/river)

Reference only; no upstream code is vendored. Verify license, maintenance, compatibility and data rights at the selected revision before any implementation adoption.
