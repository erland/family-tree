import { Relationship } from "../types/relationship";

/* ------------------------------------------------------------------
   Graph utilities
------------------------------------------------------------------- */

/** Build parent→child adjacency list */
function buildAdjacency(relationships: Relationship[]): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const rel of relationships) {
    if (rel.type === "parent-child") {
      for (const pid of rel.parentIds) {
        if (!graph[pid]) graph[pid] = [];
        graph[pid].push(rel.childId);
      }
    }
  }
  return graph;
}

/** DFS reachability check */
function dfs(
  graph: Record<string, string[]>,
  startId: string,
  targetId: string,
  visited = new Set<string>()
): boolean {
  if (startId === targetId) return true;
  if (visited.has(startId)) return false;
  visited.add(startId);

  const children = graph[startId] || [];
  for (const child of children) {
    if (dfs(graph, child, targetId, visited)) return true;
  }
  return false;
}

/** Check if adding a parent→child edge would create a cycle */
export function wouldCreateCycle(
  relationships: Relationship[],
  parentId: string,
  childId: string
): boolean {
  const graph = buildAdjacency(relationships);
  if (!graph[parentId]) graph[parentId] = [];
  graph[parentId].push(childId);
  return dfs(graph, childId, parentId);
}

/** Collect ancestors of a person */
export function getAncestors(relationships: Relationship[], personId: string): string[] {
  const result = new Set<string>();
  function dfsUp(id: string) {
    for (const rel of relationships) {
      if (rel.type === "parent-child" && rel.childId === id) {
        for (const pid of rel.parentIds) {
          if (!result.has(pid)) {
            result.add(pid);
            dfsUp(pid);
          }
        }
      }
    }
  }
  dfsUp(personId);
  return Array.from(result);
}

/** Collect descendants of a person */
export function getDescendants(relationships: Relationship[], personId: string): string[] {
  const result = new Set<string>();
  function dfsDown(id: string) {
    for (const rel of relationships) {
      if (rel.type === "parent-child" && rel.parentIds.includes(id)) {
        if (!result.has(rel.childId)) {
          result.add(rel.childId);
          dfsDown(rel.childId);
        }
      }
    }
  }
  dfsDown(personId);
  return Array.from(result);
}

/** Validate parent-child addition */
export function canAddParentChild(
  relationships: Relationship[],
  parentId: string,
  childId: string
): { ok: boolean; reason?: string } {
  if (parentId === childId) {
    return { ok: false, reason: "En individ kan inte vara sin egen förälder." };
  }
  if (wouldCreateCycle(relationships, parentId, childId)) {
    return { ok: false, reason: "Det här skulle skapa en cykel i släktträdet." };
  }
  return { ok: true };
}

/** Validate spouse addition */
export function canAddSpouse(
  relationships: Relationship[],
  a: string,
  b: string
): { ok: boolean; reason?: string } {
  if (a === b) {
    return { ok: false, reason: "En individ kan inte vara gift med sig själv." };
  }
  const duplicate = relationships.some(
    (rel) =>
      rel.type === "spouse" &&
      (((rel as any).person1Id === a && (rel as any).person2Id === b) ||
        ((rel as any).person1Id === b && (rel as any).person2Id === a))
  );
  if (duplicate) {
    return { ok: false, reason: "Den här äktenskapsrelationen finns redan." };
  }
  return { ok: true };
}