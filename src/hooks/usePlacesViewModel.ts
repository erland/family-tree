// src/hooks/usePlacesViewModel.ts
import { useCallback, useMemo } from "react";
import { useAppSelector } from "../store";
import { fullName } from "@core/domain";
import { buildPlacesIndex, expandRelatedPlaces } from "@core/domain";

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
  raw?: unknown;               // the original place object
};

export type PlacesSortMode = "alpha" | "events-desc" | "events-asc";

export function usePlacesViewModel(options?: {
  sort?: PlacesSortMode;
  query?: string | null;
}) {
  const { sort = "alpha", query = null } = options ?? {};

  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  // Base places index (each place has a .name and an .individuals array with { ind, event, date })
  const baseIndex = useMemo(
    () => buildPlacesIndex(individuals, relationships) as any[],
    [individuals, relationships]
  );

  // Map a place's "individuals" -> table-friendly event rows
  const mapIndividualsToEvents = useCallback((placeLike: any): PlaceEventVM[] => {
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
    // Keep ordering non-breaking: sort by date ascending (string compare is fine for ISO strings)
    rows.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    return rows;
  }, []);

  // Left-list places (no expansion, mirrors your original left column)
  const places: PlaceVM[] = useMemo(() => {
    const mapped = baseIndex.map((p: any) => {
      const id = String(p?.name ?? "Okänd plats");
      const events = mapIndividualsToEvents(p);          // base, not expanded
      const peopleCount = Array.isArray(p?.individuals) ? p.individuals.length : events.length;
      return {
        id,
        title: id,
        subtitle: `${peopleCount} person${peopleCount === 1 ? "" : "er"}`,
        events,
        raw: p,
      } as PlaceVM;
    });

    // Filter by title or person name
    const filtered = query
      ? mapped.filter((pl) => {
          const q = query.toLowerCase();
          if (pl.title.toLowerCase().includes(q)) return true;
          return pl.events.some((e) => (e.individualName ?? "").toLowerCase().includes(q));
        })
      : mapped;

    // Sort
    const withCounts = filtered.map((p) => ({ ...p, _count: p.events.length }));
    withCounts.sort((a, b) => {
      if (sort === "alpha") return a.title.localeCompare(b.title);
      if (sort === "events-desc") return b._count - a._count;
      if (sort === "events-asc") return a._count - b._count;
      return 0;
    });
    withCounts.forEach((p) => delete (p as any)._count);

    return withCounts;
  }, [baseIndex, mapIndividualsToEvents, query, sort]);

  const totalEvents = useMemo(
    () => baseIndex.reduce((sum, p: any) => sum + (p?.individuals?.length ?? 0), 0),
    [baseIndex]
  );

  /**
   * Expand/merge a base place by its name (id) into a single PlaceVM,
   * using your existing expandRelatedPlaces(places, baseName).
   *
   * This mirrors your original right-panel behavior.
   */
  const expandById = useCallback(
    (baseName: string): PlaceVM | null => {
      if (!baseName) return null;
      const expanded = expandRelatedPlaces(baseIndex, baseName) as any[];
      const combined = expanded.flatMap((p) => mapIndividualsToEvents(p));
      const subtitle = `${combined.length} händelse${combined.length === 1 ? "" : "r"}`;
      return {
        id: baseName,
        title: baseName,
        subtitle,
        events: combined,
        raw: expanded,
      };
    },
    [baseIndex, mapIndividualsToEvents]
  );

  return {
    places,       // left column list (no expansion)
    totalEvents,  // overall count for hint text
    expandById,   // get a merged PlaceVM for the right panel
  };
}