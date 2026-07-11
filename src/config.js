// Live source registry (A1) — the two real services the Dashboard
// aggregates alongside its demo data. This is a static list by design:
// the Follow/PDS subscription model is a documented later upgrade
// (BUILD-PLAN "Deferred by design"), not an omission.
//
// To follow the incumbent (Pat Morgan) instead of the candidate, change
// `spacePath` below — one line (see HANDOFF Session 0 open question).

const HUB_URL = import.meta.env.VITE_HUB_URL || "http://localhost:3000";
const REP_URL = import.meta.env.VITE_REP_URL || "http://localhost:3001";

export const LIVE_SOURCES = [
  {
    id: "floyd-hub",
    name: "Floyd County Civic Hub",
    shortName: "Floyd Hub",
    baseUrl: HUB_URL,
    kind: "hub",
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
    kind: "entity",
    live: true,
    icon: "users",
    color: "#C37B51",
  },
];

/** Poll interval for live sources (ms). */
export const FEED_POLL_MS = 20_000;

/** Icon-chip colors for live sources — same shape as mockData.hubColors
 * (which is preserved untouched; these overlay it for the live ids). */
export const LIVE_HUB_COLORS = {
  "floyd-hub": { bg: "#E3EBE8", text: "#386759" },
  "rep-jamie": { bg: "#F4E1D2", text: "#8C4A2B" },
};
