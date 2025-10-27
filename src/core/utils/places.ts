// src/utils/places.ts
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";

/** One row shown on the right-hand side list for a place. */
export type PlaceEvent = {
  ind: Individual;
  /** e.g. "Födelse" | "Död" | "Vigsel" | "Flytt" */
  event: string;
  /** ISO-like partial date 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' */
  date?: string;
};

/** Aggregated index for a single place name (usually the city string). */
export type PlaceInfo = {
  name: string;
  individuals: PlaceEvent[];
};

/**
 * Build a sorted index of places from individuals (and optionally relationships).
 * - Birth/Death: uses individual's birthCity/deathCity.
 * - Moves (flyttar): uses individual's moves[].city.
 * - Weddings: if relationships are provided, uses spouse.weddingCity.
 *
 * Returns an array sorted by name (sv locale) with each place's events sorted by date.
 */
export function buildPlacesIndex(
  individuals: Individual[],
  relationships?: Relationship[]
): PlaceInfo[] {
  const map = new Map<string, PlaceInfo>();

  const add = (rawName: string | undefined, ind: Individual, event: string, date?: string) => {
    if (!rawName) return;
    const key = rawName.trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, { name: key, individuals: [] });
    map.get(key)!.individuals.push({ ind, event, date });
  };

  // Individuals → birth, death, moves
  for (const ind of individuals) {
    add(ind.birthCity, ind, "Födelse", ind.dateOfBirth);
    add(ind.deathCity, ind, "Död", ind.dateOfDeath);

    if (Array.isArray(ind.moves)) {
      for (const m of ind.moves) {
        add(m.city, ind, "Flytt", m.date);
      }
    }
  }

  // Relationships → weddings (preferred source)
  if (Array.isArray(relationships) && relationships.length) {
    for (const r of relationships) {
      if (r.type !== "spouse") continue;
      // weddingCity/Date are optional in your schema
      if (r.weddingCity) {
        // We don't know which spouse to display on the row — show both as separate rows for richer result sets.
        const p1 = individuals.find((i) => i.id === r.person1Id);
        const p2 = individuals.find((i) => i.id === r.person2Id);
        if (p1) add(r.weddingCity, p1, "Vigsel", r.weddingDate);
        if (p2) add(r.weddingCity, p2, "Vigsel", r.weddingDate);
      }
    }
  }

  // Sort each place's events by date, then sort places by name (Swedish collation)
  for (const info of map.values()) {
    info.individuals.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

/**
 * Given the full places index and a selected base name,
 * return the list of related PlaceInfo entries to merge for display:
 *  - If base is plain (no trailing digits, no '?'): include exact, the '?' variant, and numbered siblings (e.g., "Brändön 1", "Brändön 5").
 *  - If base ends with digits or '?': include only the exact match.
 *
 * This matches your current UI logic in PlacesPage.  [oai_citation:2‡digest.txt](sediment://file_000000005bcc622f94c9150d9b50edd3)
 */
export function expandRelatedPlaces(places: PlaceInfo[], baseName: string): PlaceInfo[] {
  const isNumbered = /\d+$/.test(baseName);
  const endsWithQuestion = baseName.endsWith("?");

  if (!isNumbered && !endsWithQuestion) {
    // exact + uncertain + numbered variants
    return places.filter(
      (p) =>
        p.name === baseName ||
        p.name === `${baseName}?` ||
        p.name.startsWith(`${baseName} `) // "Brändön 1"
    );
  }

  // numbered or uncertain → exact only
  return places.filter((p) => p.name === baseName);
}