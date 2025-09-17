import { Relationship } from "../types/relationship";

export function buildGraph(
  relationships: Relationship[]
): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const rel of relationships) {
    if (rel.type === "parent-child") {
      for (const parentId of rel.parentIds) {
        if (!graph[parentId]) graph[parentId] = [];
        graph[parentId].push(rel.childId);
      }
    }
  }
  return graph;
}

export function wouldCreateCycle(
    relationships: Relationship[],
    newRel: { parentIds: string[]; childId: string }
  ): boolean {
    const graph = buildGraph(relationships);
  
    console.log("🔎 Graph before check:", JSON.stringify(graph, null, 2));
    console.log("🔎 Trying to add:", newRel);
  
    function dfs(node: string, target: string, visited = new Set<string>()): boolean {
      if (node === target) return true;
      if (visited.has(node)) return false;
      visited.add(node);
  
      for (const child of graph[node] || []) {
        if (dfs(child, target, visited)) return true;
      }
      return false;
    }
  
    // For each parent, check if child is already reachable → cycle
    for (const parentId of newRel.parentIds) {
      if (dfs(newRel.childId, parentId)) {
        console.warn("🚨 Cycle would be created: child already reaches parent", parentId);
        return true;
      }
    }
  
    console.log("✅ No cycle detected for relation:", newRel);
    return false;
  }
  
/**
 * Get all ancestors of a given person (recursive DFS).
 */
export function getAncestors(
  relationships: Relationship[],
  personId: string
): string[] {
  const ancestors: Set<string> = new Set();

  function dfs(currentId: string) {
    for (const rel of relationships) {
      if (rel.type === "parent-child" && rel.childId === currentId) {
        for (const parentId of rel.parentIds) {
          if (!ancestors.has(parentId)) {
            ancestors.add(parentId);
            dfs(parentId);
          }
        }
      }
    }
  }

  dfs(personId);
  return Array.from(ancestors);
}