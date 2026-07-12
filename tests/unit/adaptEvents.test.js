import { describe, it, expect } from "vitest";
import {
  adaptEvents,
  relativeTime,
  friendlyActor,
} from "../../src/services/adaptEvents";

const SOURCE = { id: "rep-jamie", name: "Rep. Jamie Rivera" };

function entityEvent(overrides = {}) {
  return {
    id: "evt_abc123",
    version: "1.0",
    event_type: "civic.position_posted",
    timestamp: "2026-07-10T12:00:00.000Z",
    process_id: "",
    actor: "did:web:riveraforfloyd.com",
    jurisdiction: "us-va-floyd",
    action_url: "http://localhost:5174/space/jamie-rivera",
    source: { hub_id: "representative-space-local", hub_url: "http://localhost:3001", space_id: "jamie-rivera" },
    data: { space_slug: "jamie-rivera", topic: "Broadband Infrastructure" },
    meta: { visibility: "public" },
    ...overrides,
  };
}

describe("relativeTime", () => {
  const now = Date.parse("2026-07-10T12:00:00.000Z");
  it("formats minutes, hours, days", () => {
    expect(relativeTime("2026-07-10T11:59:40.000Z", now)).toBe("just now");
    expect(relativeTime("2026-07-10T11:15:00.000Z", now)).toBe("45m ago");
    expect(relativeTime("2026-07-10T05:00:00.000Z", now)).toBe("7h ago");
    expect(relativeTime("2026-07-07T12:00:00.000Z", now)).toBe("3d ago");
  });
});

describe("friendlyActor", () => {
  it("humanizes DID and email-style opaque ids", () => {
    expect(friendlyActor("did:web:riveraforfloyd.com")).toBe("riveraforfloyd.com");
    expect(friendlyActor("citizen_sarah_m@example.com")).toBe("citizen sarah m");
    expect(friendlyActor("hub_floyd_civic")).toBe("hub_floyd_civic");
    expect(friendlyActor(undefined)).toBe("Unknown");
  });
});

describe("adaptEvents", () => {
  it("maps a classified event into the demo feed-item shape + live fields", () => {
    const [item] = adaptEvents([entityEvent()], SOURCE);
    expect(item).toMatchObject({
      id: "evt_abc123",
      hubId: "rep-jamie",
      type: "update",
      title: "New position: Broadband Infrastructure",
      author: "riveraforfloyd.com",
      isRead: false,
      live: true,
      tags: ["New position"],
    });
    expect(item.actionUrl).toBe("http://localhost:5174/space/jamie-rivera");
    expect(item.sortAt).toBe(Date.parse("2026-07-10T12:00:00.000Z"));
    expect(typeof item.preview).toBe("string");
    expect(item.preview.length).toBeGreaterThan(0);
  });

  it("drops non-feed-worthy events (classifier null)", () => {
    const noise = entityEvent({
      event_type: "civic.issue_signaled",
      id: "evt_noise",
    });
    expect(adaptEvents([noise], SOURCE)).toEqual([]);
  });

  it("maps vote lifecycle to the existing type vocabulary", () => {
    const open = entityEvent({
      id: "evt_v1",
      event_type: "civic.process.started",
      data: { space_slug: "jamie-rivera", process: { type: "civic.vote" }, title: "Dark Sky vote" },
    });
    const results = entityEvent({
      id: "evt_v2",
      event_type: "civic.process.result_published",
      data: { space_slug: "jamie-rivera", process: { type: "civic.vote" }, title: "Dark Sky vote" },
    });
    const items = adaptEvents([open, results], SOURCE);
    expect(items.map((i) => i.type)).toEqual(["vote", "vote-result"]);
    expect(items[0].title).toBe("Vote open: Dark Sky vote");
  });

  it("absolutizes relative hub SPA hrefs against the event's action_url", () => {
    const hubDeliberation = {
      id: "evt_hub1",
      event_type: "civic.process.created",
      timestamp: "2026-07-10T10:00:00.000Z",
      process_id: "proc_conv1",
      actor: "user123",
      action_url: "http://localhost:5173/process/proc_conv1",
      data: { process: { type: "civic.polis_deliberation" }, title: "Green boxes" },
      meta: { visibility: "public" },
    };
    const [item] = adaptEvents([hubDeliberation], { id: "floyd-hub", name: "Floyd Hub" });
    expect(item.actionUrl).toBe("http://localhost:5173/deliberation/proc_conv1");
  });

  it("survives malformed events without throwing", () => {
    const garbage = [
      null,
      42,
      {},
      { event_type: "civic.position_posted" }, // no id
      entityEvent({ timestamp: "not-a-date", id: "evt_badts" }),
      entityEvent({ id: "evt_ok" }),
    ];
    const items = adaptEvents(garbage, SOURCE);
    expect(items.map((i) => i.id)).toEqual(["evt_ok"]);
  });

  it("returns [] for a non-array input", () => {
    expect(adaptEvents(undefined, SOURCE)).toEqual([]);
  });

  it("transplants stale localhost action_urls onto the source's real UI origin", () => {
    const prodSource = {
      id: "rep-jamie",
      name: "Rep. Jamie Rivera",
      uiOrigin: "https://representative.civic.social",
      homeUrl: "https://representative.civic.social/space/jamie-rivera",
    };
    const [item] = adaptEvents(
      [entityEvent({ action_url: "http://localhost:3001/space/jamie-rivera" })],
      prodSource,
    );
    expect(item.actionUrl).toBe(
      "https://representative.civic.social/space/jamie-rivera",
    );

    // A correct production action_url passes through untouched.
    const [ok] = adaptEvents(
      [
        entityEvent({
          id: "evt_ok2",
          action_url: "https://representative.civic.social/space/jamie-rivera/votes",
        }),
      ],
      prodSource,
    );
    expect(ok.actionUrl).toBe(
      "https://representative.civic.social/space/jamie-rivera/votes",
    );
  });
});
