import { describe, expect, it } from "vitest";

import { guidanceRulesSeed } from "@/db/seed-data/guidance-rules";
import { completeness, evaluateChecklist, matchesConditions } from "./evaluate";
import type { ChecklistInput, GuidanceRule, RuleConditions } from "./types";

/** Turn the seed rows into the shape the engine consumes. */
function seedRulesFor(region: "IN" | "US" | "INTL"): GuidanceRule[] {
  return guidanceRulesSeed
    .filter((rule) => rule.region === region)
    .map((rule, index) => ({
      id: `${region}-${index}`,
      conditions: rule.conditions,
      docType: rule.docType,
      priority: rule.priority,
      rationale: rule.rationale,
      region: rule.region,
    }));
}

function rule(
  overrides: Partial<GuidanceRule> & { conditions?: RuleConditions },
): GuidanceRule {
  return {
    id: "r1",
    conditions: {},
    docType: "proposal",
    priority: "recommended",
    rationale: "because",
    region: "IN",
    ...overrides,
  };
}

const baseInput: ChecklistInput = {
  projectType: "design",
  valueBand: "50k_2l",
  clientCountry: "IN",
  clientRelationship: "new",
};

describe("matchesConditions", () => {
  it("matches everything when there are no conditions", () => {
    expect(matchesConditions({}, baseInput)).toBe(true);
  });

  describe("project_type", () => {
    it("matches when the type is listed", () => {
      expect(
        matchesConditions({ project_type: ["design", "development"] }, baseInput),
      ).toBe(true);
    });

    it("rejects when the type is absent from the list", () => {
      expect(
        matchesConditions({ project_type: ["writing"] }, baseInput),
      ).toBe(false);
    });

    it("treats a wildcard as no constraint", () => {
      expect(matchesConditions({ project_type: "*" }, baseInput)).toBe(true);
    });
  });

  describe("value_band_min", () => {
    it("matches the floor exactly", () => {
      expect(matchesConditions({ value_band_min: "50k_2l" }, baseInput)).toBe(
        true,
      );
    });

    it("matches every band above the floor", () => {
      expect(
        matchesConditions(
          { value_band_min: "50k_2l" },
          { ...baseInput, valueBand: "above_10l" },
        ),
      ).toBe(true);
    });

    it("rejects a band below the floor", () => {
      expect(
        matchesConditions(
          { value_band_min: "50k_2l" },
          { ...baseInput, valueBand: "under_50k" },
        ),
      ).toBe(false);
    });
  });

  describe("client_relationship", () => {
    it("distinguishes new from repeat", () => {
      expect(
        matchesConditions({ client_relationship: "new" }, baseInput),
      ).toBe(true);
      expect(
        matchesConditions({ client_relationship: "repeat" }, baseInput),
      ).toBe(false);
    });
  });

  describe("client_country", () => {
    it("matches case-insensitively", () => {
      expect(matchesConditions({ client_country: "in" }, baseInput)).toBe(true);
    });

    it("rejects a different country", () => {
      expect(matchesConditions({ client_country: "US" }, baseInput)).toBe(false);
    });

    it("does not match a real country against an unknown one", () => {
      expect(
        matchesConditions(
          { client_country: "US" },
          { ...baseInput, clientCountry: null },
        ),
      ).toBe(false);
    });
  });

  it("requires every condition to hold, not just one", () => {
    expect(
      matchesConditions(
        { project_type: ["design"], client_relationship: "repeat" },
        baseInput,
      ),
    ).toBe(false);
  });
});

describe("evaluateChecklist", () => {
  it("returns nothing when no rule matches", () => {
    const rules = [rule({ conditions: { project_type: ["writing"] } })];
    expect(evaluateChecklist(rules, baseInput)).toEqual([]);
  });

  it("keeps the strongest priority when rules overlap", () => {
    const rules = [
      rule({ id: "a", docType: "nda", priority: "situational" }),
      rule({ id: "b", docType: "nda", priority: "essential" }),
      rule({ id: "c", docType: "nda", priority: "recommended" }),
    ];

    const result = evaluateChecklist(rules, baseInput);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe("essential");
  });

  it("carries the rationale belonging to the winning priority", () => {
    const rules = [
      rule({
        id: "weak",
        docType: "nda",
        priority: "situational",
        rationale: "weak reason",
      }),
      rule({
        id: "strong",
        docType: "nda",
        priority: "essential",
        rationale: "strong reason",
      }),
    ];

    expect(evaluateChecklist(rules, baseInput)[0].rationale).toBe(
      "strong reason",
    );
  });

  it("is not sensitive to the order rules arrive in", () => {
    const strong = rule({ id: "s", docType: "nda", priority: "essential" });
    const weak = rule({ id: "w", docType: "nda", priority: "situational" });

    expect(evaluateChecklist([strong, weak], baseInput)).toEqual(
      evaluateChecklist([weak, strong], baseInput),
    );
  });

  it("sorts essential before recommended before situational", () => {
    const rules = [
      rule({ id: "a", docType: "payment_reminder", priority: "situational" }),
      rule({ id: "b", docType: "nda", priority: "recommended" }),
      rule({ id: "c", docType: "invoice", priority: "essential" }),
    ];

    expect(evaluateChecklist(rules, baseInput).map((i) => i.priority)).toEqual([
      "essential",
      "recommended",
      "situational",
    ]);
  });

  it("breaks priority ties using the caller's document order", () => {
    const rules = [
      rule({ id: "a", docType: "invoice", priority: "essential" }),
      rule({ id: "b", docType: "proposal", priority: "essential" }),
    ];

    expect(
      evaluateChecklist(rules, baseInput, ["proposal", "invoice"]).map(
        (i) => i.docType,
      ),
    ).toEqual(["proposal", "invoice"]);
  });
});

