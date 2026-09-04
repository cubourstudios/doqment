import { describe, expect, it } from "vitest";

import {
  docTypeEnum,
  projectTypeEnum,
  valueBandEnum,
} from "@/db/schema";
import { guidanceRulesSeed } from "@/db/seed-data/guidance-rules";
import { completeness, evaluateChecklist, matchesConditions } from "./evaluate";
import { DOC_TYPE_ORDER } from "./service";
import type {
  ChecklistInput,
  ChecklistItem,
  GuidanceRule,
  RuleConditions,
} from "./types";

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

/**
 * "*" is the stored form of "this dimension does not matter", and the seed
 * rules use it. A wildcard that failed to match would silently delete advice
 * rather than raise anything.
 */
describe("matchesConditions — wildcards", () => {
  it("matches both relationships on a relationship wildcard", () => {
    for (const clientRelationship of ["new", "repeat"] as const) {
      expect(
        matchesConditions({ client_relationship: "*" }, {
          ...baseInput,
          clientRelationship,
        }),
      ).toBe(true);
    }
  });

  it("matches any country on a country wildcard", () => {
    for (const clientCountry of ["IN", "US", "de"]) {
      expect(
        matchesConditions({ client_country: "*" }, { ...baseInput, clientCountry }),
      ).toBe(true);
    }
  });

  it("matches a project with no client country at all on a wildcard", () => {
    // A project can exist before its client does. A wildcard rule that stopped
    // matching there would drop the invoice off the checklist of exactly the
    // projects that are least far along.
    expect(
      matchesConditions(
        { client_country: "*" },
        { ...baseInput, clientCountry: null },
      ),
    ).toBe(true);
  });

  it("matches a project with no client country when no country is named", () => {
    expect(
      matchesConditions({}, { ...baseInput, clientCountry: null }),
    ).toBe(true);
  });
});

describe("checklist ordering", () => {
  /**
   * The tie-break is `docTypeOrder.indexOf(...)`, which is -1 for a document
   * type the caller did not list — so an unlisted type sorts above every
   * listed one. A seventh document type added to the enum but not to
   * DOC_TYPE_ORDER would therefore jump to the top of the checklist, above the
   * invoice. Keeping the two lists in step is what prevents that.
   */
  it("orders every document type the schema allows", () => {
    expect([...DOC_TYPE_ORDER].sort()).toEqual(
      [...docTypeEnum.enumValues].sort(),
    );
  });

  it("gives the same checklist whatever order the rules arrive in", () => {
    // Rows come back from Postgres in no guaranteed order, and the engine's
    // whole claim is that the same project always gets the same answer.
    const rules = seedRulesFor("IN");
    const expected = evaluateChecklist(rules, baseInput, DOC_TYPE_ORDER);

    for (const shuffled of [
      [...rules].reverse(),
      [...rules].sort((a, b) => a.docType.localeCompare(b.docType)),
      [...rules].sort((a, b) => a.rationale.localeCompare(b.rationale)),
    ]) {
      expect(evaluateChecklist(shuffled, baseInput, DOC_TYPE_ORDER)).toEqual(
        expected,
      );
    }
  });
});

/**
 * The three seeded regions share one rule set; only the invoice rationale is
 * written per region. A region-specific rule drifting in — or a rationale
 * copied between regions — is invisible until a user in that region sees the
 * wrong advice.
 */
describe("the seeded regions agree", () => {
  const project: ChecklistInput = {
    projectType: "design",
    valueBand: "2l_10l",
    clientCountry: "IN",
    clientRelationship: "new",
  };

  const byRegion = (["IN", "US", "INTL"] as const).map((region) =>
    evaluateChecklist(seedRulesFor(region), project, DOC_TYPE_ORDER),
  );

  it("recommends the same documents at the same priorities everywhere", () => {
    const shape = (items: ChecklistItem[]) =>
      items.map((item) => [item.docType, item.priority]);

    expect(shape(byRegion[1])).toEqual(shape(byRegion[0]));
    expect(shape(byRegion[2])).toEqual(shape(byRegion[0]));
  });

  it("explains the invoice differently in each region", () => {
    const rationales = byRegion.map(
      (items) => items.find((item) => item.docType === "invoice")!.rationale,
    );

    expect(new Set(rationales).size).toBe(3);
    // India's is the one that has to mention GST.
    expect(rationales[0]).toContain("GST");
  });

  it("uses the same wording for everything that is not the invoice", () => {
    for (const items of byRegion.slice(1)) {
      for (const item of items) {
        if (item.docType === "invoice") continue;
        const reference = byRegion[0].find((i) => i.docType === item.docType);
        expect(item.rationale).toBe(reference?.rationale);
      }
    }
  });
});

/**
 * The seed rows are data, edited by hand and by UPDATE. Nothing type-checks a
 * condition against reality, so a rule whose conditions can never all hold is
 * advice that quietly does not exist.
 */
