import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { feedItems as mockFeedItems } from "../../src/data/mockData";

// Mock the fetch layer — useFeed's contract with the network is getEvents.
vi.mock("../../src/services/feed", () => ({ getEvents: vi.fn() }));
import { getEvents } from "../../src/services/feed";
import { useFeed } from "../../src/hooks/useFeed";

function liveEvent(id, eventType, ts, data = {}) {
  return {
    id,
    version: "1.0",
    event_type: eventType,
    timestamp: ts,
    process_id: "prc_1",
    actor: "did:web:riveraforfloyd.com",
    jurisdiction: "us-va-floyd",
    action_url: "http://localhost:5174/space/jamie-rivera",
    source: { hub_id: "rs", hub_url: "http://localhost:3001", space_id: "jamie-rivera" },
    data: { space_slug: "jamie-rivera", ...data },
    meta: { visibility: "public" },
  };
}

const NOW_ISH = new Date().toISOString();

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useFeed — the blend", () => {
  it("merges live events from both sources into the demo feed, newest first", async () => {
    getEvents.mockImplementation(async (source) =>
      source.id === "floyd-hub"
        ? [
            {
              id: "evt_hub1",
              event_type: "civic.process.started",
              timestamp: NOW_ISH,
              process_id: "proc_h1",
              actor: "u1",
              action_url: "http://localhost:5173/process/proc_h1",
              data: { process: { type: "civic.vote" }, title: "Hub vote" },
              meta: { visibility: "public" },
            },
          ]
        : [liveEvent("evt_rep1", "civic.position_posted", NOW_ISH, { topic: "Broadband" })],
    );

    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const ids = result.current.items.map((i) => i.id);
    expect(ids).toContain("evt_hub1");
    expect(ids).toContain("evt_rep1");
    // All demo items survive the blend.
    for (const demo of mockFeedItems) {
      expect(ids).toContain(demo.id);
    }
    // Fresh live items sort above the demo items (which start "an hour ago").
    expect(ids.indexOf("evt_rep1")).toBeLessThan(
      ids.indexOf(mockFeedItems[0].id),
    );
    // Sorted by sortAt descending throughout.
    const sortAts = result.current.items.map((i) => i.sortAt);
    expect([...sortAts].sort((a, b) => b - a)).toEqual(sortAts);
  });

  it("preserves the demo feed when one source is down", async () => {
    getEvents.mockImplementation(async (source) => {
      if (source.id === "floyd-hub") throw new Error("ECONNREFUSED");
      return [liveEvent("evt_rep1", "civic.position_posted", NOW_ISH, { topic: "X" })];
    });

    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sourceStatus).toEqual({
      "floyd-hub": "error",
      "rep-jamie": "ok",
    });
    const ids = result.current.items.map((i) => i.id);
    expect(ids).toContain("evt_rep1");
    for (const demo of mockFeedItems) expect(ids).toContain(demo.id);
  });

  it("preserves the demo feed when every source is down", async () => {
    getEvents.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(mockFeedItems.length);
    expect(result.current.items.every((i) => !i.live)).toBe(true);
  });

  it("preserves the demo feed when sources return no events", async () => {
    getEvents.mockResolvedValue([]);

    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(mockFeedItems.length);
  });

  it("appends the live sources to the hub list with computed unread counts", async () => {
    getEvents.mockImplementation(async (source) =>
      source.id === "rep-jamie"
        ? [liveEvent("evt_rep1", "civic.position_posted", NOW_ISH, { topic: "X" })]
        : [],
    );

    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const live = result.current.hubs.filter((h) => h.type === "live");
    expect(live.map((h) => h.id)).toEqual(["floyd-hub", "rep-jamie"]);
    expect(live.find((h) => h.id === "rep-jamie").unreadCount).toBe(1);
    // Demo hubs are still all present.
    expect(result.current.hubs.length).toBeGreaterThan(live.length);
  });

  it("filters items per hub, live and demo alike", async () => {
    getEvents.mockImplementation(async (source) =>
      source.id === "rep-jamie"
        ? [liveEvent("evt_rep1", "civic.position_posted", NOW_ISH, { topic: "X" })]
        : [],
    );

    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.itemsForHub("rep-jamie").map((i) => i.id)).toEqual([
      "evt_rep1",
    ]);
    const demoHubId = mockFeedItems[0].hubId;
    expect(
      result.current.itemsForHub(demoHubId).every((i) => i.hubId === demoHubId),
    ).toBe(true);
  });

  it("polls the sources on the configured interval", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getEvents.mockResolvedValue([]);
    const { unmount } = renderHook(() => useFeed());
    await waitFor(() => expect(getEvents).toHaveBeenCalledTimes(2)); // 2 sources

    await act(async () => {
      await vi.advanceTimersByTimeAsync(21_000);
    });
    expect(getEvents.mock.calls.length).toBeGreaterThanOrEqual(4);
    unmount();
  });
});
