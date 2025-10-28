// src/core/viewModelBuilders/places.ts

import { fullName, buildPlacesIndex, expandRelatedPlaces } from "@core/domain";
import type { Individual, Relationship } from "@core/domain";

export type PlaceEventVM = {
  id?: string;
  date?: string | null;
  label: string;               // e.g., "Födelse", "Död", "Flytt", etc.
  individualId?: string | null;
  individualName?: string | null;
  raw?: unknown;
};

export type PlaceVM = {
  id: string;                  // we use place.name as id for simplicity/uniqueness
  title: string;               // display title (same as name)
  subtitle?: string;           // e.g., "12 personer" for the left list, or "34 händelser"
  events: PlaceEventVM[];      // table-ready rows
  raw?: unknown;               // the original place object / merged objects
};

// Sorting mode for the left column list
export type PlacesSortMode = "alpha" | "events-desc" | "events-asc";

/**
 * Turn a single "place-like" object (from buildPlacesIndex / expandRelatedPlaces)
 * into sorted event rows for the UI table.
 *
 * This is pure and reusable.
 */
export function mapIndividualsToEvents(placeLike: any): PlaceEventVM[] {
  const rows: PlaceEventVM[] = (placeLike?.individuals ?? []).map((rec: any) => {
    const ind = rec?.ind;
    return {
      id: rec?.id,
      date: rec?.date ?? null,
      label: rec?.event ?? "Händelse",
      individualId: ind?.id ?? null,
      individualName: ind ? fullName(ind) : null,
      raw: rec,
    };
  });

  // Stable sort by date (lexical compare works for ISO-ish strings)
  rows.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  return rows;
}

/**
 * Build the base index of places from all individuals/relationships.
 * This is just a passthrough around buildPlacesIndex, kept here so tests
 * don't have to import buildPlacesIndex directly.
 */
export function buildPlacesBaseIndex(
  individuals: Individual[],
  relationships: Relationship[]
): any[] {
  return buildPlacesIndex(individuals, relationships) as any[];
}

/**
 * Build the "left panel" list of places:
 * - attach per-place event rows
 * - compute subtitle ("X personer")
 * - filter by query if provided
 * - sort according to sort mode
 *
 * Returns an array of PlaceVM.
 */
export function buildPlacesList(
  baseIndex: any[],
  query: string | null,
  sort: PlacesSortMode
): PlaceVM[] {
  // Map raw place objects -> PlaceVM
  const mapped: PlaceVM[] = baseIndex.map((p: any) => {
    const id = String(p?.name ?? "Okänd plats");
    const events = mapIndividualsToEvents(p);

    // number of people tied to this place (fallback to number of events)
    const peopleCount = Array.isArray(p?.individuals)
      ? p.individuals.length
      : events.length;

    return {
      id,
      title: id,
      subtitle: `${peopleCount} person${peopleCount === 1 ? "" : "er"}`,
      events,
      raw: p,
    };
  });

  // Optional filter (by place title OR by any individual's name)
  const filtered: PlaceVM[] = query
    ? mapped.filter((pl) => {
        const q = query.toLowerCase();
        if (pl.title.toLowerCase().includes(q)) return true;
        return pl.events.some((e) =>
          (e.individualName ?? "").toLowerCase().includes(q)
        );
      })
    : mapped;

  // Sort
  // We'll decorate with a _count temp field for sort-by-events* modes.
  const withCounts = filtered.map((p) => ({
    ...p,
    _count: p.events.length,
  }));

  withCounts.sort((a, b) => {
    if (sort === "alpha") return a.title.localeCompare(b.title);
    if (sort === "events-desc") return b._count - a._count;
    if (sort === "events-asc") return a._count - b._count;
    return 0;
  });

  // Strip _count helper
  withCounts.forEach((p) => {
    delete (p as any)._count;
  });

  return withCounts;
}

/**
 * Count total number of event records across all base places.
 * Used for UI hint text ("Totalt X händelser").
 */
export function countTotalEvents(baseIndex: any[]): number {
  return baseIndex.reduce(
    (sum, p: any) => sum + (p?.individuals?.length ?? 0),
    0
  );
}

/**
 * Merge a place and its "related places" (e.g. city/region variants)
 * into a single PlaceVM for the right-hand detail panel.
 *
 * It uses expandRelatedPlaces(baseIndex, baseName) which returns an array
 * of place-like objects that should be combined.
 */
export function expandPlacesById(
  baseIndex: any[],
  baseName: string
): PlaceVM | null {
  if (!baseName) return null;

  const expanded = expandRelatedPlaces(baseIndex, baseName) as any[];
  const combinedEvents = expanded.flatMap((p) => mapIndividualsToEvents(p));

  const subtitle = `${combinedEvents.length} händelse${
    combinedEvents.length === 1 ? "" : "r"
  }`;

  return {
    id: baseName,
    title: baseName,
    subtitle,
    events: combinedEvents,
    raw: expanded,
  };
}