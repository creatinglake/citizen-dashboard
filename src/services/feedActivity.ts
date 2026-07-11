// feedActivity.ts — THE single source of truth for "what is feed-worthy".
//
// Phase 3 of the 2026-06-25 consistency audit (decisions/
// audit-2026-06-25-process-and-feed-consistency.md §2). Before this module,
// the feed-worthiness decision was forked across FOUR drifting copies:
//   1. ui/src/components/Feed.tsx        (kindFromEvent — the inclusion gate)
//   2. ui/src/components/FeedPost.tsx    (eventToPost — the renderer)
//   3. ui/src/components/FeedFilter.tsx  (buildFilterPredicate — the ?type= filter)
//   4. src/modules/civic.digest/filter.ts (isDigestRenderable + classifyItemKind)
// They could not be diffed mechanically (a flat Set vs a data-shape switch)
// and had already drifted — generic "Activity" cards, a wordcloud mislabeled
// as a vote in the digest, proposals/projects/conversations visible in-app but
// absent from email. This module collapses all four into ONE classifier.
//
// SHARED ACROSS BOTH RUNTIMES — consumed by:
//   - the Vite frontend (Feed / FeedPost / FeedFilter), and
//   - the Node backend (civic.digest filter + service).
// It MUST therefore stay framework-agnostic and DEPENDENCY-FREE (no imports).
// Do NOT fork this logic back into the consumers — that drift is the bug this
// module exists to kill. Frontend imports it by relative path; the backend
// gets it via `src/**/*`.
//
// DESIGN — an explicit ALLOWLIST (default-CLOSED). Only event types named here
// produce a feed/digest card; everything else returns null. This is the seam
// for future admin-configurable feed-worthiness (good hardcoded defaults now;
// a config layer can later override the allowlist) and the reason adding
// `data.process.type` to non-feed-worthy emitters (comment_added,
// vote_submitted, moderation, …) does NOT surface them — the field is purely
// a discriminator; visibility is decided here.
//
// DISCRIMINATOR — the `civic.process.<verb>` family (started / result_published
// / created) does not carry the process type in `event_type`; multiple types
// emit the same event_type. We read `data.process.type` (set by every emitter
// via emitEvent) as the single discriminator, falling back to the legacy
// data-shape checks for historical events emitted before the field existed.

/**
 * Coarse content category — aligned 1:1 with the FeedFilter `?type=` keys so
 * the inclusion gate, the filter predicate, and the rendered pills can never
 * disagree (the "filter shows fewer than All" bug). Votes, vote-results,
 * wordclouds, proposals, projects, and conversations all live under
 * "activity"; announcements and meeting summaries get their own filter pill.
 */
export type ActivitySurface = "announcement" | "meeting_summary" | "activity";

/**
 * Fine-grained render variant. Each consumer maps this to its own presentation
 * tokens (the frontend → a FeedPillKind CSS class; the digest → a grouping +
 * pill color) via a total, exhaustively-checked switch — stable mappings, not
 * the brittle data-shape sniffing this module replaces.
 */
export type ActivityKind =
  | "vote-open"
  | "vote-results"
  | "announcement" // admin / synced (Floyd County Gov)
  | "announcement-author" // board member / committee / other authored
  | "meeting"
  | "wordcloud"
  | "proposal"
  | "proposal-closed"
  | "project-created"
  | "project-updated"
  | "conversation"
  | "conversation-results" // deliberation outcome delivered (close)
  // --- Entity-space extension (Representative Space events) ---
  | "position" // entity published a position statement
  | "outcome-received" // a civic hub delivered a process outcome to the entity
  | "entity-response" // entity responded to a delivered outcome
  | "issue-raised" // citizen raised an issue/question/poll on the board
  | "issue-responded"; // entity answered an issue board entry

