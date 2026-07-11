# Plan: Make the Citizen Dashboard & Representative Space "real" (demo-grade, DB-free)

## Context

The Civic.Social ecosystem has three front-ends that should visibly interoperate on one protocol and one design language: the **Civic Hub** (community-scoped, already real, Supabase-backed, runs today), the **Representative Space** (entity-scoped), and the **Citizen Dashboard** (individual-scoped). Today only the Hub is truly connected. This effort turns the other two into working software — **demo-able and actually working, with no database in the two apps we touch** — while *preserving all existing demo data* in both.

Findings that shaped the plan:
- **Representative Space is already a full-stack app** (React 19/Vite + Express + Supabase, Polis deliberative loop, 198 tests). We are **not** rebuilding it. Its stores already run **DB-free in-memory** when `SUPABASE_URL` is unset (`representative-space/src/lib/supabase.ts`, `useDatabase()`). So "no database" = run in-memory + boot seed, then refactor + integrate.
- **Its biggest weakness is navigation:** each space is *one long vertical scroll* of stacked sections with only a thin global top bar — no per-space nav ([representative-space/ui/src/pages/IndividualSpace.tsx](representative-space/ui/src/pages/IndividualSpace.tsx), `components/Nav.tsx`). The Hub already solves this and shares the same design tokens, so most of the Hub transfers as layout, not re-theme.
- **Citizen Dashboard is pure front-end** (React/Vite/Tailwind, no TS, one `mockData.js`, no fetch layer). It's structurally good; it just needs to become real + adopt the new palette. Its demo data (example hubs + feed) is kept and **blended** with live sources.

The spec branch `spec-consolidation-v0.2` frames the Dashboard as aggregating **the Floyd Civic Hub and a followed Representative Space** — that two-source blend is the "the ecosystem is real" money shot.

**Locked design decisions (with the user):** keep & run Rep Space DB-free in-memory · **American Landscape** palette (green/earth + Libre Franklin) as canonical, structured as a one-file swap · Dashboard = real aggregated feed + click-through, read-only · **preserve all demo data in both apps** · Rep Space adopts Hub-style nav/feed, **adds Votes** (Issue Board stays the proposals/petitions surface, no separate Proposals type), **drops Projects**, and **adds Campaign Finance + Voting Record** surfaces · Dashboard **blends** live + demo with a subtle "live" marker.

**Delivery:** two independently-executable plans (A: Dashboard, B: Rep Space) preceded by a **Shared Foundation**, feedable to Fable separately. Slices are sized ~one Fable prompt each, ordered by dependency.

**Spec anchors** (`civic-social-docs/`, branch `spec-consolidation-v0.2`): `ecosystem/civic-space-spec.md` (§1.4 scope taxonomy, §7 Space API Profile), `ecosystem/civic-activity-spec.md` (event schema + types), `pilots/citizen-dashboard/citizen-dashboard-pilot-spec.md`. Wire format frozen at v0.1: `event_type`, `GET /events`. Rep Space surfaces per `representative-space-design.md` (CampaignFinanceReport shape at line ~237; voting-record at line ~111; both read-only / entity-uneditable).

---

## The event contract (both plans)

`GET /events` (Hub :3000, Rep Space :3001) → `{ events: CivicEvent[], count }`, newest-first, public (no auth). Shape (`civic-hub/src/models/event.ts`):

```ts
interface CivicEvent {
  id; version;               // "1.0"
  event_type;                // e.g. "civic.process.result_published"
  timestamp;                 // ISO 8601
  process_id; actor; jurisdiction;
  action_url;                // fully-qualified UI link — the click-through target
  source: { hub_id; hub_url; space_id? };
  data;                      // per-type; carries data.process.type
  meta: { visibility: "public" | "restricted" };
}
```

Feed-worthiness = the single, dependency-free classifier `civic-hub/src/shared/feedActivity.ts` → `classifyActivity(event)` → `Activity { surface, kind, pill, actionUrl }` or `null` (explicit allowlist, default-closed). **Reuse it; never fork it.** Both the Dashboard (A2) and the Rep Space feed (B4) use a byte-identical copy that we *extend* for entity events.

---

## Spec compatibility — best effort, with an upgrade path

**The specs are an ideal future state, not a gate.** Make a *best effort* to comply where it's easy or moderately hard; **simplify where strict compliance would over-complicate the demo**, as long as there's a clean upgrade path (deferred behind an interface, not painted into a corner). Model the posture on the **Civic Hub**, which is spec-shaped but pragmatic: opaque `userId` + session-token auth (no DID), single-hub deployment, no federation — all deferred behind interfaces. Do **not** let spec-chasing make these builds complicated.

