// src/utils/__tests__/ancestors.test.ts
import {
  getOrderedParents,
  buildAncestorMatrix,
  type AncestorMatrix,
} from "../ancestors";
import type { Individual } from "../../types/individual";
import type { Relationship } from "../../types/relationship";

const I = (id: string, givenName = "", familyName = "", gender?: "M" | "F"): Individual =>
  ({
    id,
    givenName,
    familyName,
    gender,
  } as unknown as Individual);

const PC = (childId: string, parentIds: string[]): Relationship =>
  ({
    type: "parent-child",
    childId,
    parentIds,
  } as unknown as Relationship);

describe("getOrderedParents", () => {
  const individuals: Individual[] = [
    I("c", "Child"),
    I("f", "Father", "", "M"),
    I("m", "Mother", "", "F"),
    I("a", "Alex"), // unknown gender
    I("z", "Zara"), // unknown gender
  ];
  const byId = new Map(individuals.map((x) => [x.id, x]));

  it("returns [null, null] when no parents exist", () => {
    const rels: Relationship[] = [];
    expect(getOrderedParents("c", rels, byId)).toEqual([null, null]);
  });

  it("returns [single, null] when only one parent is present", () => {
    const rels: Relationship[] = [PC("c", ["f"])];
    expect(getOrderedParents("c", rels, byId)).toEqual(["f", null]);
  });

  it("orders male first then female when both known", () => {
    const rels: Relationship[] = [PC("c", ["m", "f"])];
    expect(getOrderedParents("c", rels, byId)).toEqual(["f", "m"]);
  });

  it("falls back to deterministic sorted order when genders unknown", () => {
    const rels: Relationship[] = [PC("c", ["z", "a"])];
    // alphabetical by id -> ["a", "z"]
    expect(getOrderedParents("c", rels, byId)).toEqual(["a", "z"]);
  });

  it("merges multiple parent-child relations for the same child", () => {
    const rels: Relationship[] = [PC("c", ["m"]), PC("c", ["f"])];
    expect(getOrderedParents("c", rels, byId)).toEqual(["f", "m"]);
  });
});

describe("buildAncestorMatrix", () => {
  /**
   * Tree:
   *           FF ── FM
   *             \  /
   *              F ── M
   *             /      \
   *           C        MF ── MM
   */
  const inds: Individual[] = [
    I("C", "Child"),
    I("F", "Father", "Fam", "M"),
    I("M", "Mother", "Fam", "F"),
    I("FF", "FFirst", "", "M"),
    I("FM", "FSecond", "", "F"),
    I("MF", "MFirst", "", "M"),
    I("MM", "MSecond", "", "F"),
  ];
  const rels: Relationship[] = [
    PC("C", ["F", "M"]),
    PC("F", ["FF", "FM"]),
    PC("M", ["MF", "MM"]),
  ];

  it("builds correct matrix for 0..2 generations", () => {
    const M = buildAncestorMatrix("C", inds, rels, 2);
    expect(M[0]).toEqual(["C"]);
    expect(M[1]).toEqual(["F", "M"]); // father, mother
    expect(M[2]).toEqual(["FF", "FM", "MF", "MM"]);
  });

  it("fills missing parents with nulls and continues branching", () => {
    // Only mother known for C, and only MF known for M
    const rels2: Relationship[] = [PC("C", ["M"]), PC("M", ["MF"])];
    const M = buildAncestorMatrix("C", inds, rels2, 2);
    // gen1: [father, mother] -> [null, "M"]
    expect(M[1]).toEqual([null, "M"]);
    // gen2 slots: [father of null, mother of null, father of M, mother of M]
    expect(M[2]).toEqual([null, null, "MF", null]);
  });

  it("uses sorted fallback for unknown-gender parents (father slot gets first)", () => {
    const inds2: Individual[] = [I("C"), I("a"), I("z")];
    const rels2: Relationship[] = [PC("C", ["z", "a"])];
    const M = buildAncestorMatrix("C", inds2, rels2, 1);
    // gen1 father slot (index 0) should be "a", mother slot (index 1) "z"
    expect(M[1]).toEqual(["a", "z"]);
  });
});
/*
describe("fullName", () => {
  it("returns empty string for null/undefined", () => {
    expect(fullName(undefined)).toBe("");
    expect(fullName(null as unknown as Individual)).toBe("");
  });

  it("joins given and family names", () => {
    expect(
      fullName({ id: "1", givenName: "Anna", familyName: "Svensson" } as Individual)
    ).toBe("Anna Svensson");
    expect(fullName({ id: "2", givenName: "Anna" } as Individual)).toBe("Anna");
  });

  it("adds years when birth/death dates present", () => {
    expect(
      fullName({
        id: "3",
        givenName: "Anna",
        familyName: "Svensson",
        birthDate: "1901-03-04",
        deathDate: "1975-05-06",
      } as Individual)
    ).toBe("Anna Svensson (1901–1975)");

    expect(
      fullName({
        id: "4",
        givenName: "Anna",
        familyName: "Svensson",
        birthDate: "1901-03-04",
      } as Individual)
    ).toBe("Anna Svensson (1901–)");

    expect(
      fullName({
        id: "5",
        givenName: "Anna",
        familyName: "Svensson",
        deathDate: "1975-05-06",
      } as Individual)
    ).toBe("Anna Svensson (?–1975)");
  });
});
*/