export interface Activity {
  surface: ActivitySurface;
  kind: ActivityKind;
  /**
   * Canonical, hub-config-free pill label. Single source of truth for both
   * the feed card pill and the email digest pill — so they read identically
   * for the same event. (Announcement labels are role-aware and derived
   * purely from the event payload, so they belong here too.)
   */
  pill: string;
  /**
   * Where the card links. Either a dedicated relative SPA path (wordcloud /
   * proposal / conversation, whose public page differs from /process/:id) or
   * the event's own `action_url` verbatim — which may be an absolute external
   * URL (e.g. a synced Floyd-news announcement) that MUST be preserved. The
   * frontend routes it through classifyHref; the digest absolutizes relative
   * paths against the hub UI base.
   */
  href: string;
}

/**
 * Minimal structural view of a civic event. Both the frontend `CivicEvent`
 * and the backend `DigestEvent` are assignable to this, so neither consumer
 * has to adapt its event shape before calling `classifyActivity`.
 */
export interface ClassifierEvent {
  event_type: string;
  process_id: string;
  action_url: string;
  data: Record<string, unknown>;
}

/**
 * Resolve the underlying process type for an event. Prefers the canonical
 * `data.process.type` (stamped by emitEvent for the whole civic.process.*
 * family); falls back to the Polis handler's flat `data.process_type`
 * convention so historical deliberation events still discriminate correctly.
 * Returns undefined for events that carry no type (legacy votes) — callers
 * then fall back to data-shape checks.
 */
function processTypeOf(event: ClassifierEvent): string | undefined {
  const data = event.data ?? {};
  const nested = (data.process as { type?: unknown } | undefined)?.type;
  if (typeof nested === "string") return nested;
  const flat = (data as { process_type?: unknown }).process_type;
  if (typeof flat === "string") return flat;
  return undefined;
}

/**
 * Classify a civic event into its feed/digest presentation, or null when the
 * event is not feed-worthy. The ONE predicate the gate, renderer, filter, and
 * digest all share.
 */
export function classifyActivity(event: ClassifierEvent): Activity | null {
  const eventType = event.event_type;
  const id = event.process_id;
  const processType = processTypeOf(event);

  // --- Entity-space extension ---------------------------------------------
  // Representative Space events stamp `data.space_slug` on every emission;
  // hub events never do. Entity events get their own default-closed
  // allowlist (below) INSTEAD of the hub branches, because some event types
  // collide with different semantics — on a hub, civic.outcome_delivered
  // means "a deliberation closed" (→ conversation-results, /deliberation/:id
  // href); on an entity space it means "a hub delivered an outcome to this
  // representative", and hub hrefs like /deliberation/:id don't exist in the
  // entity-space SPA at all. Entity hrefs are always the event's own
  // action_url, which the emitter points at the right space tab.
  if (typeof event.data?.space_slug === "string") {
    return classifyEntitySpaceActivity(event, processType);
  }
  // -------------------------------------------------------------------------

  // Review-lifecycle events are restricted admin/creator correspondence —
  // admins receive them on the events endpoint for the moderation log, but
  // they are never public activity. Excluded regardless of viewer.
  if (eventType.startsWith("civic.review.")) return null;

  switch (eventType) {
    case "civic.process.started":
      return classifyStarted(event, processType, id);

    case "civic.process.result_published":
      return classifyResultPublished(event, processType, id);

    case "civic.process.created":
      // Only conversations post a "created" card. Votes post when they open
      // (civic.process.started); proposals/projects post via their own
      // civic.<type>.* events — so created is null for everything else, which
      // is what prevents double-posting.
      if (processType === "civic.polis_deliberation") {
        return {
          surface: "activity",
          kind: "conversation",
          pill: "New conversation",
          href: `/deliberation/${id}`,
        };
      }
      return null;

    case "civic.proposal.submitted":
      return {
        surface: "activity",
        kind: "proposal",
        pill: "New proposal",
        href: `/proposal/${id}`,
      };

    case "civic.proposal.closed":
      // Part C — Phase 2 gave proposals a real deadline-close; surface it.
      return {
        surface: "activity",
        kind: "proposal-closed",
        pill: "Proposal closed",
        href: `/proposal/${id}`,
      };

    case "civic.project.created":
      return {
        surface: "activity",
        kind: "project-created",
        pill: "New project",
        href: event.action_url,
      };

    case "civic.project.updated":
      return {
        surface: "activity",
        kind: "project-updated",
        pill: "Project update",
        href: event.action_url,
      };

    case "civic.outcome_delivered": {
      // Part C — deliberation close. Previously an orphan that rendered as a
      // bland "Activity" card in the feed and was absent from the digest.
      const origin =
        typeof event.data?.originating_process_id === "string"
          ? event.data.originating_process_id
          : id;
      return {
        surface: "activity",
        kind: "conversation-results",
        pill: "Conversation results",
        href: `/deliberation/${origin}`,
      };
    }

    default:
      // Default-CLOSED. Everything not named above — civic.process.updated /
      // ended / vote_submitted / comment_added / aggregation_completed /
      // outcome_recorded / proposed / threshold_met, civic.proposal.supported
      // / endorsed / converted, civic.project.archived / comment_added /
      // sentiment_changed, etc. — is intentionally not feed-worthy.
      return null;
  }
}

