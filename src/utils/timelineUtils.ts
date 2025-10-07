// src/utils/timelineUtils.ts
import { Individual, Move } from "../types/individual";
import { Relationship } from "../types/relationship";
import { fullName } from "./nameUtils";
import { formatAge as calculateAgeAtEvent, parseISO as parseDate } from "./dateUtils";

export type TimelineEventType =
  | "birth"
  | "death"
  | "marriage"
  | "spouseDeath"
  | "childBirth"
  | "childDeath"
  | "grandchildBirth"
  | "grandchildDeath"
  | "ancestorBirth"
  | "ancestorDeath"
  | "siblingBirth"
  | "siblingDeath"
  | "move"
  | "custom";

export type TimelineEvent = {
  type: TimelineEventType;
  date?: string;
  label: string;
  individual: Individual;
  relatedIndividuals?: Individual[];
  ageAtEvent?: string; // e.g. "3 år", "15 mån"
  location?: {
    region?: string;
    city?: string;
    congregation?: string;
  };
};

export type TimelineBuckets = {
  beforeBirth: TimelineEvent[];
  lifeEvents: TimelineEvent[];
  afterDeath: TimelineEvent[];
  undated: TimelineEvent[];
};

// ---------------- Type Guards ----------------
type SpouseRel = Extract<Relationship, { type: "spouse" }>;
type ParentChildRel = Extract<Relationship, { type: "parent-child" }>;

function isParentChildRel(r: Relationship): r is ParentChildRel {
  return r.type === "parent-child";
}

function isSpouseRel(r: Relationship): r is SpouseRel {
  return r.type === "spouse";
}

export type LocationEvent = {
  id: string;
  kind: "birth" | "move" | "death";
  date?: string;
  label: string;
  note?: string;
};

/**
 * Builds a complete chronological list of all known locations
 * (birth, moves, death) for an individual.
 *
 * Order:
 *   1. Birth
 *   2. Moves with date (chronological)
 *   3. Moves without date
 *   4. Death
 */
export function getAllLocationEvents(individual: Individual): LocationEvent[] {
  const events: LocationEvent[] = [];

  // 1️⃣ Birth
  const birthPlaces = [individual.birthCity, individual.birthRegion, individual.birthCongregation].filter(Boolean);
  if (birthPlaces.length > 0 || individual.dateOfBirth) {
    events.push({
      id: "birth",
      kind: "birth",
      date: individual.dateOfBirth,
      label: `Född i ${birthPlaces.join(", ")}`,
    });
  }

  // 2️⃣ Moves
  if (individual.moves && individual.moves.length > 0) {
    for (const mv of individual.moves) {
      const where = [mv.city, mv.region, mv.congregation].filter(Boolean).join(", ");
      events.push({
        id: mv.id,
        kind: "move",
        date: mv.date,
        label: where ? `Flyttade till ${where}` : "Flyttade",
        note: mv.note,
      });
    }
  }

  // 3️⃣ Death
  const deathPlaces = [individual.deathCity, individual.deathRegion, individual.deathCongregation].filter(Boolean);
  if (deathPlaces.length > 0 || individual.dateOfDeath) {
    events.push({
      id: "death",
      kind: "death",
      date: individual.dateOfDeath,
      label: `Död i ${deathPlaces.join(", ")}`,
    });
  }

  // 4️⃣ Custom sort order
  events.sort((a, b) => {
    // Birth always first
    if (a.kind === "birth" && b.kind !== "birth") return -1;
    if (b.kind === "birth" && a.kind !== "birth") return 1;

    // Death always last
    if (a.kind === "death" && b.kind !== "death") return 1;
    if (b.kind === "death" && a.kind !== "death") return -1;

    // For moves: dated ones before undated, chronological among dated
    const aHasDate = !!a.date;
    const bHasDate = !!b.date;
    if (aHasDate && bHasDate) return a.date!.localeCompare(b.date!);
    if (aHasDate && !bHasDate) return -1;
    if (!aHasDate && bHasDate) return 1;

    return 0;
  });

  return events;
}