Authoritative specs live in `../civic-social-docs/` on branch **`spec-consolidation-v0.2`** (read-only; verified present). The checklist below is the distilled target; read the full specs only for detail, never block on cross-repo access. Most of it is already satisfied by existing Hub/Rep Space code — the constraints mainly bite on the *new* work (Votes, entity events). For the demo, spec fields may take **simple constant values** (e.g. a fixed `jurisdiction` like `us-va-floyd`, an opaque `actor` string, a constant `space_id`).

- **Space API Profile** (`ecosystem/civic-space-spec.md` §7): every space exposes `GET /.well-known/civic.json`, `POST /process`, `GET /process/:id`, `POST /process/:id/action` (actor from auth context, **never** the request body), `GET /events` (descending, filterable by `process_id`/type); recommended `GET /process`, `GET /health`. The Rep Space already implements these — new process types (Votes) plug into the *same* endpoints, not new ones.
- **Scope model** (§1.4): Rep Space = **`entity`** scope (sub-types public official / candidate / institutional). Its `civic.json` must report `scope:"entity"`, its `space.id`, jurisdictions, feeds, processes.
- **CivicEvent required fields** (`ecosystem/civic-activity-spec.md` §3 — the single authoritative list): every emitted event MUST include `id`, `version:"1.0"`, `event_type`, `timestamp` (ISO 8601), `process_id` (for process activities), `actor`, `jurisdiction`, `action_url`, `source{hub_id,hub_url,space_id}`, `data` (may be `{}`), `meta.visibility`. **Never omit `version`, `source`, or `meta.visibility`.**
- **Event types** (§4): use canonical types — lifecycle `civic.process.created/.updated/.started/.ended/.result_published`; participation `civic.process.action_taken/.vote_submitted/.comment_added/.proposal_created`; outcome `civic.outcome_delivered`. Extension convention `civic.<domain>.<verb>`; every `civic.process.*` carries `data.process.type`.
- **Wire format frozen at v0.1** (§14): keep `event_type` and `GET /events` (NOT `activity_type`/`GET /activities`, which are v0.2-planned). `source.space_id` is optional in v0.1 but **emit it anyway**.
- **Visibility vs disclosure** (§7): `meta.visibility` ∈ `public | restricted`. Entity-space accountability events are `public`. Preserve ballot secrecy — emit `vote_submitted` as `restricted` so it stays off the public feed, exactly as the Hub does.
- **Consumer compatibility**: the Dashboard consumes the Hub's *actual* `/events` response (`{events,count}` of the CivicEvent above). The shared classifier `feedActivity.ts` is the single inclusion gate — **extend its allowlist, never fork its logic** (`pilots/civic-activity-feed-discovery/...` treats the feed as chronological + proximity only, no engagement ranking).
- **Deferred by design — do NOT build these now** (keep them behind interfaces for a later upgrade, exactly as the Hub defers them): Civic Identity (DID/verifiable credentials), cross-hub/ActivityPub federation, PDS-backed subscriptions, real-time/webhook delivery. Keep `actor` as the existing opaque user-id stub (a DID-*compatible* string, not a real DID). The Dashboard's `Follow`/subscription model stays out of scope — it uses a static `LIVE_SOURCES` list, not a PDS. These are documented upgrade paths, not omissions.

---

## Shared Foundation

### F1 — Canonical design tokens (American Landscape, swappable)
- Author one source-of-truth values file `shared/design-system/tokens.css` (`shared/` is writable): American Landscape primitives — `civic-green #386759`, `civic-teal #294B52`, `civic-rust #C37B51`, `civic-yellow #EDC572`, cream surfaces — plus `--font-heading: "Libre Franklin"`, `--font-body: Inter`, spacing/radii/shadow scales. **Keep every palette hex in one `:root` block** so an American-Landscape↔blue swap later is a single edit.
- Apps deploy independently (separate git repos/Vercel), so **vendor** the palette into each app's existing primitive-token layer (semantic aliases like `--color-primary` stay; only the hex values under them change):
  - `civic-hub/ui/src/styles/design-system/tokens.css` — repoint primitives to AL values.
  - `representative-space/ui/src/styles/theme.css` — repoint (its header comment already anticipates adopting American Landscape).
  - `citizen-dashboard/`: `tailwind.config.js` + `src/index.css` `@theme` — already American Landscape; reconcile the `civic-cream` inconsistency (`#F0EBE1` vs `#F7F8FA`) to the canonical value; ensure Libre Franklin headings.

### F2 — Local demo topology
| Service | Dir | Port | Storage | Seed |
|---|---|---|---|---|
| Floyd Civic Hub | `civic-hub` | 3000 | existing (Supabase) — runs as-is | `GET /debug/seed`; `HUB_ID=civic-hub-floyd`, `DEFAULT_JURISDICTION=us-va-floyd` |
| Representative Space (API/UI) | `representative-space` | 3001 / 5174 | **in-memory (no Supabase env)** | boot seed (B1) |
| Citizen Dashboard | `citizen-dashboard` | 5173 | none (front-end only) | keeps mock data |

