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
