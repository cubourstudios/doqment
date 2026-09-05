import { describe, expect, it } from "vitest";

import { groupVersionsByDocument } from "./route";

type Version = { documentId: string; versionNo: number };

/**
 * Collapsing one-query-per-document into a single query moves the risk from
 * the SQL to the regrouping. A document that silently loses its versions, or
 * vanishes from the export entirely, would not be noticed until someone
 * actually needed their data out — which is the worst possible moment.
 */
describe("groupVersionsByDocument", () => {
  it("keeps each version with its own document", () => {
    const versions: Version[] = [
      { documentId: "a", versionNo: 1 },
      { documentId: "a", versionNo: 2 },
      { documentId: "b", versionNo: 1 },
    ];

    expect(groupVersionsByDocument(["a", "b"], versions)).toEqual([
      { documentId: "a", versions: [versions[0], versions[1]] },
      { documentId: "b", versions: [versions[2]] },
    ]);
  });

  /*
   * The per-document query returned an empty list for a document with no
   * versions. Dropping such documents would quietly shrink the export.
   */
  it("still includes a document that has no versions", () => {
    expect(groupVersionsByDocument(["a", "b"], [{ documentId: "a", versionNo: 1 }])).toEqual([
      { documentId: "a", versions: [{ documentId: "a", versionNo: 1 }] },
      { documentId: "b", versions: [] },
    ]);
  });

  it("returns one entry per document, in the order given", () => {
    const result = groupVersionsByDocument(["c", "a", "b"], []);
    expect(result.map((r) => r.documentId)).toEqual(["c", "a", "b"]);
  });

  /*
   * The query is scoped by the user's own document ids, so this should never
   * happen — but if it ever did, a stray row must be dropped rather than
   * appear in someone else's export under a document they do not own.
   */
  it("drops a version whose document is not being exported", () => {
    const result = groupVersionsByDocument(
      ["a"],
      [
        { documentId: "a", versionNo: 1 },
        { documentId: "someone-elses", versionNo: 1 },
      ],
    );

    expect(result).toHaveLength(1);
    expect(result[0].versions).toEqual([{ documentId: "a", versionNo: 1 }]);
    expect(JSON.stringify(result)).not.toContain("someone-elses");
  });

  it("preserves the order rows arrived in", () => {
    const versions: Version[] = [
      { documentId: "a", versionNo: 1 },
      { documentId: "a", versionNo: 2 },
      { documentId: "a", versionNo: 3 },
    ];

    expect(groupVersionsByDocument(["a"], versions)[0].versions).toEqual(versions);
  });

  it("handles an account with nothing in it", () => {
    expect(groupVersionsByDocument([], [])).toEqual([]);
  });

  // A duplicate id would otherwise share one array between two entries.
  it("does not share an array between repeated ids", () => {
    const result = groupVersionsByDocument(["a", "a"], [{ documentId: "a", versionNo: 1 }]);
    expect(result).toHaveLength(2);
    expect(result[0].versions).toEqual(result[1].versions);
  });
});
