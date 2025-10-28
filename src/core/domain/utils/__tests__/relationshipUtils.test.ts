import {
  wouldCreateCycle,
  getAncestors,
  getDescendants,
  canAddParentChild,
  canAddSpouse,
} from "..//relationshipUtils";
import type { Relationship } from "../../types/relationship";

describe("relationshipUtils", () => {
  const base: Relationship[] = [
    { id: "r1", type: "parent-child", parentIds: ["a"], childId: "b" },
    { id: "r2", type: "parent-child", parentIds: ["b"], childId: "c" },
  ];

  describe("wouldCreateCycle", () => {
    it("returns false when safe edge is added", () => {
      expect(wouldCreateCycle(base, "c", "d")).toBe(false);
    });

    it("returns true when direct cycle would be created", () => {
      // existing: a -> b
      expect(wouldCreateCycle(base, "b", "a")).toBe(true);
    });

    it("returns true when indirect cycle would be created", () => {
      // existing: a -> b -> c
      expect(wouldCreateCycle(base, "c", "a")).toBe(true);
    });
  });

  describe("getAncestors", () => {
    it("collects ancestors transitively", () => {
      expect(getAncestors(base, "c").sort()).toEqual(["a", "b"]);
      expect(getAncestors(base, "b")).toEqual(["a"]);
      expect(getAncestors(base, "a")).toEqual([]);
    });
  });

  describe("getDescendants", () => {
    it("collects descendants transitively", () => {
      expect(getDescendants(base, "a").sort()).toEqual(["b", "c"]);
      expect(getDescendants(base, "b")).toEqual(["c"]);
      expect(getDescendants(base, "c")).toEqual([]);
    });
  });

  describe("canAddParentChild", () => {
    it("disallows self-parent relationship", () => {
      const result = canAddParentChild(base, "x", "x");
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/En individ kan inte vara sin egen förälder./i);
    });

    it("disallows cycles", () => {
      const result = canAddParentChild(base, "c", "a");
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/cykel/i);
    });

    it("allows valid parent-child relationship", () => {
      expect(canAddParentChild(base, "c", "d")).toEqual({ ok: true });
    });
  });

  describe("canAddSpouse", () => {
    const withSpouse: Relationship[] = [
      ...base,
      { id: "s1", type: "spouse", person1Id: "a", person2Id: "b" },
    ];

    it("disallows self-marriage", () => {
      const result = canAddSpouse(base, "a", "a");
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/sig själv/i);
    });

    it("disallows duplicate spouse relationship (same order)", () => {
      expect(canAddSpouse(withSpouse, "a", "b").ok).toBe(false);
    });

    it("disallows duplicate spouse relationship (reverse order)", () => {
      expect(canAddSpouse(withSpouse, "b", "a").ok).toBe(false);
    });

    it("allows valid new spouse relationship", () => {
      expect(canAddSpouse(withSpouse, "a", "c")).toEqual({ ok: true });
    });
  });
});