function classifyStarted(
  event: ClassifierEvent,
  processType: string | undefined,
  id: string,
): Activity | null {
  // Conversations post their card on `created`, not `started` — exclude here
  // to avoid a double-post (and to fix the legacy mislabel where a
  // deliberation start fell through to the vote branch below).
  if (processType === "civic.polis_deliberation") return null;

  const data = event.data ?? {};
  if (
    processType === "civic.wordcloud" ||
    data.wordcloud_snapshot !== undefined ||
    data.wordcloud_result !== undefined
  ) {
    return {
      surface: "activity",
      kind: "wordcloud",
      pill: "Word cloud",
      href: `/wordcloud/${id}`,
    };
  }

  // Votes — explicit type, or legacy vote events that predate data.process.type
  // (undefined). civic.process.started is otherwise only emitted by votes.
  if (processType === "civic.vote" || processType === undefined) {
    return {
      surface: "activity",
      kind: "vote-open",
      pill: "Vote open",
      href: event.action_url,
    };
  }

  // A new process type emitting `started` we don't recognize — default-closed.
  return null;
}

function classifyResultPublished(
  event: ClassifierEvent,
  processType: string | undefined,
  id: string,
): Activity | null {
  const data = event.data ?? {};

  if (
    processType === "civic.wordcloud" ||
    data.wordcloud_snapshot !== undefined ||
    data.wordcloud_result !== undefined
  ) {
    return {
      surface: "activity",
      kind: "wordcloud",
      pill: "Word cloud",
      href: `/wordcloud/${id}`,
    };
  }

  if (processType === "civic.announcement" || data.announcement !== undefined) {
    return classifyAnnouncement(data, event.action_url);
  }

  if (
    processType === "civic.meeting_summary" ||
    data.meeting_summary !== undefined ||
    typeof data.summary_id === "string"
  ) {
    return {
      surface: "meeting_summary",
      kind: "meeting",
      pill: "Meeting summary",
      href: event.action_url,
    };
  }

  if (
    processType === "civic.vote_results" ||
    typeof data.results_id === "string" ||
    typeof data.brief_id === "string"
  ) {
    return {
      surface: "activity",
      kind: "vote-results",
      pill: "Vote results",
      href: event.action_url,
    };
  }

  // Raw vote-process result_published — INTENTIONALLY excluded. Closing a vote
  // emits two result_published events (one from civic.vote_results, caught
  // above, and one from the underlying vote here); residents must see only
  // one post per close. The vote event stays on the log for audit/federation.
  if (processType === "civic.vote" || data.result !== undefined) return null;

  // Unknown shape — default-closed (was a bland "Activity" card before Phase 3).
  return null;
}

