import {
  getParentsOf,
  getSpousesOf,
  groupChildrenByOtherParent,
  getChildrenOf,
} from "../peopleSelectors";
import type { Individual } from "../../types/individual";
import type { Relationship } from "../../types/relationship";

const makeInd = (id: string, givenName: string, gender?: string): Individual => ({
  id,
  givenName,
  gender,
});

describe("peopleSelectors", () => {
  const alice = makeInd("a", "Alice", "female");
  const bob = makeInd("b", "Bob", "male");
  const charlie = makeInd("c", "Charlie", "male");
  const diana = makeInd("d", "Diana", "female");
  const erin = makeInd("e", "Erin");
  const all: Individual[] = [alice, bob, charlie, diana, erin];

  describe("getParentsOf", () => {
    it("returns correct parents", () => {
      const rels: Relationship[] = [
        { id: "r1", type: "parent-child", parentIds: ["a", "b"], childId: "c" },
      ];
      expect(getParentsOf("c", rels, all).map((i) => i.id).sort()).toEqual(["a", "b"]);
    });

    it("deduplicates multiple relationships with same parent", () => {
      const rels: Relationship[] = [
        { id: "r1", type: "parent-child", parentIds: ["a"], childId: "c" },
        { id: "r2", type: "parent-child", parentIds: ["a"], childId: "c" },
      ];
      expect(getParentsOf("c", rels, all).map((i) => i.id)).toEqual(["a"]);
    });

    it("returns [] when no relationships", () => {
      expect(getParentsOf("d", [], all)).toEqual([]);
    });
  });

  describe("getChildrenOf", () => {
    it("returns children of a given parent", () => {
      const rels: Relationship[] = [
        { id: "pc1", type: "parent-child", parentIds: ["a", "b"], childId: "c" },
        { id: "pc2", type: "parent-child", parentIds: ["a"], childId: "d" },
      ];
      expect(getChildrenOf("a", rels, all).map((c) => c.id).sort()).toEqual(["c", "d"]);
      expect(getChildrenOf("b", rels, all).map((c) => c.id)).toEqual(["c"]);
    });

    it("returns [] if parent has no children", () => {
      const rels: Relationship[] = [
        { id: "pc1", type: "parent-child", parentIds: ["a"], childId: "c" },
      ];
      expect(getChildrenOf("z", rels, all)).toEqual([]);
    });
  });

  describe("getSpousesOf", () => {
    it("returns Individuals when spouses exist", () => {
      const rels: Relationship[] = [
        { id: "s1", type: "spouse", person1Id: "a", person2Id: "b" },
        { id: "s2", type: "spouse", person1Id: "a", person2Id: "e" },
      ];
      const aSpouses = getSpousesOf("a", rels, all).map((s) => s.id).sort();
      expect(aSpouses).toEqual(["b", "e"]);

      const bSpouses = getSpousesOf("b", rels, all).map((s) => s.id);
      expect(bSpouses).toEqual(["a"]);
    });

    it("returns [] when no spouse found", () => {
      expect(getSpousesOf("c", [], all)).toEqual([]);
    });

    it("ignores spouse pointing to unknown individual", () => {
      const rels: Relationship[] = [
        { id: "s1", type: "spouse", person1Id: "a", person2Id: "x" }, // x not in all
      ];
      expect(getSpousesOf("a", rels, all)).toEqual([]);
    });
  });

  describe("groupChildrenByOtherParent", () => {
    it("groups children by the other parent", () => {
      const rels: Relationship[] = [
        { id: "pc1", type: "parent-child", parentIds: ["a", "b"], childId: "c" },
        { id: "pc2", type: "parent-child", parentIds: ["a"], childId: "d" },
      ];
      const groups = groupChildrenByOtherParent("a", rels, all);

      const withBob = groups.find((g) => g.partner?.id === "b");
      expect(withBob?.children.map((ch) => ch.id)).toEqual(["c"]);

      const solo = groups.find((g) => g.partner === null);
      expect(solo?.children.map((ch) => ch.id)).toEqual(["d"]);
    });

    it("skips child not found in individuals", () => {
      const rels: Relationship[] = [
        { id: "pc1", type: "parent-child", parentIds: ["a", "b"], childId: "zzz" },
      ];
      const groups = groupChildrenByOtherParent("a", rels, all);
      expect(groups).toEqual([]); // skipped because child not in all
    });

    it("creates partner=null group if other parent not found", () => {
      const rels: Relationship[] = [
        { id: "pc1", type: "parent-child", parentIds: ["a", "x"], childId: "c" }, // x not in all
      ];
      const groups = groupChildrenByOtherParent("a", rels, all);
      const nullPartner = groups.find((g) => g.partner === null);
      expect(nullPartner?.children.map((ch) => ch.id)).toEqual(["c"]);
    });

    it("groups multiple children under same other parent", () => {
      const rels: Relationship[] = [
        { id: "pc1", type: "parent-child", parentIds: ["a", "b"], childId: "c" },
        { id: "pc2", type: "parent-child", parentIds: ["a", "b"], childId: "d" },
      ];
      const groups = groupChildrenByOtherParent("a", rels, all);
      const withBob = groups.find((g) => g.partner?.id === "b");
      expect(withBob?.children.map((ch) => ch.id).sort()).toEqual(["c", "d"]);
    });
  });
});