// Live source registry (A1) — the two real services the Dashboard
// aggregates alongside its demo data. This is a static list by design:
// the Follow/PDS subscription model is a documented later upgrade
// (BUILD-PLAN "Deferred by design"), not an omission.
//
// To follow the incumbent (Pat Morgan) instead of the candidate, change
// `spacePath` below — one line (see HANDOFF Session 0 open question).

// API base (where /events lives) and UI home (where a person browses).
// In production both services mount the API under /api on the same domain
// as their UI (e.g. https://floyd.civic.social/api), so the UI home
// defaults to the API base with the /api suffix stripped. Local dev splits
// origins (API :3000/:3001, UI :5173/:5174), so the home URLs are set
// explicitly there.
const HUB_URL = import.meta.env.VITE_HUB_URL || "http://localhost:3000";
const REP_URL = import.meta.env.VITE_REP_URL || "http://localhost:3001";

const stripApiSuffix = (url) => url.replace(/\/api\/?$/, "");

const HUB_HOME =
  import.meta.env.VITE_HUB_HOME_URL || stripApiSuffix(HUB_URL);
const REP_HOME =
  import.meta.env.VITE_REP_HOME_URL ||
  (REP_URL.startsWith("http://localhost")
    ? "http://localhost:5174"
    : stripApiSuffix(REP_URL));

// Live sources sit inside the regular sidebar groups (sidebarGroup), not a
// separate "Live Sources" section — the real Floyd County hub IS the Floyd
// County jurisdiction entry (it replaces the demo hub of the same name),
// and the Rep Space lives under Representatives. Cards carry a LIVE SOURCE
// pill instead.
export const LIVE_SOURCES = [
  {
    id: "floyd-hub",
    name: "Floyd County Civic Hub",
    shortName: "Floyd County",
    baseUrl: HUB_URL,
    homeUrl: HUB_HOME,
    uiOrigin: new URL(HUB_HOME).origin,
    kind: "hub",
    sidebarGroup: "jurisdiction",
    live: true,
    icon: "capitol",
    color: "#386759",
  },
  {
    id: "rep-jamie",
    name: "Rep. Jamie Rivera",
    shortName: "Rep. Rivera",
    baseUrl: REP_URL,
    // Only this space's events are pulled from the Rep Space service.
    spacePath: "/events?space_slug=jamie-rivera",
    homeUrl: `${REP_HOME}/space/jamie-rivera`,
    uiOrigin: new URL(REP_HOME).origin,
    kind: "entity",
    sidebarGroup: "representative",
    live: true,
    icon: "users",
    color: "#C37B51",
  },
];

/** Demo hubs superseded by a live source (the real service replaces the
 * mock of the same thing). Their demo feed items are filtered out too —
 * mockData.js itself stays untouched. */
export const SUPERSEDED_DEMO_HUBS = new Set(["floyd-county"]);

/** Poll interval for live sources (ms). */
export const FEED_POLL_MS = 20_000;

/**
 * Per-source cap on live feed items, newest first. Keeps the historical
 * backfill to roughly "the last dozen" so a hub with months of activity
 * doesn't drown the feed — new events always enter at the top and older
 * ones roll off.
 */
export const LIVE_ITEM_LIMIT = 12;

/** Icon-chip colors for live sources — same shape as mockData.hubColors
 * (which is preserved untouched; these overlay it for the live ids). */
export const LIVE_HUB_COLORS = {
  "floyd-hub": { bg: "#E3EBE8", text: "#386759" },
  "rep-jamie": { bg: "#F4E1D2", text: "#8C4A2B" },
};
