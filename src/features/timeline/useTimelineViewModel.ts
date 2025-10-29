import { useMemo } from "react";
import { useAppSelector } from "../../store";
import type { Individual, Relationship } from "@core/domain";
import { buildTimelineViewModel } from "@core/viewModelBuilders/timeline";

/**
 * React-facing hook for the Timeline page.
 *
 * This hook is an adapter:
 * - reads data from Redux
 * - calls the pure builder
 * - memoizes the result
 *
 * All the actual "what does the timeline look like?" logic
 * lives in buildTimelineViewModel (which is easy to unit test
 * without mocking React/Redux).
 */
export function useTimelineViewModel(selectedId: string | null) {
  const individuals = useAppSelector(
    (s) => s.individuals.items as Individual[]
  );
  const relationships = useAppSelector(
    (s) => s.relationships.items as Relationship[]
  );

  // buildTimelineViewModel is pure, so this memo is safe.
  return useMemo(
    () =>
      buildTimelineViewModel(
        individuals,
        relationships,
        selectedId
      ),
    [individuals, relationships, selectedId]
  );
}