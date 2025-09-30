// src/utils/timelineUtils.ts
import { Individual } from "../types/individual";
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
        (r) => r.type === "parent-child" && r.childId === id
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
  relationships
    .filter((r) => r.type === "spouse")
    .forEach((rel) => {
      const { person1Id, person2Id, weddingDate } = rel as any;
      if (person1Id === individual.id || person2Id === individual.id) {
        const spouseId = person1Id === individual.id ? person2Id : person1Id;
        const spouse = allIndividuals.find((i) => i.id === spouseId);

        // marriage event
        events.push({
          type: "marriage",
          date: weddingDate,
          label: spouse
            ? `Gift med ${fullName(spouse)}`
            : "Gift",
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
          if (birth && spouseDeath && (!death || spouseDeath < death)) {
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
    .filter((r) => r.type === "parent-child" && r.parentIds.includes(individual.id))
    .map((rel) => allIndividuals.find((i) => i.id === rel.childId))
    .filter((c): c is Individual => !!c);

  children.forEach((child) => {
    const genderLabel =
      child.gender === "male"
        ? "son"
        : child.gender === "female"
        ? "dotter"
        : "barn";

    // Find the other parent
    const parentRel = relationships.find(
      (r) => r.type === "parent-child" && r.childId === child.id
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
      (r) => r.type === "parent-child" && r.parentIds.includes(child.id)
    );
    grandchildRels.forEach((rel) => {
      const grandchild = allIndividuals.find((i) => i.id === rel.childId);
      if (!grandchild) return;

      // collect both parents of the grandchild
      const parentRel = relationships.find(
        (r) => r.type === "parent-child" && r.childId === grandchild.id
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

  // Ancestor births & deaths (parents, grandparents, great-grandparents)
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
      if (birth && ancDeath && (!death || ancDeath < death)) {
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
    (r) => r.type === "parent-child" && r.childId === individual.id
  );
  const parentIds = parentRels.flatMap((r) => r.parentIds);
  const siblingRels = relationships.filter(
    (r) =>
      r.type === "parent-child" &&
      r.childId !== individual.id &&
      r.parentIds.some((pid) => parentIds.includes(pid))
  );
  const siblingIds = [...new Set(siblingRels.map((r) => r.childId))];

  siblingIds.forEach((sid) => {
    const sib = allIndividuals.find((i) => i.id === sid);
    if (!sib) return;
    const genderLabel =
      sib.gender === "male"
        ? "bror"
        : sib.gender === "female"
        ? "syster"
        : "syskon";

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

  // Sort
  const sortByDate = (a: TimelineEvent, b: TimelineEvent) =>
    (a.date || "").localeCompare(b.date || "");
  beforeBirth.sort(sortByDate);
  lifeEvents.sort(sortByDate);
  afterDeath.sort(sortByDate);

  return { beforeBirth, lifeEvents, afterDeath, undated };
}