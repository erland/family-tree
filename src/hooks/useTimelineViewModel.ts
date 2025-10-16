import { useMemo } from "react";
import { useAppSelector } from "../store";
import { buildTimelineEvents } from "../utils/timelineUtils";
import type { Individual } from "../types/individual";
import type { Relationship } from "../types/relationship";

type Groups = ReturnType<typeof buildTimelineEvents>;

/**
 * Pure view-model for the Timeline page.
 * - Takes a selected individual id (controlled by the page/route/UI).
 * - Pulls individuals + relationships from state.
 * - Returns the selected person and prebuilt event groups for rendering.
 */
export function useTimelineViewModel(selectedId: string | null) {
  const individuals = useAppSelector((s) => s.individuals.items as Individual[]);
  const relationships = useAppSelector((s) => s.relationships.items as Relationship[]);

  const selected = useMemo(
    () => (selectedId ? individuals.find((i) => i.id === selectedId) ?? null : null),
    [individuals, selectedId]
  );

  const groups: Groups = useMemo(() => {
    if (!selected) {
      return {
        beforeBirth: [],
        lifeEvents: [],
        afterDeath: [],
        undated: [],
      };
    }
    return buildTimelineEvents(selected, relationships, individuals);
  }, [selected, relationships, individuals]);

  return {
    individuals,
    relationships,
    selected,
    groups,
    // For convenience if you prefer destructuring:
    ...groups,
  };
}