/**
 * PRD §6, stated verbatim as the acceptance criterion for the feature the
 * product is built around. If this fails, the seeded rules are wrong even if
 * every unit test above passes.
 */
describe("PRD §6 acceptance criteria", () => {
  const riyasProject: ChecklistInput = {
    projectType: "design",
    valueBand: "50k_2l",
    clientCountry: "IN",
    clientRelationship: "new",
  };

  const result = evaluateChecklist(seedRulesFor("IN"), riyasProject, [
    "proposal",
    "service_agreement",
    "sow",
    "invoice",
    "nda",
    "payment_reminder",
  ]);

  it("produces exactly the six documents the PRD specifies", () => {
    expect(result.map((item) => item.docType).sort()).toEqual(
      [
        "invoice",
        "nda",
        "payment_reminder",
        "proposal",
        "service_agreement",
        "sow",
      ].sort(),
    );
  });

  it("marks proposal, service agreement, SOW and invoice as essential", () => {
    const essentials = result
      .filter((item) => item.priority === "essential")
      .map((item) => item.docType)
      .sort();

    expect(essentials).toEqual(
      ["invoice", "proposal", "service_agreement", "sow"].sort(),
    );
  });

  it("marks the NDA recommended", () => {
    expect(result.find((i) => i.docType === "nda")?.priority).toBe(
      "recommended",
    );
  });

  it("marks the payment reminder situational", () => {
    expect(result.find((i) => i.docType === "payment_reminder")?.priority).toBe(
      "situational",
    );
  });

  it("gives every item a one-line rationale", () => {
    for (const item of result) {
      expect(item.rationale.length).toBeGreaterThan(20);
    }
  });
});

describe("seeded rules across regions", () => {
  for (const region of ["IN", "US", "INTL"] as const) {
    it(`always requires an invoice in ${region}, whatever the project`, () => {
      const result = evaluateChecklist(seedRulesFor(region), {
        projectType: "other",
        valueBand: "under_50k",
        clientCountry: null,
        clientRelationship: "repeat",
      });

      expect(result.find((i) => i.docType === "invoice")?.priority).toBe(
        "essential",
      );
    });

    it(`escalates the NDA to essential for a large new engagement in ${region}`, () => {
      const result = evaluateChecklist(seedRulesFor(region), {
        projectType: "development",
        valueBand: "above_10l",
        clientCountry: "US",
        clientRelationship: "new",
      });

      expect(result.find((i) => i.docType === "nda")?.priority).toBe(
        "essential",
      );
    });
  }

  it("does not demand a service agreement for a small repeat job", () => {
    const result = evaluateChecklist(seedRulesFor("IN"), {
      projectType: "design",
      valueBand: "under_50k",
      clientCountry: "IN",
      clientRelationship: "repeat",
    });

    expect(result.find((i) => i.docType === "service_agreement")).toBeUndefined();
  });
});

describe("completeness", () => {
  const checklist = evaluateChecklist(seedRulesFor("IN"), {
    projectType: "design",
    valueBand: "50k_2l",
    clientCountry: "IN",
    clientRelationship: "new",
  });

  it("counts only essentials, so the meter can actually be finished", () => {
    expect(completeness(checklist, []).total).toBe(4);
  });

  it("is zero with nothing generated", () => {
    expect(completeness(checklist, []).percent).toBe(0);
  });

  it("reaches 100% once every essential exists", () => {
    const result = completeness(checklist, [
      "proposal",
      "service_agreement",
      "sow",
      "invoice",
    ]);
    expect(result.percent).toBe(100);
    expect(result.done).toBe(4);
  });

  it("ignores non-essential documents", () => {
    // Generating the NDA is good, but it should not move an essentials meter.
    expect(completeness(checklist, ["nda"]).percent).toBe(0);
  });

  it("rounds to a whole percent", () => {
    expect(completeness(checklist, ["proposal"]).percent).toBe(25);
  });

  it("treats an empty checklist as complete rather than zero", () => {
    expect(completeness([], []).percent).toBe(100);
  });
});
