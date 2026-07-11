// Feed context (A4) — one useFeed instance for the whole app, so the
// Sidebar, Newsfeed, and mobile HubsList all read the same blended feed.

import React, { createContext, useContext } from "react";
import { useFeed } from "../hooks/useFeed";

const FeedContext = createContext(null);

export function FeedProvider({ children }) {
  const feed = useFeed();
  return <FeedContext.Provider value={feed}>{children}</FeedContext.Provider>;
}

export function useFeedContext() {
  const ctx = useContext(FeedContext);
  if (!ctx) {
    throw new Error("useFeedContext must be used inside <FeedProvider>");
  }
  return ctx;
}