- **CORS:** Hub dev CORS is `*` when `CIVIC_ALLOWED_ORIGINS` unset. Ensure Rep Space CORS allows `http://localhost:5173` (B10).
- **Assumption to confirm:** the Floyd Hub keeps its existing Supabase storage for the demo (this plan makes the *two new apps* DB-free, not the Hub). A fully DB-free Hub would be a separate follow-up.

---

## Plan A — Citizen Dashboard: blend live feeds into the demo

**Goal:** keep every existing demo hub + feed item, and **merge in** live events from the Floyd Hub and a followed Representative Space, in the existing 3-column UI, with a subtle "live" marker and click-through to `action_url`. Read-only, no identity.

Files today: `src/App.jsx`, `src/components/{Newsfeed,FeedItem,Sidebar,WidgetPanel}.jsx`, `src/data/mockData.js`. UI feed-item shape: `{ id, hubId, type, title, preview, fullContent, author, timestamp(relative string), tags[], isRead }`; consumed via `feedItems` / `getFeedItemsByHub` / `civicHubs`.

| Slice | Work |
|---|---|
| **A1 — Sources config + fetch** | `src/config.js`: `LIVE_SOURCES = [{ id:'floyd-hub', label:'Floyd County', baseUrl, kind:'hub', live:true }, { id:'rep-jamie', label:'Rep. Jamie Rivera', baseUrl, kind:'entity', live:true }]`, baseUrls overridable via `import.meta.env.VITE_HUB_URL`/`VITE_REP_URL` (defaults `:3000`/`:3001`). `src/services/feed.js` `getEvents(baseUrl)` mirrors `civic-hub/ui/src/services/api.ts` (fetch, throw non-2xx, return `res.events`). |
| **A2 — Vendor the contract** | Copy `civic-hub/src/shared/feedActivity.ts` → `src/services/feedActivity.ts` (dependency-free; Vite transpiles TS in this JS app) + a `CivicEvent` JSDoc typedef. Use `classifyActivity` to drop non-feed-worthy events and get `kind`/`pill`/`actionUrl`. **Must stay identical to the Rep Space copy (B4).** |
| **A3 — Event→FeedItem adapter** | `src/services/adaptEvents.js`: classified `CivicEvent` → feed-item shape. `hubId`=live source id; `type`= mapped `activity.kind` (preserve `Newsfeed.jsx` `opportunities` set); title/preview/fullContent from `activity.pill` + `data`; `author`=friendly `actor`; `timestamp`=`relativeTime(ISO)`; **new fields** `actionUrl`, `live:true`, and a numeric `sortAt` (ms). |
| **A4 — Blend + live data hook** | `src/hooks/useFeed.js`: fetch `LIVE_SOURCES` in parallel, adapt, **merge with `mockData.feedItems`**, sort by `sortAt` desc (add a `sortAt` to mock items — a stable synthetic recent time — so blend sorts cleanly while displayed relative strings stay). Poll ~20s. Sidebar `civicHubs` = existing demo hubs **+** live sources appended. Loading/empty/error states. Thread via small context or props from `App.jsx`. |
| **A5 — "Live" marker + click-through** | In `FeedItem.jsx` and `Sidebar.jsx`, live items/sources get a subtle indicator (small live dot / "Live" chip). Primary CTA on live items opens `item.actionUrl` in a new tab — the visible proof of real connection. Demo items keep current behavior. |
| **A6 — Read state (no backend)** | Persist `isRead` for live items in `localStorage` keyed by event id; hydrate on load. Demo items keep their `isRead` flags. |
| **A7 — Design** | Apply F1 (already AL — reconcile cream, Libre Franklin headings). |

**Preserved:** all demo hubs, the demo feed, and the sub-pages (Sample Ballot, Representative Profile, Contact Reps) stay on mock data. **Out of scope:** Follow/PDS, identity, participation actions.

---

## Plan B — Representative Space: Hub-style refactor, DB-free, publishing

**Goal:** run demo-able with no database; adopt the Hub's per-space navigation + feed; add **Votes**, **Campaign Finance**, and **Voting Record**; drop **Projects**; publish feed-worthy events so it's the Dashboard's second live source; adopt American Landscape. Polish, not rebuild. Existing sections preserved and re-homed under tabs.

Existing surfaces (keep): IdentityCard, Deliberations (Polis "Conversations"), OutcomeDeliveries (incumbent), PositionStatements, IssueBoard (= proposals/petitions/polls), ResponsivenessLedger. `GET /events` + `GET /.well-known/civic.json` already exist (`src/app.ts:82-83`).

