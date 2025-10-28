// src/hooks/usePlacesViewModel.ts
import { useCallback, useMemo } from "react";
import { useAppSelector } from "../store";
import type { Individual, Relationship } from "@core/domain";

import {
  buildPlacesBaseIndex,
  buildPlacesList,
  countTotalEvents,
  expandPlacesById,
  PlacesSortMode,
  PlaceVM,
  PlaceEventVM,
} from "@core/viewModelBuilders/places";

// Re-export the types so tests (and components) can still import from this hook file
export type { PlacesSortMode, PlaceVM, PlaceEventVM };

export function usePlacesViewModel(options?: {
  sort?: PlacesSortMode;
  query?: string | null;
}) {
  const { sort = "alpha", query = null } = options ?? {};

  const individuals = useAppSelector(
    (s) => s.individuals.items
  ) as Individual[];
  const relationships = useAppSelector(
    (s) => s.relationships.items
  ) as Relationship[];

  // Build the base index of places from domain data.
  // (Still pure; we just memoize around Redux state.)
  const baseIndex = useMemo(
    () => buildPlacesBaseIndex(individuals, relationships),
    [individuals, relationships]
  );

  // Left-column places list (filtered/sorted)
  const places: PlaceVM[] = useMemo(
    () => buildPlacesList(baseIndex, query, sort),
    [baseIndex, query, sort]
  );

  // Overall number of events (for UI hint text)
  const totalEvents = useMemo(
    () => countTotalEvents(baseIndex),
    [baseIndex]
  );

  /**
   * Getter for the right-hand detail panel:
   * return a merged PlaceVM for a base place name (with related places merged).
   *
   * This wraps expandPlacesById(baseIndex, name) in a stable callback.
   */
  const expandById = useCallback(
    (baseName: string): PlaceVM | null => {
      return expandPlacesById(baseIndex, baseName);
    },
    [baseIndex]
  );

  return {
    places,       // left column list
    totalEvents,  // aggregate count for hint / header
    expandById,   // function: get merged place details for right panel
  };
}