// Translate ancestor path to kinship term in Swedish
function relationName(path: string): string {
  if (path.length === 1) {
    return path === "f" ? "far" : "mor";
  }
  if (path.length === 2) {
    if (path === "ff") return "farfar";
    if (path === "fm") return "farmor";
    if (path === "mf") return "morfar";
    if (path === "mm") return "mormor";
  }
  if (path.length === 3) {
    if (path === "fff") return "gammelfarfar";
    if (path === "ffm") return "gammelfarmor";
    if (path === "mff") return "gammelmorfar";
    if (path === "mfm") return "gammelmormor";
    if (path === "mmf") return "gammelmorfar";
    if (path === "mmm") return "gammelmormor";
    if (path === "fmf") return "gammelfarfar";
    if (path === "fmm") return "gammelfarmor";
  }
  return "förfader";
}

function findAncestorsWithPath(
  ind: Individual,
  relationships: Relationship[],
  allIndividuals: Individual[],
  generations: number
): { id: string; path: string }[] {
  const result: { id: string; path: string }[] = [];
  let currentGen: { id: string; path: string }[] = [{ id: ind.id, path: "" }];

  for (let gen = 0; gen < generations; gen++) {
    const nextGen: { id: string; path: string }[] = [];
    for (const { id, path } of currentGen) {
      const parentRels = relationships.filter(
        (r): r is ParentChildRel => isParentChildRel(r) && r.childId === id
      );
      for (const rel of parentRels) {
        rel.parentIds.forEach((pid) => {
          const parent = allIndividuals.find((i) => i.id === pid);
          const step = parent?.gender === "male" ? "f" : "m";
          const newPath = path + step;
          result.push({ id: pid, path: newPath });
          nextGen.push({ id: pid, path: newPath });
        });
      }
    }
    currentGen = nextGen;
  }
  return result;
}