describe("every seeded rule earns its row", () => {
  const everyProject: ChecklistInput[] = projectTypeEnum.enumValues.flatMap(
    (projectType) =>
      valueBandEnum.enumValues.flatMap((valueBand) =>
        (["new", "repeat"] as const).flatMap((clientRelationship) =>
          ["IN", "US", null].map((clientCountry) => ({
            projectType,
            valueBand,
            clientCountry,
            clientRelationship,
          })),
        ),
      ),
  );

  it("can be reached by some project", () => {
    for (const seeded of guidanceRulesSeed) {
      const reachable = everyProject.some((project) =>
        matchesConditions(seeded.conditions, project),
      );

      expect(
        reachable,
        `${seeded.region}/${seeded.docType}/${seeded.priority} never fires`,
      ).toBe(true);
    }
  });

  it("says what goes wrong without the document", () => {
    // The existing PRD test only checks the six rules that one project
    // matches; a rule for a bigger project or another region could ship with
    // an empty rationale and the checklist would render a blank explanation.
    for (const seeded of guidanceRulesSeed) {
      expect(seeded.rationale.trim().length).toBeGreaterThan(20);
      expect(seeded.rationale.trim()).toMatch(/[.!?]$/);
    }
  });

  it("only ever names a document type the schema has", () => {
    for (const seeded of guidanceRulesSeed) {
      expect(docTypeEnum.enumValues).toContain(seeded.docType);
    }
  });
});

describe("completeness — counting what exists", () => {
  const essentials: ChecklistItem[] = [
    { docType: "proposal", priority: "essential", rationale: "a" },
    { docType: "sow", priority: "essential", rationale: "b" },
    { docType: "invoice", priority: "essential", rationale: "c" },
  ];

  it("counts a document type once however many of them exist", () => {
    // The caller passes one entry per document row, and a project can hold
    // three invoices. Counting each would push the meter past 100%.
    const result = completeness(essentials, ["invoice", "invoice", "invoice"]);

    expect(result.done).toBe(1);
    expect(result.percent).toBe(33);
  });

  it("rounds a percentage that does not divide evenly", () => {
    // 1/3 is 33.3% and 2/3 is 66.7%; a truncating meter would show 66% for
    // the second and never quite agree with "2 of 3".
    expect(completeness(essentials, ["proposal"]).percent).toBe(33);
    expect(completeness(essentials, ["proposal", "sow"]).percent).toBe(67);
    expect(
      completeness(essentials, ["proposal", "sow", "invoice"]).percent,
    ).toBe(100);
  });

  it("ignores a document the checklist never asked for", () => {
    // Generating something off-checklist is fine, but it is not progress
    // against the essentials, and it must not overshoot the total.
    const result = completeness(essentials, ["nda", "payment_reminder"]);

    expect(result.done).toBe(0);
    expect(result.total).toBe(3);
  });
});

/**
 * Conditions come from a `jsonb` column that is edited by UPDATE rather than by
 * deploy, so a malformed rule is routine. Both shapes below used to fail *open*
 * — widening a narrow rule to every project — which showed an "essential"
 * document on work it was never written for while the rule still looked right
 * in the table.
 */
describe("malformed conditions fail closed", () => {
  const writing: ChecklistInput = {
    projectType: "writing",
    valueBand: "under_50k",
    clientCountry: "IN",
    clientRelationship: "new",
  };

  it("reads a bare project_type string as that one type", () => {
    // The natural thing to hand-type. Only an array was checked before, so
    // this constrained nothing and matched every project type.
    expect(matchesConditions({ project_type: "design" }, writing)).toBe(false);
    expect(
      matchesConditions({ project_type: "writing" }, writing),
    ).toBe(true);
  });

  it("still honours an array and the wildcard", () => {
    expect(
      matchesConditions({ project_type: ["design", "writing"] }, writing),
    ).toBe(true);
    expect(matchesConditions({ project_type: ["design"] }, writing)).toBe(false);
    expect(matchesConditions({ project_type: "*" }, writing)).toBe(true);
  });

  it("treats an unrecognised value_band_min as a broken rule, not an absent floor", () => {
    // Hyphens are what the UI labels use, so "50k-2l" for "50k_2l" is the
    // typo that happens. bandIndex returns -1 for it, and `index < -1` is
    // never true — so the floor switched off and the rule fired for the
    // smallest projects instead of the largest.
    expect(
      matchesConditions(
        { value_band_min: "50k-2l" as unknown as ChecklistInput["valueBand"] },
        writing,
      ),
    ).toBe(false);
  });

  it("keeps the floor inclusive for a well-formed band", () => {
    expect(matchesConditions({ value_band_min: "under_50k" }, writing)).toBe(true);
    expect(matchesConditions({ value_band_min: "50k_2l" }, writing)).toBe(false);
  });
});
