// src/core/viewModelBuilders/timeline/buildTimelineViewModel.ts
import { Individual } from "../../domain";       // adjust
import { Relationship } from "../../domain";     // adjust
import { buildLifeEvents } from "../personHistory";
import { groupTimelineEvents } from "./groupTimelineEvents";
import { TimelineBuckets } from "./types";

export function buildTimelineViewModel(
  individuals: Individual[],
  relationships: Relationship[],
  selectedId: string | null
): { selected: Individual | null } & TimelineBuckets {
  const selected =
    (selectedId
      ? individuals.find((i) => i.id === selectedId)
      : null) || null;

  if (!selected) {
    return {
      selected: null,
      beforeBirth: [],
      lifeEvents: [],
      afterDeath: [],
      undated: [],
    };
  }

  const flatEvents = buildLifeEvents(
    selected,
    relationships,
    individuals
  );

  const buckets = groupTimelineEvents(selected, flatEvents);

  return {
    selected,
    ...buckets,
  };
}