function classifyAnnouncement(
  data: Record<string, unknown>,
  actionUrl: string,
): Activity {
  const ann = data.announcement as
    | { author_role?: unknown; source?: { origin?: unknown } | null }
    | undefined;
  const rawRole =
    typeof ann?.author_role === "string" ? ann.author_role : null;
  // Legacy "board" → "Board member"; lowercase "admin"/unset → "Admin"; any
  // other free-form role ("Planning Committee", …) is shown verbatim.
  const normalized =
    rawRole === "board"
      ? "Board member"
      : rawRole === "admin" || !rawRole
        ? "Admin"
        : rawRole;
  const isAdmin = normalized === "Admin";
  // Synced-from-external announcements (Floyd County Gov cron) reuse the admin
  // palette so they group with admin-authored ones under the same filter pill.
  const isSynced = ann?.source?.origin === "floyd-news";
  return {
    surface: "announcement",
    // Non-admin authors (board members, committees) get a distinct pill +
    // border color so residents can tell elected-official posts from the hub
    // administrator's.
    kind: isAdmin || isSynced ? "announcement" : "announcement-author",
    pill: abbreviateGovernment(normalized),
    href: actionUrl,
  };
}

/**
 * Width-saver for announcement pill labels: "Floyd County Government" →
 * "Floyd County Gov". Single source of truth for both the feed and the email
 * digest (previously duplicated in FeedPost.tsx and digest/service.ts).
 */
function abbreviateGovernment(label: string): string {
  return label.replace(/\bGovernment\b/gi, "Gov");
}

// ===========================================================================
// Entity-space extension (Representative Space) — B4 of the realization plan.
//
// The same explicit-allowlist, default-CLOSED design as the hub classifier
// above, applied to the accountability events an entity space emits. Only
// the types named here produce a card; everything else an entity space emits
// (issue_signaled, vote_submitted, space.created/verified, moderation, …) is
// intentionally not feed-worthy.
//
// Kept in this file — not a fork — so the Citizen Dashboard can vendor ONE
// byte-identical copy and classify hub and entity events through the single
// classifyActivity entry point.
// ===========================================================================

function classifyEntitySpaceActivity(
  event: ClassifierEvent,
  processType: string | undefined,
): Activity | null {
  const href = event.action_url;

  switch (event.event_type) {
    case "civic.position_posted":
      return {
        surface: "activity",
        kind: "position",
        pill: "New position",
        href,
      };

    case "civic.outcome_delivered":
      return {
        surface: "activity",
        kind: "outcome-received",
        pill: "Outcome delivered",
        href,
      };

    case "civic.response_posted":
      return {
        surface: "activity",
        kind: "entity-response",
        pill: "Rep response",
        href,
      };

    case "civic.issue_raised":
      return {
        surface: "activity",
        kind: "issue-raised",
        pill: "Issue raised",
        href,
      };

    case "civic.issue_responded":
      return {
        surface: "activity",
        kind: "issue-responded",
        pill: "Issue answered",
        href,
      };

    case "civic.process.created":
      // Same one-card-per-process rule as the hub: conversations post on
      // created; votes post when they open (started).
      if (processType === "civic.polis_deliberation") {
        return {
          surface: "activity",
          kind: "conversation",
          pill: "New conversation",
          href,
        };
      }
      return null;

    case "civic.process.started":
      if (processType === "civic.vote") {
        return {
          surface: "activity",
          kind: "vote-open",
          pill: "Vote open",
          href,
        };
      }
      return null;

    case "civic.process.result_published":
      // Unlike the hub — which spawns a separate civic.vote_results process
      // and posts that instead — an entity space publishes results directly
      // from the vote, so its result_published IS the one results card.
      if (processType === "civic.vote") {
        return {
          surface: "activity",
          kind: "vote-results",
          pill: "Vote results",
          href,
        };
      }
      return null;

    default:
      // Default-CLOSED, exactly like the hub allowlist above.
      return null;
  }
}
