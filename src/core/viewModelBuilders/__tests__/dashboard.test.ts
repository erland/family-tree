import { buildDashboardStats } from "../dashboard";

test("counts individuals, marriages, and families", () => {
  const individuals = [{ id: "a" }, { id: "b" }] as any[];
  const relationships = [
    { type: "spouse", person1Id: "a", person2Id: "b" },
    { type: "parent-child", parentIds: ["a", "b"], childId: "c" },
    { type: "parent-child", parentIds: ["a", "b"], childId: "c" }, // dup family
  ] as any[];

  const stats = buildDashboardStats(individuals, relationships);

  expect(stats).toEqual({
    individualCount: 2,
    marriageCount: 1,
    familyCount: 1,
  });
});