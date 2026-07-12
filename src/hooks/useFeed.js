// The blend (A4) — live events from LIVE_SOURCES merged with the demo feed.
//
// Guarantees:
//   - The demo data always renders. A source that is down, slow, empty, or
//     returning garbage can never blank the feed — failures resolve to []
//     for that source and everything else stays.
//   - Mock items keep their displayed relative strings ("1 hour ago");
//     sorting uses a synthetic, stable sortAt derived from their original
//     order so live items interleave cleanly.
//   - Sources are polled every FEED_POLL_MS while the dashboard is open.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LIVE_SOURCES, FEED_POLL_MS } from "../config";
import { getEvents } from "../services/feed";
import { adaptEvents } from "../services/adaptEvents";
import { loadReadIds, persistReadIds } from "../services/readState";
import { feedItems as mockFeedItems, civicHubs } from "../data/mockData";

// Anchor the demo items to "recently, in their original order": newest mock
// item sits just under anything live from today, each subsequent one 45min
// older. Computed once per app load so sorting is stable across renders.
const BOOT = Date.now();
const MOCK_SORT_STEP_MS = 45 * 60 * 1000;
const MOCK_BASE_OFFSET_MS = 60 * 60 * 1000; // demo starts "an hour ago"

const decoratedMockItems = mockFeedItems.map((item, index) => ({
  ...item,
  live: false,
  sortAt: BOOT - MOCK_BASE_OFFSET_MS - index * MOCK_SORT_STEP_MS,
}));

/** Live sources presented in the same shape as demo hub entries. */
export const liveSourceHubs = LIVE_SOURCES.map((s) => ({
  id: s.id,
  name: s.name,
  shortName: s.shortName,
  icon: s.icon,
  color: s.color,
  homeUrl: s.homeUrl,
  type: "live",
  live: true,
  unreadCount: 0,
}));

export function useFeed() {
  const [liveBySource, setLiveBySource] = useState({});
  const [sourceStatus, setSourceStatus] = useState({});
  const [loading, setLoading] = useState(true);
  // A6 — live-item read state, hydrated from localStorage.
  const [readIds, setReadIds] = useState(loadReadIds);
  const mountedRef = useRef(true);

  const markRead = useCallback((eventId) => {
    setReadIds((prev) => {
      if (prev.has(eventId)) return prev;
      const next = new Set(prev);
      next.add(eventId);
      persistReadIds(next);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled(
      LIVE_SOURCES.map(async (source) => ({
        id: source.id,
        items: adaptEvents(await getEvents(source), source),
      })),
    );
    if (!mountedRef.current) return;

    setLiveBySource((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => {
        const id = LIVE_SOURCES[i].id;
        if (r.status === "fulfilled") {
          next[id] = r.value.items;
        }
        // On failure: keep whatever we last had (possibly nothing) — the
        // demo data and any other live source are unaffected.
      });
      return next;
    });
    setSourceStatus(
      Object.fromEntries(
        results.map((r, i) => [
          LIVE_SOURCES[i].id,
          r.status === "fulfilled" ? "ok" : "error",
        ]),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const timer = setInterval(refresh, FEED_POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [refresh]);

  const items = useMemo(() => {
    const live = Object.values(liveBySource)
      .flat()
      .map((item) => ({ ...item, isRead: readIds.has(item.id) }));
    return [...decoratedMockItems, ...live].sort((a, b) => b.sortAt - a.sortAt);
  }, [liveBySource, readIds]);

  const hubs = useMemo(() => {
    const liveWithCounts = liveSourceHubs.map((hub) => ({
      ...hub,
      unreadCount: (liveBySource[hub.id] ?? []).filter(
        (i) => !readIds.has(i.id),
      ).length,
    }));
    return [...civicHubs, ...liveWithCounts];
  }, [liveBySource, readIds]);

  const itemsForHub = useCallback(
    (hubId) => items.filter((item) => item.hubId === hubId),
    [items],
  );

  const totalUnread = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items],
  );

  return {
    items,
    hubs,
    itemsForHub,
    totalUnread,
    sourceStatus,
    loading,
    refresh,
    markRead,
  };
}