export function buildTimelineEvents(
  individual: Individual,
  relationships: Relationship[],
  allIndividuals: Individual[]
): TimelineBuckets {
  const events: TimelineEvent[] = [];

  // Birth
  events.push({
    type: "birth",
    date: individual.dateOfBirth,
    label: `Födelse av ${fullName(individual)}`,
    individual,
    relatedIndividuals: [individual],
    location: {
      region: individual.birthRegion,
      city: individual.birthCity,
      congregation: individual.birthCongregation,
    },
  });

  // Death
  if (individual.dateOfDeath) {
    events.push({
      type: "death",
      date: individual.dateOfDeath,
      label: `Avliden ${fullName(individual)}`,
      individual,
      relatedIndividuals: [individual],
      ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, individual.dateOfDeath),
      location: {
        region: individual.deathRegion,
        city: individual.deathCity,
        congregation: individual.deathCongregation,
      },
    });
  }

  // Marriages + spouse deaths
  relationships.filter(isSpouseRel).forEach((rel) => {
    const { person1Id, person2Id, weddingDate } = rel;
    if (person1Id === individual.id || person2Id === individual.id) {
      const spouseId = person1Id === individual.id ? person2Id : person1Id;
      const spouse = allIndividuals.find((i) => i.id === spouseId);

      // marriage event
      events.push({
        type: "marriage",
        date: weddingDate,
        label: spouse ? `Gift med ${fullName(spouse)}` : "Gift",
        individual,
        relatedIndividuals: spouse ? [spouse] : [],
        ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, weddingDate),
        location: {
          region: rel.weddingRegion,
          city: rel.weddingCity,
          congregation: rel.weddingCongregation,
        },
      });

      // spouse death event
      if (spouse?.dateOfDeath) {
        const birth = parseDate(individual.dateOfBirth);
        const death = parseDate(individual.dateOfDeath);
        const spouseDeath = parseDate(spouse.dateOfDeath);
        if (birth && spouseDeath) {
          const spouseAge = calculateAgeAtEvent(spouse.dateOfBirth, spouse.dateOfDeath);
          const label =
            spouse.gender === "male"
              ? `Avliden make ${fullName(spouse)} ${spouseAge ?? ""}`
              : spouse.gender === "female"
              ? `Avliden maka ${fullName(spouse)} ${spouseAge ?? ""}`
              : `Avliden partner ${fullName(spouse)} ${spouseAge ?? ""}`;

          events.push({
            type: "spouseDeath",
            date: spouse.dateOfDeath,
            label,
            individual,
            relatedIndividuals: [spouse],
            ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, spouse.dateOfDeath),
            location: {
              region: spouse.deathRegion,
              city: spouse.deathCity,
              congregation: spouse.deathCongregation,
            },
          });
        }
      }
    }
  });

  // Children births & deaths
  const children = relationships
    .filter((r): r is ParentChildRel => isParentChildRel(r) && r.parentIds.includes(individual.id))
    .map((rel) => allIndividuals.find((i) => i.id === rel.childId))
    .filter((c): c is Individual => !!c);

  children.forEach((child) => {
    const genderLabel =
      child.gender === "male" ? "son" : child.gender === "female" ? "dotter" : "barn";

    // Find the other parent
    const parentRel = relationships.find(
      (r): r is ParentChildRel => isParentChildRel(r) && r.childId === child.id
    );
    const otherParentId = parentRel?.parentIds.find((pid) => pid !== individual.id);
    const otherParent = allIndividuals.find((i) => i.id === otherParentId);

    const related: Individual[] = [child];
    if (otherParent) related.push(otherParent);

    events.push({
      type: "childBirth",
      date: child.dateOfBirth,
      label: `Ny ${genderLabel} ${fullName(child)}`,
      individual,
      relatedIndividuals: related,
      ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, child.dateOfBirth),
      location: {
        region: child.birthRegion,
        city: child.birthCity,
        congregation: child.birthCongregation,
      },
    });

    if (child.dateOfDeath) {
      events.push({
        type: "childDeath",
        date: child.dateOfDeath,
        label: `Avliden ${genderLabel} ${fullName(child)} ${calculateAgeAtEvent(
          child.dateOfBirth,
          child.dateOfDeath
        )}`,
        individual,
        relatedIndividuals: related,
        ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, child.dateOfDeath),
        location: {
          region: child.deathRegion,
          city: child.deathCity,
          congregation: child.deathCongregation,
        },
      });
    }
  });

  // Grandchildren births & deaths
  children.forEach((child) => {
    const grandchildRels = relationships.filter(
      (r): r is ParentChildRel => isParentChildRel(r) && r.parentIds.includes(child.id)
    );
    grandchildRels.forEach((rel) => {
      const grandchild = allIndividuals.find((i) => i.id === rel.childId);
      if (!grandchild) return;

      const parentRel = relationships.find(
        (r): r is ParentChildRel => isParentChildRel(r) && r.childId === grandchild.id
      );
      const parentIndividuals =
        parentRel?.parentIds
          .map((pid) => allIndividuals.find((i) => i.id === pid))
          .filter((p): p is Individual => !!p) ?? [];

      const related: Individual[] = [grandchild, ...parentIndividuals];

      events.push({
        type: "grandchildBirth",
        date: grandchild.dateOfBirth,
        label: `Nytt barnbarn ${fullName(grandchild)}`,
        individual,
        relatedIndividuals: related,
        ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, grandchild.dateOfBirth),
        location: {
          region: grandchild.birthRegion,
          city: grandchild.birthCity,
          congregation: grandchild.birthCongregation,
        },
      });

      if (grandchild.dateOfDeath) {
        events.push({
          type: "grandchildDeath",
          date: grandchild.dateOfDeath,
          label: `Avlidet barnbarn ${fullName(grandchild)} ${calculateAgeAtEvent(
            grandchild.dateOfBirth,
            grandchild.dateOfDeath
          )}`,
          individual,
          relatedIndividuals: related,
          ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, grandchild.dateOfDeath),
          location: {
            region: grandchild.deathRegion,
            city: grandchild.deathCity,
            congregation: grandchild.deathCongregation,
          },
        });
      }
    });
  });

  // Ancestor births & deaths
  const ancestorData = findAncestorsWithPath(individual, relationships, allIndividuals, 3);
  ancestorData.forEach(({ id, path }) => {
    const anc = allIndividuals.find((i) => i.id === id);
    if (!anc) return;

    const kinship = relationName(path);

    if (anc.dateOfBirth) {
      events.push({
        type: "ancestorBirth",
        date: anc.dateOfBirth,
        label: `Födelse av ${kinship} ${fullName(anc)}`,
        individual,
        relatedIndividuals: [anc],
        location: {
          region: anc.birthRegion,
          city: anc.birthCity,
          congregation: anc.birthCongregation,
        },
      });
    }

    if (anc.dateOfDeath) {
      const birth = parseDate(individual.dateOfBirth);
      const death = parseDate(individual.dateOfDeath);
      const ancDeath = parseDate(anc.dateOfDeath);
      if (birth && ancDeath) {
        events.push({
          type: "ancestorDeath",
          date: anc.dateOfDeath,
          label: `Avliden ${kinship} ${fullName(anc)} ${calculateAgeAtEvent(
            anc.dateOfBirth,
            anc.dateOfDeath
          )}`,
          individual,
          relatedIndividuals: [anc],
          ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, anc.dateOfDeath),
          location: {
            region: anc.deathRegion,
            city: anc.deathCity,
            congregation: anc.deathCongregation,
          },
        });
      }
    }
  });

  // Sibling events
  const parentRels = relationships.filter(
    (r): r is ParentChildRel => isParentChildRel(r) && r.childId === individual.id
  );
  const parentIds = parentRels.flatMap((r) => r.parentIds);
  const siblingRels = relationships.filter(
    (r): r is ParentChildRel =>
      isParentChildRel(r) &&
      r.childId !== individual.id &&
      r.parentIds.some((pid) => parentIds.includes(pid))
  );
  const siblingIds = [...new Set(siblingRels.map((r) => r.childId))];

  siblingIds.forEach((sid) => {
    const sib = allIndividuals.find((i) => i.id === sid);
    if (!sib) return;
    const genderLabel =
      sib.gender === "male" ? "bror" : sib.gender === "female" ? "syster" : "syskon";

    events.push({
      type: "siblingBirth",
      date: sib.dateOfBirth,
      label: `Ny ${genderLabel} ${fullName(sib)}`,
      individual,
      relatedIndividuals: [sib],
      ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, sib.dateOfBirth),
      location: {
        region: sib.birthRegion,
        city: sib.birthCity,
        congregation: sib.birthCongregation,
      },
    });

    if (sib.dateOfDeath) {
      events.push({
        type: "siblingDeath",
        date: sib.dateOfDeath,
        label: `Avliden ${genderLabel} ${fullName(sib)} ${calculateAgeAtEvent(
          sib.dateOfBirth,
          sib.dateOfDeath
        )}`,
        individual,
        relatedIndividuals: [sib],
        ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, sib.dateOfDeath),
        location: {
          region: sib.deathRegion,
          city: sib.deathCity,
          congregation: sib.deathCongregation,
        },
      });
    }
  });

  // Add "Flyttade ..." events from individual.moves
  if (individual.moves && individual.moves.length) {
    for (const mv of individual.moves) {
      events.push({
        type: "move",
        date: mv.date,
        label: "Flyttade till",
        individual,
        relatedIndividuals: [individual],
        ageAtEvent: calculateAgeAtEvent(individual.dateOfBirth, mv.date),
        location: {
          region: mv.region,
          city: mv.city,
          congregation: mv.congregation,
        },
      });
    }
  }

  // Split into buckets
  const beforeBirth: TimelineEvent[] = [];
  const lifeEvents: TimelineEvent[] = [];
  const afterDeath: TimelineEvent[] = [];
  const undated: TimelineEvent[] = [];

  const birth = parseDate(individual.dateOfBirth);
  const death = parseDate(individual.dateOfDeath);

  for (const ev of events) {
    const d = parseDate(ev.date);
    if (!d) {
      undated.push(ev);
    } else if (birth && d < birth) {
      beforeBirth.push(ev);
    } else if (death && d > death) {
      afterDeath.push(ev);
    } else {
      lifeEvents.push(ev);
    }
  }

  const sortByDate = (a: TimelineEvent, b: TimelineEvent) =>
    (a.date || "").localeCompare(b.date || "");
  beforeBirth.sort(sortByDate);
  lifeEvents.sort(sortByDate);
  afterDeath.sort(sortByDate);

  return { beforeBirth, lifeEvents, afterDeath, undated };
}