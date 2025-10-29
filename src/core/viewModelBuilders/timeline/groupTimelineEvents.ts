// src/core/viewModelBuilders/timeline/groupTimelineEvents.ts
import { Individual } from "../../domain"; // adjust path
import { parseISO as parseDate } from "../../domain/utils/dateUtils"; // adjust
import { LifeEvent } from "../personHistory/types";
import { TimelineBuckets } from "./types";

export function groupTimelineEvents(
  person: Individual,
  events: LifeEvent[]
): TimelineBuckets {
  const beforeBirth: LifeEvent[] = [];
  const lifeEvents: LifeEvent[] = [];
  const afterDeath: LifeEvent[] = [];
  const undated: LifeEvent[] = [];

  const birthDate = parseDate(person.dateOfBirth);
  const deathDate = parseDate(person.dateOfDeath);

  for (const ev of events) {
    const d = parseDate(ev.date);
    if (!d) {
      undated.push(ev);
      continue;
    }
    if (birthDate && d < birthDate) {
      beforeBirth.push(ev);
    } else if (deathDate && d > deathDate) {
      afterDeath.push(ev);
    } else {
      lifeEvents.push(ev);
    }
  }

  const sortByDate = (a: LifeEvent, b: LifeEvent) =>
    (a.date || "").localeCompare(b.date || "");

  beforeBirth.sort(sortByDate);
  lifeEvents.sort(sortByDate);
  afterDeath.sort(sortByDate);

  return { beforeBirth, lifeEvents, afterDeath, undated };
}