// src/core/viewModelBuilders/dashboard.ts

import type { Individual, Relationship } from "@core/domain";

/**
 * DashboardStats describes the high-level metrics shown on the dashboard:
 * - number of individuals
 * - number of marriages (spouse relationships)
 * - number of unique parent-child families
 */
export interface DashboardStats {
  individualCount: number;
  marriageCount: number;
  familyCount: number;
}

/**
 * Pure builder for dashboard summary stats.
 *
 * This is intentionally framework-agnostic:
 * - no React
 * - no Redux
 * - no window / side effects
 *
 * You can unit test this with simple arrays of Individuals and Relationships.
 */
export function buildDashboardStats(
  individuals: Individual[],
  relationships: Relationship[]
): DashboardStats {
  const individualCountLocal = individuals.length;

  // Count spouse relationships
  const marriageCountLocal = relationships.filter(
    (r) => r.type === "spouse"
  ).length;

  // Count unique parent-child "families"
  const familySet = new Set<string>();
  for (const r of relationships) {
    if (r.type === "parent-child") {
      const parentIds = Array.isArray((r as any).parentIds)
        ? (r as any).parentIds
        : [];

      const key = [...parentIds].sort().join(",") + "->" + (r as any).childId;
      familySet.add(key);
    }
  }

  return {
    individualCount: individualCountLocal,
    marriageCount: marriageCountLocal,
    familyCount: familySet.size,
  };
}