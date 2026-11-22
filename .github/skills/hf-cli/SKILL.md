---
name: hf-cli
description: "On-demand Hugging Face Hub discovery and read-only repository inspection for local agent workflows; never automatically deploy, pay, download weights or publish."
---
# Hugging Face Hub CLI (curated adoption)

Upstream: https://github.com/huggingface/skills/tree/main/skills/hf-cli (reviewed 2026-11-22). This is a project-specific adaptation, not a vendored executable or installed CLI.

Use when asked to inspect Hugging Face models, datasets, Spaces, papers, licenses or revisions, or when an already authorized skill needs Hub metadata. First check whether an authenticated Hugging Face connector or existing CLI is available. Do not assume the agent's connector authentication is inherited by a local shell.

1. Establish the requested task and authorized account scope. Public model cards need no user token. Never print, commit, cache in logs, or embed HF_TOKEN; request authentication only if required for an explicitly authorized action.
2. Prefer read-only `hf models list/info`, `hf datasets list/info`, `hf spaces list/info`, or read-only API/connector equivalents. Check `hf --help` in the local environment rather than trusting versioned syntax.
3. Record repo ID, full revision/commit, intended task, license and additional usage terms, model size, runtime, source date, downloads/weights provenance, and whether external code execution is required.
4. If evaluating a tool, use a disposable development environment, with dry-run downloads and explicit size/compute budget. Avoid executing unreviewed `trust_remote_code`, setup scripts, model pickle files, or arbitrary Space code.
5. Never start a Job, endpoint, Space, inference provider, paid GPU, write, upload, deployment, scheduled fetch or production download unless separately authorized.
6. Produce a short ACCEPT / EXPERIMENT / REJECT / NOT VERIFIED decision with primary links. Prefer existing NOAA, NPS, USGS or Canadian owner data for actual observations.

This skill does not install `hf` on coding machines, modify Vercel, or authorize repository merges. Follow central AGENTS.md, owning-tool rules, Experience OS, Python Intelligence OS and CI. 