| Slice | Work |
|---|---|
| **B1 — DB-free boot seed** | In-memory mode auto-selects when `SUPABASE_URL` unset. Add a boot-time, **idempotent** seeder (guarded to `!useDatabase()`) porting `scripts/seed-demo.ts` logic: Jamie Rivera (candidate) + Pat Morgan (incumbent) + Floyd scenario, **plus demo data for Votes, Campaign Finance, and Voting Record**. Add a `dev:demo` script (no Supabase env). Fixes the "tripled seed" issue. |
| **B2 — Per-space navigation** | Introduce a shared space layout with a route-backed **tab strip** modeled on `civic-hub/ui/src/components/FeedVotesTabs.tsx`, sitting under `IdentityCard`/banner: **Overview · Conversations · Votes · Issues · Campaign Finance · Record**. Move each existing stacked `<section>` under its tab (nested routes under `/space/:slug/*`). Sub-type differences: candidate foregrounds Positions + omits Voting Record/Outcomes; incumbent foregrounds Outcomes + Voting Record. |
| **B3 — Add Votes process type** | Port the Hub's `civic.vote` handler into the Rep Space process registry and reuse `VotePanel`-style UI so the rep hosts advisory votes (ballot + tally + receipt). **No separate Proposals type** — the Issue Board remains the proposals/petitions surface. Projects stays dropped (already absent). |
| **B4 — Overview feed + shared classifier (integration core)** | Build an "Overview" feed of the entity's activity using a vendored, byte-identical copy of `feedActivity.ts` (A2), **extended** with an entity allowlist: position published, outcome delivered, entity response, vote opened/closed, issue raised/responded. Ensure `emitEvent` writes spec-compliant **public** `CivicEvent`s with `source.space_id` = space identity, correct `event_type` + `data.process.type`, `action_url` → the Rep Space UI. This same feed is what the Dashboard aggregates (A1 `rep-jamie`). |
| **B5 — Campaign Finance panel** | New read-only, entity-uneditable section modeled on `OutcomeDeliveries`/`VoteResults`: a **visual** panel — raised / spent / cash-on-hand + a **donor-category breakdown chart** + reporting period + source link — from demo `CampaignFinanceReport` data. (Use the `dataviz` skill for the chart at build time.) |
| **B6 — Voting Record ledger (incumbent)** | New read-only ledger modeled on `civic-hub/ui/src/pages/VoteLog.tsx`: rows of bill/motion title · date · vote (yea/nay/abstain/absent) · source link, with a lookup box. Demo data. Shown on incumbent, hidden on candidate ("no voting record yet"). |
| **B7 — Design alignment** | Repoint `representative-space/ui/src/styles/theme.css` to American Landscape + Libre Franklin (F1). |
| **B8 — Known-gap polish** (optional) | Commit the uncommitted working-tree changes (`Deliberations.tsx/.css`, `ui/src/services/api.ts`); "Start" button on draft deliberations; seed-statements field in `HostDeliberationForm`. |
| **B9 — CORS** | Allow `http://localhost:5173` (Dashboard) and `:5174` (own UI). |

---

## Verification (end-to-end, via preview tooling)

1. **Bring the ecosystem up:** Hub :3000 (`/debug/seed`, Floyd config); Rep Space :3001 in-memory boot-seeded (`dev:demo`, no Supabase env) + UI :5174; Dashboard :5173.
2. **Contract check:** `curl :3000/events` and `curl :3001/events` → `{events,count}` with the `CivicEvent` shape, `meta.visibility:"public"`; confirm Rep Space emits the new entity events (position/vote/outcome/issue) after seeding.
3. **Dashboard (preview tools):** `preview_start`; `preview_network` shows successful `GET /events` to both live sources; `preview_snapshot` shows demo items **and** live items merged and time-sorted; live items/sources show the "live" marker; sidebar lists demo hubs + Floyd + Rep Jamie; `preview_click` a live CTA → opens the correct `action_url`; `isRead` persists across reload; `preview_screenshot` for the AL look; `preview_resize` mobile.
4. **Rep Space:** tab nav works; Votes ballot + tally; Campaign Finance visual panel + donor chart render; Voting Record ledger (incumbent only); Overview feed renders; runs with no Supabase env.
5. **Design cohesion:** `preview_inspect` `--color-primary` + heading font resolve to the same American Landscape values across Hub, Rep Space, Dashboard.
6. **No regressions:** `npm test` (198 tests) green after B1–B9.

## Fable handoff notes
- Do **Shared Foundation** first (or inline into whichever plan runs first).
- Feed **Plan A** and **Plan B** as separate Fable runs; A2 and B4 must keep their `feedActivity.ts` copies byte-identical.
- Each slice (A1–A7, B1–B9) is one Fable prompt, ordered by dependency.
