# TESTING.md — Citizen Dashboard Test Coverage Tracker

Modeled on `civic-hub/TESTING.md`. Updated alongside `HANDOFF.md` after every session that adds or modifies features.

---

## Testing Principles

1. **Tests ship with the feature.** Every slice (A1…A7) that adds or changes behavior must include corresponding tests before the slice is considered complete.
2. **Test behavior, not implementation.** Tests describe what a citizen experiences — "the feed blends live Floyd Hub items with the demo hubs," "a live item's CTA links to its action_url." They should survive refactors.
3. **One flow per test, with a clear name.** Test names read like sentences: `"live events from the Rep Space are merged into the demo feed, newest first"`.
4. **Cover the sad paths.** A source that is down (fetch fails), an empty `/events` response, a non-feed-worthy event (classifier returns null), a malformed event, offline/timeout — the demo feed must degrade gracefully, never blank out.
5. **The demo data is preserved.** A standing test asserts that all original mock hubs and feed items still render when live sources return nothing — the blend must never erase the demo.

---

## Quick Start

```bash
cd citizen-dashboard

# Component/unit tests (Vitest + Testing Library, jsdom — no servers needed)
npm run test

# Watch mode during development
npm run test:watch

# E2E browser tests (Playwright; live /events endpoints are MOCKED, so no Hub/Rep Space required)
npm run test:e2e
```

> Tooling to install in the setup slice: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, and `@playwright/test`. Add `test`, `test:watch`, `test:e2e` scripts and a `vitest.config.js` + `playwright.config.js`, mirroring the Hub.

---

## Two Test Layers

### Component / Unit Tests (Vitest + Testing Library)
Pure logic and rendered components, no browser, network mocked. Fast, high coverage.

- **Location:** `citizen-dashboard/src/**/*.test.{js,jsx}` (or `tests/unit/`)
- **Run:** `npm run test`
- **Priority targets** (the real logic of this build):
  - `services/feedActivity` — the vendored classifier (must stay byte-identical to the Rep Space copy).
  - `services/adaptEvents` — `CivicEvent → feed-item` mapping, `relativeTime`, `sortAt`.
  - `hooks/useFeed` — parallel fetch + **blend with `mockData.feedItems`** + time-sort + error/empty handling.
  - `components/FeedItem`, `Sidebar` — the "live" marker + click-through to `action_url`.

### E2E User Flow Tests (Playwright)
Open the real UI in Chromium; **mock both `/events` endpoints** (Floyd Hub + Rep Space) with fixture responses so tests are deterministic and need no running servers.

- **Location:** `citizen-dashboard/tests/e2e/`
- **Run:** `npm run test:e2e`
- **Covers:** blended feed renders (demo + live), live marker present on live items only, source filter (sidebar) narrows correctly, live CTA opens the fixture `action_url`, `isRead` persists across reload, mobile tab bar.

---

## Coverage Tracker

Fill in per slice. Status: ✅ done · 🟡 partial · ⬜ none.

| Area | Layer | Status | Notes |
|---|---|---|---|
| Test tooling + config installed | — | ✅ | vitest + Testing Library + jsdom + Playwright (chromium); 2 smoke tests |
| Classifier (`feedActivity`) parity | unit | ✅ | 7 tests pin hub + entity behavior; byte-identity sha-checked at copy time |
| Event adapter + relativeTime + sortAt | unit | ✅ | 8 tests incl. malformed-event tolerance, href absolutization (A3) |
| `useFeed` blend + sort + errors | unit | ✅ | 7 tests: blend/sort, one-source-down, all-down, empty, hub list, per-hub filter, 20s polling (A4) |
| Live marker + click-through | unit/e2e | ✅ | 3 unit (chip, CTA anchor, demo behavior preserved) + e2e (A5) |
| localStorage read-state | unit | ✅ | 6 tests: round-trip, corrupt JSON, markRead+counts, reload hydration, demo flags, card interactions (A6) |
| Sources config + fetcher | unit | ✅ | 8 tests: LIVE_SOURCES shape, envelope unwrap, non-2xx, network failure (A1) |
| Blended feed end-to-end | e2e | ✅ | 6 Playwright tests, both `/events` mocked: blend + markers, CTA href/target, source filter, one-source-down, all-down, read-state across reload |
| Demo-data-preserved guarantee | unit/e2e | ✅ | standing tests at both layers — feed intact when live sources empty/down |

**Totals: 38 unit/component tests (7 files) + 6 E2E. All green as of 2026-07-11.**
