// Read-state persistence for LIVE items (A6) — no backend, so localStorage
// keyed by event id. Demo items keep their hardcoded isRead flags; only
// live items flow through here. All storage access is failure-tolerant
// (private browsing, quota, corrupt JSON → behave as "nothing read yet").

const STORAGE_KEY = "civicdash_read_live_events";

export function loadReadIds() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function persistReadIds(readIds) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds]));
  } catch {
    // best effort — read state just won't survive the reload
  }
}
