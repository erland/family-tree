import { Individual } from "../../domain";
import { Relationship } from "../../domain";

import { fullName } from "../../domain/utils/nameUtils";
import {
  formatAge as calculateAgeAtEvent,
  parseISO as parseDate, // NOTE: still imported here if you need it later
} from "../../domain/utils/dateUtils";

import {
  LifeEvent,
  ParentChildRel,
} from "./types";

import {
  isParentChildRel,
  isSpouseRel,
} from "./relationshipHelpers";

import {
  relationName,
  findAncestorsWithPath,
} from "./kinship";

type Ctx = {
  individual: Individual;
  relationships: Relationship[];
  allIndividuals: Individual[];
};

/**
 * 1. Events about the individual themself (birth, death)
 */
export function buildSelfEvents(ctx: Ctx): LifeEvent[] {
  const { individual } = ctx;
  const events: LifeEvent[] = [];

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
      ageAtEvent: calculateAgeAtEvent(
        individual.dateOfBirth,
        individual.dateOfDeath
      ),
      location: {
        region: individual.deathRegion,
        city: individual.deathCity,
        congregation: individual.deathCongregation,
      },
    });
  }

  return events;
}

/**
 * 2. Marriage + spouse death
 */
export function buildMarriageAndSpouseEvents(ctx: Ctx): LifeEvent[] {
  const { individual, relationships, allIndividuals } = ctx;
  const events: LifeEvent[] = [];

  relationships.filter(isSpouseRel).forEach((rel) => {
    const { person1Id, person2Id, weddingDate } = rel;
    if (person1Id !== individual.id && person2Id !== individual.id) return;

    const spouseId = person1Id === individual.id ? person2Id : person1Id;
    const spouse = allIndividuals.find((i) => i.id === spouseId);

    // Marriage
    events.push({
      type: "marriage",
      date: weddingDate,
      label: spouse ? `Gift med ${fullName(spouse)}` : "Gift",
      individual,
      relatedIndividuals: spouse ? [spouse] : [],
      ageAtEvent: calculateAgeAtEvent(
        individual.dateOfBirth,
        weddingDate
      ),
      location: {
        region: rel.weddingRegion,
        city: rel.weddingCity,
        congregation: rel.weddingCongregation,
      },
    });

    // Spouse death
    if (spouse?.dateOfDeath) {
      const spouseAge = calculateAgeAtEvent(
        spouse.dateOfBirth,
        spouse.dateOfDeath
      );

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
        ageAtEvent: calculateAgeAtEvent(
          individual.dateOfBirth,
          spouse.dateOfDeath
        ),
        location: {
          region: spouse.deathRegion,
          city: spouse.deathCity,
          congregation: spouse.deathCongregation,
        },
      });
    }
  });

  return events;
}

/**
 * Shared helper for parent/child style relations
 * (used for children and grandchildren builders)
 */
function getChildrenOf(
  parentId: string,
  relationships: Relationship[],
  allIndividuals: Individual[]
): Individual[] {
  return relationships
    .filter(
      (r): r is ParentChildRel =>
        isParentChildRel(r) && r.parentIds.includes(parentId)
    )
    .map((rel) => allIndividuals.find((i) => i.id === rel.childId))
    .filter((c): c is Individual => !!c);
}

/**
 * 3. Child birth/death events
 */
export function buildChildEvents(ctx: Ctx): LifeEvent[] {
  const { individual, relationships, allIndividuals } = ctx;
  const events: LifeEvent[] = [];

  const children = getChildrenOf(
    individual.id,
    relationships,
    allIndividuals
  );

  children.forEach((child) => {
    const genderLabel =
      child.gender === "male"
        ? "son"
        : child.gender === "female"
        ? "dotter"
        : "barn";

    // Find the co-parent (other parent)
    const parentRel = relationships.find(
      (r): r is ParentChildRel =>
        isParentChildRel(r) && r.childId === child.id
    );
    const otherParentId = parentRel?.parentIds.find(
      (pid) => pid !== individual.id
    );
    const otherParent = allIndividuals.find(
      (i) => i.id === otherParentId
    );

    const related: Individual[] = [child];
    if (otherParent) related.push(otherParent);

    // child's birth
    events.push({
      type: "childBirth",
      date: child.dateOfBirth,
      label: `Ny ${genderLabel} ${fullName(child)}`,
      individual,
      relatedIndividuals: related,
      ageAtEvent: calculateAgeAtEvent(
        individual.dateOfBirth,
        child.dateOfBirth
      ),
      location: {
        region: child.birthRegion,
        city: child.birthCity,
        congregation: child.birthCongregation,
      },
    });

    // child's death
    if (child.dateOfDeath) {
      events.push({
        type: "childDeath",
        date: child.dateOfDeath,
        label: `Avliden ${genderLabel} ${fullName(
          child
        )} ${calculateAgeAtEvent(
          child.dateOfBirth,
          child.dateOfDeath
        )}`,
        individual,
        relatedIndividuals: related,
        ageAtEvent: calculateAgeAtEvent(
          individual.dateOfBirth,
          child.dateOfDeath
        ),
        location: {
          region: child.deathRegion,
          city: child.deathCity,
          congregation: child.deathCongregation,
        },
      });
    }
  });

  return events;
}

/**
 * 4. Grandchild birth/death events
 */
