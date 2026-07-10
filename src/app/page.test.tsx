import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Landing page", () => {
  it("renders the hero headline", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Find the audience");
  });

  it("has a CTA linking to /new", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /analyze my app/i });
    expect(link.getAttribute("href")).toBe("/new");
  });

  it("has a how-it-works link", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /how it works/i });
    expect(link.getAttribute("href")).toBe("/how-it-works");
  });
});