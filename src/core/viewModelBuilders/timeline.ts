// src/core/viewModelBuilders/timeline.ts

import { buildTimelineEvents } from "@core/domain";
import type { Individual, Relationship } from "@core/domain";

/**
 * The shape that the Timeline page consumes.
 * Includes:
 * - all individuals / relationships from state
 * - the currently selected person (or null)
 * - grouped/bucketed timeline events
 * - and the buckets spread at top level for convenience
 *
 * Before refactor this shape was assembled directly in the hook.
 */
export type TimelineViewModel = {
  individuals: Individual[];
  relationships: Relationship[];
  selected: Individual | null;
  groups: ReturnType<typeof buildTimelineEvents>;
} & ReturnType<typeof buildTimelineEvents>;

/**
 * Pure, framework-agnostic builder.
 * Takes raw domain data (arrays of individuals/relationships + selectedId)
 * and returns the full view model for rendering the Timeline screen.
 *
 * This has ZERO React/Redux. You can unit test it with plain objects.
 */
export function buildTimelineViewModel(
  individuals: Individual[],
  relationships: Relationship[],
  selectedId: string | null
): TimelineViewModel {
  // Find which individual (if any) is "active" in the timeline view
  const selected =
    individuals.find((i) => i.id === selectedId) ?? null;

  // We need to return "groups" even if nothing is selected.
  // We'll create a typed empty structure that matches buildTimelineEvents.
  const emptyGroups: ReturnType<typeof buildTimelineEvents> = {
    beforeBirth: [],
    lifeEvents: [],
    afterDeath: [],
    undated: [],
  };

  // If we have a selected person, build their timeline buckets.
  // Otherwise expose empty buckets.
  const groups = selected
    ? buildTimelineEvents(selected, relationships, individuals)
    : emptyGroups;

  // We keep backwards compatibility with the old hook return:
  // { individuals, relationships, selected, groups, ...groups }
  return {
    individuals,
    relationships,
    selected,
    groups,
    ...groups,
  };
}