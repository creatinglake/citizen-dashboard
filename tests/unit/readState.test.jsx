// A6 — live-item read state persisted in localStorage, keyed by event id.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act, render, screen } from "@testing-library/react";
import { loadReadIds, persistReadIds } from "../../src/services/readState";
import { feedItems as allMockItems } from "../../src/data/mockData";
import { SUPERSEDED_DEMO_HUBS } from "../../src/config";
import { FeedItem } from "../../src/components/FeedItem";

// Superseded demo hubs (live-replaced) take their items with them.
const mockFeedItems = allMockItems.filter(
  (i) => !SUPERSEDED_DEMO_HUBS.has(i.hubId),
);

vi.mock("../../src/services/feed", () => ({ getEvents: vi.fn() }));
import { getEvents } from "../../src/services/feed";
import { useFeed } from "../../src/hooks/useFeed";

const NOW_ISH = new Date().toISOString();

function liveEvent(id) {
  return {
    id,
    event_type: "civic.position_posted",
    timestamp: NOW_ISH,
    process_id: "",
    actor: "did:web:riveraforfloyd.com",
    action_url: "http://localhost:5174/space/jamie-rivera",
    data: { space_slug: "jamie-rivera", topic: "Topic " + id },
    meta: { visibility: "public" },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("readState storage", () => {
  it("round-trips ids and survives corrupt JSON", () => {
    persistReadIds(new Set(["evt_a", "evt_b"]));
    expect(loadReadIds()).toEqual(new Set(["evt_a", "evt_b"]));

    window.localStorage.setItem("civicdash_read_live_events", "{not json");
    expect(loadReadIds()).toEqual(new Set());
  });
});

describe("useFeed read state", () => {
  it("markRead flips the live item, updates counts, and persists", async () => {
    getEvents.mockImplementation(async (s) =>
      s.id === "rep-jamie" ? [liveEvent("evt_r1"), liveEvent("evt_r2")] : [],
    );

    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = result.current.hubs.find((h) => h.id === "rep-jamie");
    expect(before.unreadCount).toBe(2);

    act(() => result.current.markRead("evt_r1"));

    const item = result.current.items.find((i) => i.id === "evt_r1");
    expect(item.isRead).toBe(true);
    expect(
      result.current.hubs.find((h) => h.id === "rep-jamie").unreadCount,
    ).toBe(1);
    expect(loadReadIds().has("evt_r1")).toBe(true);
  });

  it("hydrates read state on a fresh mount (simulated reload)", async () => {
    persistReadIds(new Set(["evt_r1"]));
    getEvents.mockImplementation(async (s) =>
      s.id === "rep-jamie" ? [liveEvent("evt_r1"), liveEvent("evt_r2")] : [],
    );

    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items.find((i) => i.id === "evt_r1").isRead).toBe(true);
    expect(result.current.items.find((i) => i.id === "evt_r2").isRead).toBe(false);
  });

  it("demo items keep their hardcoded isRead flags", async () => {
    getEvents.mockResolvedValue([]);
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    for (const demo of mockFeedItems) {
      expect(result.current.items.find((i) => i.id === demo.id).isRead).toBe(
        demo.isRead,
      );
    }
  });
});

describe("FeedItem read interaction", () => {
  const liveItem = {
    id: "evt_live1",
    hubId: "rep-jamie",
    type: "vote",
    title: "Vote open",
    preview: "p",
    fullContent: "f",
    author: "a",
    timestamp: "5m ago",
    tags: [],
    isRead: false,
    live: true,
    actionUrl: "http://localhost:5174/space/jamie-rivera/votes",
    sortAt: Date.now(),
  };

  it("expanding a live item marks it read", () => {
    const onMarkRead = vi.fn();
    render(<FeedItem item={liveItem} onViewInHub={() => {}} onMarkRead={onMarkRead} />);
    // The card itself is the expand target (role=button on the article).
    screen.getAllByRole("button")[0].click();
    expect(onMarkRead).toHaveBeenCalledWith("evt_live1");
  });

  it("an already-read live item does not re-fire", () => {
    const onMarkRead = vi.fn();
    render(
      <FeedItem
        item={{ ...liveItem, isRead: true }}
        onViewInHub={() => {}}
        onMarkRead={onMarkRead}
      />,
    );
    screen.getAllByRole("button")[0].click();
    expect(onMarkRead).not.toHaveBeenCalled();
  });
});
