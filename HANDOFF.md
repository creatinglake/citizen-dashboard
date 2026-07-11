# HANDOFF.md — Citizen Dashboard Build Log

Modeled on `civic-hub/HANDOFF.md`. Updated after every Claude Code / Fable session. Records what was built, what's incomplete, and open questions.

---

## Session 0 — Setup & scope (planning handoff)

**Branch:** `feature/dashboard-realization` (off `main`). Every slice commits separately so any step is individually revertable.

**Goal (see `BUILD-PLAN.md`, Plan A):** make the Dashboard *real* by **blending** live events from the Floyd Civic Hub (`:3000`) and a followed Representative Space (`:3001`) into the existing 3-column UI — **without a backend, database, or any cloud service**, and **without erasing any demo data**. Live items get a subtle marker and click through to their `action_url`.

**Hard constraints:**
- Work only inside `citizen-dashboard/`. Do **not** modify `../civic-hub` or `../representative-space` (read/copy only).
- Front-end only. No DB, no Vercel, no Supabase, no new cloud cost.
- Preserve all mock hubs + feed items in `src/data/mockData.js`. This is a blend, not a replace.
- Reference `./BUILD-PLAN.md` (Shared Foundation + Plan A). Do Plan B (Rep Space) **first** so this build has a real second feed to aggregate.

**Slices (from `BUILD-PLAN.md`):** F1 (American Landscape tokens) · A1 sources+fetch · A2 vendor the extended classifier from the Rep Space · A3 event→feed-item adapter · A4 blend + `useFeed` hook · A5 live marker + click-through · A6 localStorage read-state · A7 design. Plus a test-tooling setup step (see `TESTING.md`).

**Testing expectation:** tests ship with each slice (`TESTING.md`). Vitest for adapter/hook/classifier logic; Playwright (mocked `/events`) for the blended feed. A standing test asserts the demo data survives when live sources are empty or down.

### Built this session
- _(nothing yet — planning only)_

### Incomplete / next
- All of Plan A.

### Open questions
- Which rep is the followed live source: **Jamie Rivera (candidate)** as planned, or the **incumbent (Pat Morgan)** so Campaign Finance + Voting Record surfaces are foregrounded? (One-line change in A1 `LIVE_SOURCES`.)

---

## Session 1 — Plan A executed: the Dashboard is real — 2026-07-11

**Status: complete.** All slices (A0 tooling + A1–A7 + E2E) landed, one commit each, on `feature/dashboard-realization`. 38 unit tests + 6 Playwright E2E green. The dashboard blends live events from the Floyd Civic Hub (:3000) and Rep. Jamie Rivera's space (:3001) into the untouched demo feed — front-end only, no backend, all demo data preserved.

### What was built, per slice

- **A0** — Vitest + Testing Library + jsdom + Playwright (chromium, boots its own Vite on :5175, `/events` mocked in tests). Scripts: `test`, `test:watch`, `test:e2e`.
- **A1** — `src/config.js` `LIVE_SOURCES` (Floyd Hub `VITE_HUB_URL`→:3000; Rep. Rivera `VITE_REP_URL`→:3001, scoped to `?space_slug=jamie-rivera`) + `services/feed.js` fetcher. Followed rep = **Jamie Rivera** per plan; switching to Pat Morgan is the documented one-line change.
- **A2** — `services/feedActivity.ts` vendored **byte-identical** from `representative-space/ui/src/shared/feedActivity.ts` (sha `6ab563…ea6`) — hub + entity events through one `classifyActivity`. Re-diff whenever either side changes.
- **A3** — `services/adaptEvents.js`: classified CivicEvent → demo feed-item shape + `actionUrl` (absolutized), `live`, `sortAt`; kind→type map onto the existing Icons vocabulary; `relativeTime`, `friendlyActor`. Malformed events dropped, never thrown.
- **A4** — `hooks/useFeed.js` + `context/FeedContext.jsx`: parallel `Promise.allSettled` fetch, 20s poll, blend with `mockData.feedItems` (synthetic stable `sortAt`, demo starts "an hour ago" so fresh live items top the feed), sidebar/HubsList gain a **Live Sources** group. A down/empty/garbage source can never blank the feed.
- **A5** — pulsing **Live** chip on live cards + sidebar dots; live CTA is an anchor to the event's `action_url` (new tab). Demo items keep the View-in-hub button.
- **A6** — `services/readState.js`: live-item isRead in localStorage keyed by event id; expanding a card or clicking its CTA marks read; unread counts recompute; hydrates across reload. Demo flags untouched.
- **A7** — `--color-civic-cream` reconciled `#F7F8FA` → canonical `#F0EBE1` (matches `shared/design-system/tokens.css` + tailwind.config.js). Libre Franklin already loaded.

### Verified end-to-end (BUILD-PLAN §Verification, Dashboard scope)

Live against BOTH real services (Hub on :3000 with its dev Supabase, Rep Space on :3001 in-memory `dev:demo`): 41 blended items (21 demo + 13 rep + 7 hub), live markers only on live items, both sources in the sidebar with computed unread counts, click-through verified landing on the Rep Space Votes tab, body background resolves `#F0EBE1` with Libre Franklin headings, mobile layout (375px) intact. E2E covers the same flows with mocked `/events` incl. source-down degradation and read-state persistence across reload.

**Cross-repo fix found here:** rep-space `dev:demo` now sets `RS_UI_BASE_URL=http://localhost:5174` — without it, emitted `action_url`s pointed at the API origin and Dashboard click-throughs landed on JSON (committed in representative-space).

### Demo topology (all local)

```
civic-hub:              npm run dev            → :3000 (dev Supabase)
representative-space:   npm run dev:demo       → :3001 (in-memory, seeded)
representative-space/ui: npx vite --port 5174  → :5174
citizen-dashboard:      npm run dev            → :5173
```

### Incomplete / follow-ups
- Sub-pages (Sample Ballot, Representative Profile, Contact Reps) intentionally stay on mock data.
- Follow/PDS subscriptions, identity, participation actions: deferred by design (static `LIVE_SOURCES`).
- Live-item read state is per-browser (localStorage) — fine for the demo, a PDS concern later.
