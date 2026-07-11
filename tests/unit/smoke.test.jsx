// Tooling smoke test — proves Vitest + Testing Library + jsdom render a
// component and that the mock data module loads in the test environment.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { feedItems, civicHubs } from "../../src/data/mockData";

function Probe() {
  return <p>dashboard test harness ok</p>;
}

describe("test harness", () => {
  it("renders a component under jsdom", () => {
    render(<Probe />);
    expect(screen.getByText("dashboard test harness ok")).toBeInTheDocument();
  });

  it("loads the demo data set (the blend must never erase this)", () => {
    expect(feedItems.length).toBeGreaterThan(0);
    expect(civicHubs.length).toBeGreaterThan(0);
  });
});
