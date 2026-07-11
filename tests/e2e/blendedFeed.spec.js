// E2E — the blended feed (A8). Both live /events endpoints are mocked with
// page.route fixtures, so these tests need no Hub or Rep Space running.

import { test, expect } from "@playwright/test";

const NOW = () => new Date().toISOString();

const repEvents = {
  count: 2,
  events: [
    {
      id: "evt_e2e_vote",
      version: "1.0",
      event_type: "civic.process.started",
      timestamp: NOW(),
      process_id: "prc_e2e_1",
      actor: "did:web:riveraforfloyd.com",
      jurisdiction: "us-va-floyd",
      action_url: "http://localhost:5174/space/jamie-rivera/votes",
      source: { hub_id: "representative-space-local", hub_url: "http://localhost:3001", space_id: "jamie-rivera" },
      data: { space_slug: "jamie-rivera", process: { type: "civic.vote" }, title: "E2E Dark Sky vote" },
      meta: { visibility: "public" },
    },
    {
      id: "evt_e2e_pos",
      version: "1.0",
      event_type: "civic.position_posted",
      timestamp: NOW(),
      process_id: "",
      actor: "did:web:riveraforfloyd.com",
      jurisdiction: "us-va-floyd",
      action_url: "http://localhost:5174/space/jamie-rivera",
      source: { hub_id: "representative-space-local", hub_url: "http://localhost:3001", space_id: "jamie-rivera" },
      data: { space_slug: "jamie-rivera", topic: "E2E Broadband" },
      meta: { visibility: "public" },
    },
  ],
};

const hubEvents = {
  count: 1,
  events: [
    {
      id: "evt_e2e_hub",
      version: "1.0",
      event_type: "civic.process.started",
      timestamp: NOW(),
      process_id: "proc_e2e_h1",
      actor: "resident1",
      jurisdiction: "us-va-floyd",
      action_url: "http://localhost:5175/process/proc_e2e_h1",
      source: { hub_id: "civic-hub-floyd", hub_url: "http://localhost:3000" },
      data: { process: { type: "civic.vote" }, title: "E2E Hub greenway vote" },
      meta: { visibility: "public" },
    },
  ],
};

async function mockSources(page, { hub = hubEvents, rep = repEvents } = {}) {
  await page.route("http://localhost:3000/events**", (route) =>
    hub instanceof Error
      ? route.abort("connectionrefused")
      : route.fulfill({ json: hub }),
  );
  await page.route("http://localhost:3001/events**", (route) =>
    rep instanceof Error
      ? route.abort("connectionrefused")
      : route.fulfill({ json: rep }),
  );
}

async function openDashboard(page) {
  await page.goto("/");
  // Dismiss the welcome overlay (shows on every load).
  await page.locator("div.bg-black\\/20").click({ position: { x: 10, y: 10 } });
  await expect(page.getByText("Welcome to Civic.Social")).toBeHidden();
}

test("blends demo and live items, live marker only on live items", async ({ page }) => {
  await mockSources(page);
  await openDashboard(page);

  // Live items at the top (fresh timestamps), demo items below.
  await expect(page.getByText("Vote open: E2E Dark Sky vote")).toBeVisible();
  await expect(page.getByText("New position: E2E Broadband")).toBeVisible();
  await expect(page.getByText("E2E Hub greenway vote")).toBeVisible();
  await expect(
    page.getByText("New proposal: Speed bump installation on Oak Street"),
  ).toBeVisible();

  // Exactly the three live cards carry the Live chip.
  await expect(page.getByText("Live", { exact: true })).toHaveCount(3);

  // Sidebar shows the live sources group + demo hubs.
  await expect(page.getByText("Live Sources")).toBeVisible();
  await expect(page.locator("aside").getByRole("button", { name: /rep\. rivera/i })).toBeVisible();
});

test("live CTA links to the event's action_url in a new tab", async ({ page }) => {
  await mockSources(page);
  await openDashboard(page);

  const cta = page.getByRole("link", { name: /open in rep\. rivera/i }).first();
  await expect(cta).toHaveAttribute(
    "href",
    /localhost:5174\/space\/jamie-rivera/,
  );
  await expect(cta).toHaveAttribute("target", "_blank");
});

test("selecting a live source narrows the feed to it", async ({ page }) => {
  await mockSources(page);
  await openDashboard(page);

  await page.locator("aside").getByRole("button", { name: /rep\. rivera/i }).click();
  await expect(page.getByText("Vote open: E2E Dark Sky vote")).toBeVisible();
  await expect(
    page.getByText("New proposal: Speed bump installation on Oak Street"),
  ).toBeHidden();
  await expect(page.getByText("E2E Hub greenway vote")).toBeHidden();
});

test("demo feed survives when a live source is down", async ({ page }) => {
  await mockSources(page, { hub: new Error("down") });
  await openDashboard(page);

  // Rep Space items still live-blended; hub absent; demo intact.
  await expect(page.getByText("Vote open: E2E Dark Sky vote")).toBeVisible();
  await expect(page.getByText("E2E Hub greenway vote")).toBeHidden();
  await expect(
    page.getByText("New proposal: Speed bump installation on Oak Street"),
  ).toBeVisible();
});

test("demo feed survives when every live source is down", async ({ page }) => {
  await mockSources(page, { hub: new Error("down"), rep: new Error("down") });
  await openDashboard(page);

  await expect(
    page.getByText("New proposal: Speed bump installation on Oak Street"),
  ).toBeVisible();
  await expect(page.getByText("Live", { exact: true })).toHaveCount(0);
});

test("read state on live items persists across reload", async ({ page }) => {
  await mockSources(page);
  await openDashboard(page);

  const unreadBefore = await page
    .locator("aside")
    .getByRole("button", { name: /rep\. rivera/i })
    .textContent();
  expect(unreadBefore).toContain("2");

  // Expand the live vote card → marks it read.
  await page.getByText("Vote open: E2E Dark Sky vote").click();
  await expect(
    page.locator("aside").getByRole("button", { name: /rep\. rivera/i }),
  ).toContainText("1");

  await page.reload();
  await page.locator("div.bg-black\\/20").click({ position: { x: 10, y: 10 } });
  await expect(
    page.locator("aside").getByRole("button", { name: /rep\. rivera/i }),
  ).toContainText("1");
});
