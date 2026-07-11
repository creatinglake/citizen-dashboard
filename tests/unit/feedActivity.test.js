// Behavior tests for the VENDORED classifier (A2).
//
// src/services/feedActivity.ts must stay byte-identical to
// representative-space/ui/src/shared/feedActivity.ts (sha-verified at copy
// time; re-diff when either side changes). These tests pin the behavior the
// Dashboard depends on: hub events and entity events both classify through
// the single classifyActivity entry point, default-closed.

import { describe, it, expect } from "vitest";
import { classifyActivity } from "../../src/services/feedActivity.ts";

const hubEvent = (event_type, data = {}) => ({
  event_type,
  process_id: "proc_1",
  action_url: "http://localhost:5173/process/proc_1",
  data,
});

const entityEvent = (event_type, data = {}) => ({
  event_type,
  process_id: "prc_1",
  action_url: "http://localhost:5174/space/jamie-rivera",
  data: { space_slug: "jamie-rivera", ...data },
});

describe("vendored classifier — hub events", () => {
  it("classifies announcements, votes, meetings", () => {
    expect(
      classifyActivity(
        hubEvent("civic.process.result_published", {
          announcement: { author_role: "admin" },
        }),
      ),
    ).toMatchObject({ surface: "announcement", pill: "Admin" });

    expect(
      classifyActivity(
        hubEvent("civic.process.started", { process: { type: "civic.vote" } }),
      ),
    ).toMatchObject({ kind: "vote-open" });

    expect(
      classifyActivity(
        hubEvent("civic.process.result_published", {
          process: { type: "civic.meeting_summary" },
        }),
      ),
    ).toMatchObject({ surface: "meeting_summary", kind: "meeting" });
  });

  it("is default-closed for non-feed-worthy hub events", () => {
    expect(classifyActivity(hubEvent("civic.process.vote_submitted"))).toBeNull();
    expect(classifyActivity(hubEvent("civic.review.requested"))).toBeNull();
    expect(classifyActivity(hubEvent("civic.process.updated"))).toBeNull();
  });
});

describe("vendored classifier — entity (Rep Space) events", () => {
  it("classifies the entity allowlist", () => {
    expect(classifyActivity(entityEvent("civic.position_posted"))).toMatchObject(
      { kind: "position", pill: "New position" },
    );
    expect(
      classifyActivity(entityEvent("civic.outcome_delivered")),
    ).toMatchObject({ kind: "outcome-received", pill: "Outcome delivered" });
    expect(classifyActivity(entityEvent("civic.issue_raised"))).toMatchObject({
      kind: "issue-raised",
    });
    expect(
      classifyActivity(
        entityEvent("civic.process.result_published", {
          process: { type: "civic.vote" },
        }),
      ),
    ).toMatchObject({ kind: "vote-results" });
  });

  it("entity outcome_delivered does NOT collide with the hub's conversation-results", () => {
    const entity = classifyActivity(entityEvent("civic.outcome_delivered"));
    expect(entity.href).not.toContain("/deliberation/");

    const hub = classifyActivity(
      hubEvent("civic.outcome_delivered", {
        originating_process_id: "proc_conv",
      }),
    );
    expect(hub).toMatchObject({ kind: "conversation-results" });
  });

  it("is default-closed for entity noise (ballots, signals, space lifecycle)", () => {
    for (const t of [
      "civic.process.vote_submitted",
      "civic.issue_signaled",
      "civic.space.created",
      "civic.space.verified",
    ]) {
      expect(classifyActivity(entityEvent(t))).toBeNull();
    }
  });
});
