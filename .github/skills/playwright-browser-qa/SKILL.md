---
name: playwright-browser-qa
description: "Browser acceptance and regression testing for interactive website tools, maps, and responsive layouts. Use when a task calls for Playwright or real-browser evidence, and automatically for substantial visitor-facing interface changes. Use the official Playwright CLI for agent exploration and existing Playwright tests for repeatable assertions."
---

# Playwright Browser QA

Use this skill when the owner says "use Playwright", "run browser QA", "test this tool in a browser", or when an interactive tool, map, important interaction, or substantial visual redesign needs real-browser acceptance. This is a verification capability, not a page template and not authorization to publish.

## Read first

1. Read the **owning** repository's AGENTS.md and affected tests. This site includes mirrors of products whose source lives in another repository. Do not modify a mirror instead of its owner.
2. Read [the Playwright workflow](../../../docs/PLAYWRIGHT_BROWSER_QA_WORKFLOW.md) for setup, proof, safety, and release expectations.
3. For substantial visitor-facing work also follow Experience OS, Experience Investment, and Foundry where applicable. Playwright proves observed behavior, not design quality, factual accuracy, SEO growth, or production deployment.

## Two complementary modes

**Explore and diagnose:** Prefer the official [Microsoft Playwright CLI](https://github.com/microsoft/playwright-cli) for a coding agent with shell and browser access. It exposes concise snapshots, screenshots, console logs, and network inspection. Do not confuse this CLI with the Playwright test runner or assume the official MCP server is connected.

**Protect behavior:** Add or extend an automated Playwright acceptance test using the relevant repository's existing test pattern and GitHub Action. Prefer role-based selectors, deterministic fixtures or network responses, accessible user paths, and assertions on what changes after each action. Keep an existing working test runner when possible; do not introduce a second package merely for this skill.

## CLI walkthrough

Only after confirming Node.js 20+, a working browser runtime and an available playwright-cli command in the **agent's execution environment**:

~~~bash
playwright-cli --help
playwright-cli -s=tool-qa open http://127.0.0.1:8765/
playwright-cli -s=tool-qa resize 390 844
playwright-cli -s=tool-qa snapshot
playwright-cli -s=tool-qa screenshot --filename=artifacts/playwright-qa/mobile.png
playwright-cli -s=tool-qa console
playwright-cli -s=tool-qa requests
playwright-cli -s=tool-qa resize 1280 900
playwright-cli -s=tool-qa snapshot
playwright-cli -s=tool-qa screenshot --filename=artifacts/playwright-qa/desktop.png
playwright-cli -s=tool-qa close
~~~

This example assumes a **locally started server** and an existing screenshot directory. Start a server only when needed, such as \`python3 -m http.server 8765 --bind 127.0.0.1 --directory public\`. Replace the root URL with the actual tool path. Use the snapshot to identify current element refs before clicking. Verify the visible result, not only that the click was accepted.

If the CLI is absent, check the [official installation instructions](https://github.com/microsoft/playwright-cli). With owner or environment permission, install \`@playwright/cli\` for the active agent environment, not the production dependency graph. Do not silently install globally, run untrusted page code, or edit MCP configuration. If no browser execution is possible, report **browser QA not run**. A GitHub file read is not a browser session.

## Required acceptance for a changed interactive experience

- Start with the actual visitor question: is the main answer visible on a phone, and does the primary action produce the expected new state?
- Test 360, 390, 768, 1280, and 1440 px where applicable. Inspect real screenshots and horizontal overflow, not CSS breakpoints alone.
- Exercise keyboard and focus, tap/click, empty states, navigation, no-JS critical fallback, errors, and A to B to A state recovery when relevant.
- For maps, verify tiles actually load, attribution is legible, pan/zoom does not scroll the page unexpectedly, marker/popup behavior, a source-backed arrival link, and a meaningful map-unavailable fallback. A map container existing is not proof that a map works.
- Inspect console errors and failed requests. Distinguish harmless external failures from user-visible defects. Mock unstable external providers for deterministic CI, then verify live integrations separately when authorized.
- Record the exact URL, environment, viewport, actions, expected and observed results, screenshots or traces, and test command. Use a redacted, short-lived artifact location.
- Add or update a focused regression test for reproducible bugs. Run targeted tests, then \`npm run verify:all\` in the **owning** repository and check PR CI. Report each as passed, failed, or not run.

## Nonnegotiable safety and scope

- Prefer local/preview for interaction tests. Production browsing is read-only unless the owner explicitly authorizes a specific write action.
- Never submit real purchases, contact forms, reservations, irreversible changes, or authenticated actions as a smoke test. Do not bypass login, paywalls, CAPTCHAs, access rules, or rate limits.
- Keep cookies, session storage, screenshots with personal information, and traces containing secrets out of commits and public CI artifacts. Use isolated temporary profiles and close sessions.
- No default Playwright MCP registration, new Vercel function, build dependency, scheduled job, or production route. A checked-in skill does **not** install or activate a browser for ChatGPT or any other agent.
- Preserve the owning repository's canonical/Person, ads, SEO, source evidence, privacy, accessibility, and full release gates. Open a PR; do not merge or deploy without owner instruction.
