import { buildTreeModel } from "../treeModel";
import type { Individual } from "../../domain/types/individual";
import type { Relationship } from "../../domain/types/relationship";

const I = (id: string, gender?: "M" | "F"): Individual =>
  ({
    id,
    givenName: id,
    familyName: "Fam",
    gender,
  } as unknown as Individual);

const spouse = (a: string, b: string): Relationship =>
  ({
    type: "spouse",
    id: `s-${a}-${b}`,
    person1Id: a,
    person2Id: b,
  } as unknown as Relationship);

const parentChild = (parents: string[], child: string): Relationship =>
  ({
    type: "parent-child",
    parentIds: parents,
    childId: child,
  } as unknown as Relationship);

describe("buildTreeModel", () => {
  const inds: Individual[] = [I("A", "M"), I("B", "F"), I("C", "M"), I("D", "F")];

  const rels: Relationship[] = [
    spouse("A", "B"), // couple
    parentChild(["A", "B"], "C"), // A+B → C
    parentChild(["C"], "D"), // C → D
  ];

  it("builds nodes for all individuals when no root is specified", () => {
    const model = buildTreeModel(inds, rels, {});
    const ids = model.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["A", "B", "C", "D", "m-A-B"]);
    expect(model.marriageNodes.length).toBe(1);
    expect(model.childEdges.length).toBe(2); // one from m-A-B→C, one from C→D
  });

  it("creates marriage nodes only for allowed individuals when root limits apply", () => {
    const model = buildTreeModel(inds, rels, { rootId: "D", mode: "ancestors", maxGenerations: 3 });
    // ancestors of D: C, (A,B) because C→D, A+B→C
    expect(Object.keys(model.levelById)).toEqual(expect.arrayContaining(["D", "C", "A", "B"]));
    // no unrelated marriage nodes
    const marriageIds = model.nodes.filter((n) => n.type === "marriage").map((n) => n.id);
    expect(marriageIds).toContain("m-A-B");
    expect(model.childEdges.some((e) => e.source === "m-A-B" && e.target === "C")).toBe(true);
  });

  it("builds correct parent→child edges when no marriage node exists", () => {
    const rels2: Relationship[] = [parentChild(["A"], "B")];
    const inds2: Individual[] = [I("A", "M"), I("B", "F")];
    const model = buildTreeModel(inds2, rels2);
    expect(model.childEdges).toEqual([
      expect.objectContaining({
        id: "pc-A-B",
        source: "A",
        target: "B",
      }),
    ]);
  });

  it("assigns correct generation levels (descendants mode)", () => {
    const model = buildTreeModel(inds, rels, { rootId: "A", mode: "descendants", maxGenerations: 5 });
    expect(model.levelById["A"]).toBe(0);
    expect(model.levelById["C"]).toBe(1);
    expect(model.levelById["D"]).toBe(2);
  });

  it("assigns correct generation levels (ancestors mode)", () => {
    const model = buildTreeModel(inds, rels, { rootId: "D", mode: "ancestors", maxGenerations: 5 });
    expect(model.levelById["D"]).toBe(0);
    expect(model.levelById["C"]).toBe(1);
    // ancestors of C (parents A and B)
    expect(model.levelById["A"]).toBe(2);
    expect(model.levelById["B"]).toBe(2);
  });

  it("omits nodes/edges beyond maxGenerations", () => {
    const model = buildTreeModel(inds, rels, { rootId: "A", mode: "descendants", maxGenerations: 1 });
    // Should only include A and C, not D
    expect(Object.keys(model.levelById)).toEqual(expect.arrayContaining(["A", "C"]));
    expect(model.levelById["D"]).toBeUndefined();
  });
});