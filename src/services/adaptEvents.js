// CivicEvent → feed-item adapter (A3).
//
// Takes classified live events and produces objects in the exact shape the
// existing demo feed uses ({ id, hubId, type, title, preview, fullContent,
// author, timestamp, tags, isRead }) plus three live-only fields:
//   actionUrl — absolute click-through target (the proof of real connection)
//   live      — marks the item for the live chip + CTA behavior
//   sortAt    — numeric ms timestamp so the blend sorts cleanly while the
//               displayed relative strings stay human ("2h ago")

import { classifyActivity } from "./feedActivity.ts";

/** ActivityKind → existing feed-item `type` vocabulary (Icons.jsx map). */
const KIND_TO_TYPE = {
  "vote-open": "vote",
  "vote-results": "vote-result",
  announcement: "update",
  "announcement-author": "update",
  meeting: "meeting",
  wordcloud: "poll",
  proposal: "proposal",
  "proposal-closed": "proposal",
  "project-created": "update",
  "project-updated": "update",
  conversation: "poll",
  "conversation-results": "update",
  position: "update",
  "outcome-received": "vote-result",
  "entity-response": "comment",
  "issue-raised": "comment",
  "issue-responded": "comment",
};

export function relativeTime(iso, now = Date.now()) {
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Opaque actor id → display name. DID-compatible strings and the demo's
 * email-style ids both reduce to something readable. */
export function friendlyActor(actor) {
  if (typeof actor !== "string" || !actor) return "Unknown";
  if (actor.startsWith("did:web:")) return actor.slice("did:web:".length).split(":")[0];
  if (actor.startsWith("did:")) return actor.split(":").pop();
  if (actor.includes("@")) return actor.split("@")[0].replace(/[._]/g, " ");
  return actor;
}

function headline(event, activity) {
  const data = event.data ?? {};
  const title =
    (typeof data.title === "string" && data.title) ||
    (typeof data.topic === "string" && data.topic) ||
    null;

  switch (activity.kind) {
    case "position":
      return data.topic ? `New position: ${data.topic}` : "Published a position statement";
    case "outcome-received":
      return "A civic outcome was delivered to this representative";
    case "entity-response":
      return "The representative responded to a civic outcome";
    case "issue-raised":
      return title ? `Constituent issue: ${title}` : "New entry on the issue board";
    case "issue-responded":
      return "The representative answered an issue board entry";
    case "vote-open":
      return title ? `Vote open: ${title}` : "A new advisory vote is open";
    case "vote-results":
      return title ? `Results: ${title}` : "Advisory vote results published";
    case "conversation":
      return title ? `Join the conversation: ${title}` : "A new conversation is open";
    default:
      return title ?? activity.pill;
  }
}

function preview(event, activity, sourceName) {
  const data = event.data ?? {};
  const detail =
    (typeof data.statement === "string" && data.statement) ||
    (typeof data.outcome_summary === "string" && data.outcome_summary) ||
    (typeof data.body === "string" && data.body) ||
    (typeof data.framing === "string" && data.framing) ||
    null;
  if (detail) return detail;
  return `Live from ${sourceName}. Open it there to see details and participate.`;
}

/**
 * Adapt one source's events into feed items. Non-feed-worthy events
 * (classifier returns null) and malformed entries are dropped.
 *
 * @param {Array<object>} events CivicEvent[]
 * @param {{ id: string, name: string }} source entry from LIVE_SOURCES
 */
export function adaptEvents(events, source) {
  const items = [];
  if (!Array.isArray(events)) return items;

  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    if (typeof event.event_type !== "string" || typeof event.id !== "string") continue;

    let activity;
    try {
      activity = classifyActivity(event);
    } catch {
      continue; // a malformed event must never take the feed down
    }
    if (!activity) continue;

    const sortAt = Date.parse(event.timestamp);
    if (!Number.isFinite(sortAt)) continue;

    // Classifier hrefs are absolute for entity events; hub SPA paths
    // (/deliberation/:id …) are relative — absolutize against the event's
    // own absolute action_url so the click-through always leaves the
    // dashboard correctly.
    let actionUrl = activity.href;
    try {
      actionUrl = new URL(activity.href, event.action_url).toString();
    } catch {
      actionUrl = event.action_url;
    }

    items.push({
      id: event.id,
      hubId: source.id,
      type: KIND_TO_TYPE[activity.kind] ?? "update",
      title: headline(event, activity),
      preview: preview(event, activity, source.name),
      fullContent: preview(event, activity, source.name),
      author: friendlyActor(event.actor),
      timestamp: relativeTime(event.timestamp),
      tags: [activity.pill],
      isRead: false,
      live: true,
      actionUrl,
      sortAt,
    });
  }

  return items;
}
