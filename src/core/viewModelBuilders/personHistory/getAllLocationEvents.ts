// src/core/viewModelBuilders/personHistory/getAllLocationEvents.ts
import { Individual } from "../../domain";
import { LocationEvent } from "./types";

export function getAllLocationEvents(individual: Individual): LocationEvent[] {
  const events: LocationEvent[] = [];

  // Birth
  const birthPlaces = [
    individual.birthCity,
    individual.birthRegion,
    individual.birthCongregation,
  ].filter(Boolean);
  if (birthPlaces.length > 0 || individual.dateOfBirth) {
    events.push({
      id: "birth",
      kind: "birth",
      date: individual.dateOfBirth,
      label: `Född i ${birthPlaces.join(", ")}`,
    });
  }

  // Moves
  if (individual.moves && individual.moves.length > 0) {
    for (const mv of individual.moves) {
      const where = [mv.city, mv.region, mv.congregation]
        .filter(Boolean)
        .join(", ");
      events.push({
        id: mv.id,
        kind: "move",
        date: mv.date,
        label: where ? `Flyttade till ${where}` : "Flyttade",
        note: mv.note,
      });
    }
  }

  // Death
  const deathPlaces = [
    individual.deathCity,
    individual.deathRegion,
    individual.deathCongregation,
  ].filter(Boolean);
  if (deathPlaces.length > 0 || individual.dateOfDeath) {
    events.push({
      id: "death",
      kind: "death",
      date: individual.dateOfDeath,
      label: `Död i ${deathPlaces.join(", ")}`,
    });
  }

  // Custom sort:
  events.sort((a, b) => {
    // birth first
    if (a.kind === "birth" && b.kind !== "birth") return -1;
    if (b.kind === "birth" && a.kind !== "birth") return 1;

    // death last
    if (a.kind === "death" && b.kind !== "death") return 1;
    if (b.kind === "death" && a.kind !== "death") return -1;

    // dated moves before undated, chronological
    const aHasDate = !!a.date;
    const bHasDate = !!b.date;
    if (aHasDate && bHasDate) return a.date!.localeCompare(b.date!);
    if (aHasDate && !bHasDate) return -1;
    if (!aHasDate && bHasDate) return 1;

    return 0;
  });

  return events;
}