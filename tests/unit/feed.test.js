import { describe, it, expect, vi, afterEach } from "vitest";
import { getEvents } from "../../src/services/feed";
import { LIVE_SOURCES } from "../../src/config";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(impl) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

describe("config: LIVE_SOURCES", () => {
  it("registers the Floyd Hub and the followed Rep Space", () => {
    const ids = LIVE_SOURCES.map((s) => s.id);
    expect(ids).toEqual(["floyd-hub", "rep-jamie"]);
    for (const s of LIVE_SOURCES) {
      expect(s.live).toBe(true);
      expect(s.baseUrl).toMatch(/^https?:\/\//);
    }
  });

  it("scopes the entity source to the followed space's events", () => {
    const rep = LIVE_SOURCES.find((s) => s.id === "rep-jamie");
    expect(rep.spacePath).toContain("space_slug=jamie-rivera");
  });
});

describe("getEvents", () => {
  it("unwraps the {events, count} envelope", async () => {
    const events = [{ id: "evt_1" }, { id: "evt_2" }];
    const spy = stubFetch(async () => ({
      ok: true,
      json: async () => ({ events, count: 2 }),
    }));

    const result = await getEvents({ baseUrl: "http://x.test" });
    expect(result).toEqual(events);
    expect(spy).toHaveBeenCalledWith(
      "http://x.test/events",
      expect.anything(),
    );
  });

  it("uses the source's spacePath when present", async () => {
    const spy = stubFetch(async () => ({
      ok: true,
      json: async () => ({ events: [], count: 0 }),
    }));
    await getEvents({
      baseUrl: "http://x.test",
      spacePath: "/events?space_slug=jamie-rivera",
    });
    expect(spy).toHaveBeenCalledWith(
      "http://x.test/events?space_slug=jamie-rivera",
      expect.anything(),
    );
  });

  it("throws on a non-2xx response", async () => {
    stubFetch(async () => ({ ok: false, status: 503 }));
    await expect(getEvents({ baseUrl: "http://x.test" })).rejects.toThrow(
      "503",
    );
  });

  it("propagates network failure", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(getEvents({ baseUrl: "http://x.test" })).rejects.toThrow(
      "Failed to fetch",
    );
  });

  it("returns [] when the envelope has no events array", async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({}) }));
    expect(await getEvents({ baseUrl: "http://x.test" })).toEqual([]);
  });
});
