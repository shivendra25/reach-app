import { describe, it, expect } from "vitest";
import { evaluateNicheFit, QUALIFYING_QUESTIONS } from "@/lib/projects/niche-gate";
import type { Project } from "@/types/db";

function fakeProject(overrides: Partial<Pick<Project, "name" | "problem" | "who_suffers" | "what_they_pay">> = {}) {
  return {
    name: "Test App",
    problem: "Indie devs lose track of bugs in Notion",
    who_suffers: "Solo indie devs using Noton for issue tracking",
    what_they_pay: "$10/mo for Linear",
    ...overrides,
  };
}

describe("niche-gate — text-only heuristic", () => {
  it("marks a dev tool with specific niche as fit", () => {
    const result = evaluateNicheFit(
      fakeProject({
        name: "BugTracker for indie devs",
        problem: "Devs can't track bugs in spreadsheets",
        who_suffers: "Solo developers shipping fast",
        what_they_pay: "$15/mo for Linear",
      })
    );
    expect(result.fit).toBe("fit");
  });

  it("marks a game/entertainment app as not_fit", () => {
    const result = evaluateNicheFit(
      fakeProject({
        name: "Party Fun Game",
        problem: "A fun social game for everyone at parties",
        who_suffers: "Anyone who wants to have casual fun",
        what_they_pay: "Free, ad-supported",
      })
    );
    expect(result.fit).toBe("not_fit");
    expect(result.reason).toContain("broad consumer");
  });

  it("returns pending for ambiguous descriptions", () => {
    const result = evaluateNicheFit(
      fakeProject({
        name: "Something",
        problem: "A thing that helps",
        who_suffers: "Some people",
        what_they_pay: "Maybe something",
      })
    );
    expect(result.fit).toBe("pending");
  });
});

describe("niche-gate — with qualifying answers", () => {
  it("gives green for devs + specific community + willingness to pay", () => {
    const result = evaluateNicheFit(fakeProject(), {
      audience_type: "devs",
      community_findable: "yes_specific",
      willingness_to_pay: "yes_b2b",
    });
    expect(result.fit).toBe("fit");
    expect(result.reason).toContain("findable");
  });

  it("rejects entertainment apps outright", () => {
    const result = evaluateNicheFit(fakeProject(), {
      audience_type: "entertainment",
      community_findable: "yes_specific",
      willingness_to_pay: "yes_b2c_small",
    });
    expect(result.fit).toBe("not_fit");
    expect(result.reason).toContain("Entertainment");
  });

  it("rejects when audience says they can't be found online", () => {
    const result = evaluateNicheFit(fakeProject(), {
      audience_type: "devs",
      community_findable: "no",
      willingness_to_pay: "yes_b2b",
    });
    expect(result.fit).toBe("not_fit");
    expect(result.reason).toContain("gather in online communities");
  });

  it("gives fit (with caution) for devs in general communities", () => {
    const result = evaluateNicheFit(fakeProject(), {
      audience_type: "devs",
      community_findable: "yes_general",
      willingness_to_pay: "yes_b2c_small",
    });
    expect(result.fit).toBe("fit");
  });

  it("allows general B2C if specifically findable and willing to pay", () => {
    const result = evaluateNicheFit(fakeProject(), {
      audience_type: "general_b2c",
      community_findable: "yes_specific",
      willingness_to_pay: "yes_b2c_small",
    });
    expect(result.fit).toBe("fit");
  });

  it("rejects general B2C if not findable or unwilling to pay", () => {
    const result = evaluateNicheFit(fakeProject(), {
      audience_type: "general_b2c",
      community_findable: "yes_general",
      willingness_to_pay: "no_free",
    });
    expect(result.fit).toBe("not_fit");
  });
});

describe("QUALIFYING_QUESTIONS", () => {
  it("has 3 questions with options", () => {
    expect(QUALIFYING_QUESTIONS).toHaveLength(3);
    for (const q of QUALIFYING_QUESTIONS) {
      expect(q.options.length).toBeGreaterThan(2);
    }
  });
});