export function buildGrandchildEvents(ctx: Ctx): LifeEvent[] {
  const { individual, relationships, allIndividuals } = ctx;
  const events: LifeEvent[] = [];

  const children = getChildrenOf(
    individual.id,
    relationships,
    allIndividuals
  );

  children.forEach((child) => {
    // grandchildren = children of each child
    const grandchildRels = relationships.filter(
      (r): r is ParentChildRel =>
        isParentChildRel(r) && r.parentIds.includes(child.id)
    );

    grandchildRels.forEach((rel) => {
      const grandchild = allIndividuals.find(
        (i) => i.id === rel.childId
      );
      if (!grandchild) return;

      const parentRel = relationships.find(
        (r): r is ParentChildRel =>
          isParentChildRel(r) && r.childId === grandchild.id
      );
      const parentIndividuals =
        parentRel?.parentIds
          .map((pid) =>
            allIndividuals.find((i) => i.id === pid)
          )
          .filter((p): p is Individual => !!p) ?? [];

      const related: Individual[] = [
        grandchild,
        ...parentIndividuals,
      ];

      // grandchild birth
      events.push({
        type: "grandchildBirth",
        date: grandchild.dateOfBirth,
        label: `Nytt barnbarn ${fullName(grandchild)}`,
        individual,
        relatedIndividuals: related,
        ageAtEvent: calculateAgeAtEvent(
          individual.dateOfBirth,
          grandchild.dateOfBirth
        ),
        location: {
          region: grandchild.birthRegion,
          city: grandchild.birthCity,
          congregation: grandchild.birthCongregation,
        },
      });

      // grandchild death
      if (grandchild.dateOfDeath) {
        events.push({
          type: "grandchildDeath",
          date: grandchild.dateOfDeath,
          label: `Avlidet barnbarn ${fullName(
            grandchild
          )} ${calculateAgeAtEvent(
            grandchild.dateOfBirth,
            grandchild.dateOfDeath
          )}`,
          individual,
          relatedIndividuals: related,
          ageAtEvent: calculateAgeAtEvent(
            individual.dateOfBirth,
            grandchild.dateOfDeath
          ),
          location: {
            region: grandchild.deathRegion,
            city: grandchild.deathCity,
            congregation: grandchild.deathCongregation,
          },
        });
      }
    });
  });

  return events;
}

/**
 * 5. Ancestor birth/death events
 */
export function buildAncestorEvents(ctx: Ctx): LifeEvent[] {
  const { individual, relationships, allIndividuals } = ctx;
  const events: LifeEvent[] = [];

  const ancestorData = findAncestorsWithPath(
    individual,
    relationships,
    allIndividuals,
    3 // depth
  );

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
      events.push({
        type: "ancestorDeath",
        date: anc.dateOfDeath,
        label: `Avliden ${kinship} ${fullName(
          anc
        )} ${calculateAgeAtEvent(
          anc.dateOfBirth,
          anc.dateOfDeath
        )}`,
        individual,
        relatedIndividuals: [anc],
        ageAtEvent: calculateAgeAtEvent(
          individual.dateOfBirth,
          anc.dateOfDeath
        ),
        location: {
          region: anc.deathRegion,
          city: anc.deathCity,
          congregation: anc.deathCongregation,
        },
      });
    }
  });

  return events;
}

/**
 * 6. Sibling birth/death events
 */
export function buildSiblingEvents(ctx: Ctx): LifeEvent[] {
  const { individual, relationships, allIndividuals } = ctx;
  const events: LifeEvent[] = [];

  // Find this person's parents
  const parentRels = relationships.filter(
    (r): r is ParentChildRel =>
      isParentChildRel(r) && r.childId === individual.id
  );
  const parentIds = parentRels.flatMap((r) => r.parentIds);

  // Find all other children of those same parents
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
      ageAtEvent: calculateAgeAtEvent(
        individual.dateOfBirth,
        sib.dateOfBirth
      ),
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
        label: `Avliden ${genderLabel} ${fullName(
          sib
        )} ${calculateAgeAtEvent(
          sib.dateOfBirth,
          sib.dateOfDeath
        )}`,
        individual,
        relatedIndividuals: [sib],
        ageAtEvent: calculateAgeAtEvent(
          individual.dateOfBirth,
          sib.dateOfDeath
        ),
        location: {
          region: sib.deathRegion,
          city: sib.deathCity,
          congregation: sib.deathCongregation,
        },
      });
    }
  });

  return events;
}

/**
 * 7. Move events
 */
export function buildMoveEvents(ctx: Ctx): LifeEvent[] {
  const { individual } = ctx;
  const events: LifeEvent[] = [];

  if (individual.moves && individual.moves.length) {
    for (const mv of individual.moves) {
      events.push({
        type: "move",
        date: mv.date,
        label: "Flyttade till",
        individual,
        relatedIndividuals: [individual],
        ageAtEvent: calculateAgeAtEvent(
          individual.dateOfBirth,
          mv.date
        ),
        location: {
          region: mv.region,
          city: mv.city,
          congregation: mv.congregation,
        },
      });
    }
  }

  return events;
}

/**
 * Public API – unchanged:
 * build all LifeEvents for one individual.
 */
export function buildLifeEvents(
  individual: Individual,
  relationships: Relationship[],
  allIndividuals: Individual[]
): LifeEvent[] {
  const ctx: Ctx = { individual, relationships, allIndividuals };

  return [
    ...buildSelfEvents(ctx),
    ...buildMarriageAndSpouseEvents(ctx),
    ...buildChildEvents(ctx),
    ...buildGrandchildEvents(ctx),
    ...buildAncestorEvents(ctx),
    ...buildSiblingEvents(ctx),
    ...buildMoveEvents(ctx),
  ];
}