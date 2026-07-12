// A5 — the live marker + click-through, the visible proof of real connection.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FeedItem } from "../../src/components/FeedItem";
import { feedItems as mockFeedItems } from "../../src/data/mockData";

vi.mock("../../src/services/feed", () => ({ getEvents: vi.fn(async () => []) }));
import { FeedProvider } from "../../src/context/FeedContext.jsx";
import { Sidebar } from "../../src/components/Sidebar";

const liveItem = {
  id: "evt_live1",
  hubId: "rep-jamie",
  type: "vote",
  title: "Vote open: Dark Sky ordinance",
  preview: "Live from Rep. Jamie Rivera.",
  fullContent: "Live from Rep. Jamie Rivera.",
  author: "riveraforfloyd.com",
  timestamp: "5m ago",
  tags: ["Vote open"],
  isRead: false,
  live: true,
  actionUrl: "http://localhost:5174/space/jamie-rivera/votes",
  sortAt: Date.now(),
};

describe("FeedItem — live items", () => {
  it("shows the Live chip and a CTA that opens the action_url in-dashboard", () => {
    const onOpenLive = vi.fn();
    render(
      <FeedItem item={liveItem} onViewInHub={() => {}} onOpenLive={onOpenLive} />,
    );

    expect(screen.getByText("Live")).toBeInTheDocument();

    const cta = screen.getByRole("button", { name: /^open in rep\. rivera/i });
    expect(cta).toHaveAttribute(
      "data-action-url",
      "http://localhost:5174/space/jamie-rivera/votes",
    );
    cta.click();
    expect(onOpenLive).toHaveBeenCalledWith(
      "Rep. Jamie Rivera",
      "http://localhost:5174/space/jamie-rivera/votes",
    );
  });

  it("demo items keep their behavior: no chip, View-in-hub button", () => {
    const demo = mockFeedItems[0];
    const onView = vi.fn();
    render(<FeedItem item={demo} onViewInHub={onView} />);

    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^open in/i }),
    ).not.toBeInTheDocument();

    // The card article itself is role="button", so match the CTA by its
    // accessible name starting with "View in".
    screen.getByRole("button", { name: /^view in/i }).click();
    expect(onView).toHaveBeenCalled();
  });
});

describe("Sidebar — live sources", () => {
  it("lists the Live Sources group with live dots", async () => {
    render(
      <FeedProvider>
        <Sidebar selectedHub={null} onSelectHub={() => {}} onSelectAll={() => {}} />
      </FeedProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Live Sources")).toBeInTheDocument(),
    );
    expect(screen.getByText("Floyd Hub")).toBeInTheDocument();
    expect(screen.getByText("Rep. Rivera")).toBeInTheDocument();
    expect(screen.getByTestId("live-dot-floyd-hub")).toBeInTheDocument();
    expect(screen.getByTestId("live-dot-rep-jamie")).toBeInTheDocument();
    // Demo hubs still listed alongside.
    expect(screen.getByText("Floyd County")).toBeInTheDocument();
  });
});
