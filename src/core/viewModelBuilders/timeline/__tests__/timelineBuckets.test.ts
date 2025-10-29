import { buildLifeEvents } from "../../personHistory";
import { groupTimelineEvents } from "../groupTimelineEvents";
import type { Individual } from "../../../domain";
import type { Relationship } from "../../../domain";

const makeInd = (
  id: string,
  givenName: string,
  gender?: string,
  birth?: string,
  death?: string
): Individual =>
  ({
    id,
    givenName,
    gender,
    dateOfBirth: birth,
    dateOfDeath: death,
  } as any);

// helper to make tests shorter to read
function bucketFor(
  individual: Individual,
  relationships: Relationship[],
  everyone: Individual[]
) {
  const raw = buildLifeEvents(individual, relationships, everyone);
  return groupTimelineEvents(individual, raw);
}

describe("groupTimelineEvents bucketing", () => {
  it("splits events into beforeBirth / lifeEvents / afterDeath / undated", () => {
    const alice = makeInd("a", "Alice", "female", "1980-01-01", "2020-01-01");
    const bob = makeInd("b", "Bob", "male", "1978-05-05");
    const charlie = makeInd("c", "Charlie", "male", "2000-03-03", "2015-04-04");
    const diana = makeInd("d", "Diana", "female", "2010-04-04", "2015-04-04");
    const erin = makeInd("e", "Erin", "female", "1990-06-06", "2019-06-06");
    const frank = makeInd("f", "Frank", "male", "1950-07-07", "2000-07-07");
    const grace = makeInd("g", "Grace", "female", "1955-08-08");

    const individuals = [alice, bob, charlie, diana, erin, frank, grace];

    const relationships: Relationship[] = [
      {
        id: "s1",
        type: "spouse",
        person1Id: "a",
        person2Id: "b",
        weddingDate: "1999-01-01",
      },
      {
        id: "pc1",
        type: "parent-child",
        parentIds: ["a", "b"],
        childId: "c",
      },
      {
        id: "pc2",
        type: "parent-child",
        parentIds: ["c"],
        childId: "d", // grandchild
      },
      {
        id: "pc3",
        type: "parent-child",
        parentIds: ["f", "g"],
        childId: "a", // ancestors
      },
    ];

    const buckets = bucketFor(alice, relationships, individuals);

    // birth in lifeEvents
    expect(buckets.lifeEvents.some((e) => e.type === "birth")).toBe(true);

    // death in lifeEvents (not afterDeath)
    expect(buckets.lifeEvents.some((e) => e.type === "death")).toBe(true);
    expect(buckets.afterDeath.some((e) => e.type === "death")).toBe(false);

    // marriage
    expect(
      buckets.lifeEvents.some(
        (e) =>
          e.type === "marriage" &&
          (e.label.includes("Gift med") || e.label.includes("Gift"))
      )
    ).toBe(true);

    // spouse death: check both possibilities via new relationships
    const spouseRel: Relationship = {
      id: "s2",
      type: "spouse",
      person1Id: "a",
      person2Id: "e",
      weddingDate: "2010-01-01",
    };
    const bucketsWithErin = bucketFor(
      alice,
      [...relationships, spouseRel],
      individuals
    );
    expect(
      bucketsWithErin.lifeEvents.some((e) => e.type === "spouseDeath") ||
        bucketsWithErin.afterDeath.some((e) => e.type === "spouseDeath")
    ).toBe(true);

    // child events
    expect(
      buckets.lifeEvents.some(
        (e) => e.type === "childBirth" && e.label.includes("Charlie")
      )
    ).toBe(true);
    expect(
      buckets.lifeEvents.some(
        (e) => e.type === "childDeath" && e.label.includes("Charlie")
      )
    ).toBe(true);

    // grandchild events
    expect(
      buckets.lifeEvents.some(
        (e) => e.type === "grandchildBirth" && e.label.includes("Diana")
      )
    ).toBe(true);
    expect(
      buckets.lifeEvents.some(
        (e) => e.type === "grandchildDeath" && e.label.includes("Diana")
      )
    ).toBe(true);

    // ancestor birth goes to beforeBirth
    expect(
      buckets.beforeBirth.some(
        (e) =>
          e.type === "ancestorBirth" &&
          (e.label.includes("far") || e.label.includes("mor"))
      )
    ).toBe(true);

    // ancestor death may go in lifeEvents or afterDeath depending on dates
    expect(
      buckets.lifeEvents.some(
        (e) => e.type === "ancestorDeath" && e.label.includes("Avliden")
      ) ||
        buckets.afterDeath.some(
          (e) => e.type === "ancestorDeath" && e.label.includes("Avliden")
        )
    ).toBe(true);
  });

  it("puts events with no date into undated", () => {
    const ind = makeInd("x", "Xavier");
    const buckets = bucketFor(ind, [], [ind]);

    expect(buckets.undated.some((e) => e.type === "birth")).toBe(true);
  });

  it("buckets sibling with no birth date into undated", () => {
    const child = makeInd("c", "Child", "male", "2000-01-01");
    const sib = makeInd("s", "Sibling", "female"); // no birth
    const parent = makeInd("p", "Parent", "male", "1970-01-01");

    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["p"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["p"], childId: "s" },
    ];

    const buckets = bucketFor(child, rels, [child, sib, parent]);

    expect(
      buckets.undated.some((e) => e.type === "siblingBirth")
    ).toBe(true);
  });

  it("places ancestor death after individual's death into afterDeath", () => {
    const child = makeInd(
      "c1",
      "Child",
      "male",
      "2000-01-01",
      "2010-01-01"
    );
    const parent = makeInd(
      "p1",
      "Parent",
      "male",
      "1970-01-01",
      "2020-01-01"
    );

    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["p1"], childId: "c1" },
    ];

    const buckets = bucketFor(child, rels, [child, parent]);

    expect(
      buckets.afterDeath.some(
        (e) => e.type === "ancestorDeath" && e.label.includes("Avliden")
      )
    ).toBe(true);

    expect(
      buckets.lifeEvents.some((e) => e.type === "ancestorDeath")
    ).toBe(false);
  });

  it("puts child/grandchild/spouse deaths after the person's own death into afterDeath only", () => {
    // parent dies 2010
    const parent = makeInd("p", "Parent", "male", "1970-01-01", "2010-01-01");
    // child dies 2020 (after parent)
    const child = makeInd("c", "Child", "male", "2000-01-01", "2020-01-01");
    // grandchild dies 2022 (after parent)
    const grandChild = makeInd(
      "gc",
      "Grand child",
      "male",
      "2018-01-01",
      "2022-01-01"
    );
    // spouse dies 2025 (after parent)
    const spouse = makeInd(
      "s",
      "Spouse",
      "female",
      "1980-01-01",
      "2025-01-01"
    );

    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["p"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["c"], childId: "gc" },
      {
        id: "sp1",
        type: "spouse",
        person1Id: "p",
        person2Id: "s",
        weddingDate: "2000-01-01",
      },
    ];

    const buckets = bucketFor(parent, rels, [
      parent,
      child,
      grandChild,
      spouse,
    ]);

    // afterDeath should contain childDeath / grandchildDeath / spouseDeath
    expect(
      buckets.afterDeath.some(
        (e) => e.type === "childDeath" && e.label.includes("Avliden")
      )
    ).toBe(true);

    expect(
      buckets.afterDeath.some(
        (e) => e.type === "grandchildDeath" && e.label.includes("Avlidet")
      )
    ).toBe(true);

    expect(
      buckets.afterDeath.some((e) => e.type === "spouseDeath")
    ).toBe(true);

    // and these shouldn't still appear in lifeEvents
    expect(
      buckets.lifeEvents.some((e) => e.type === "childDeath")
    ).toBe(false);
    expect(
      buckets.lifeEvents.some((e) => e.type === "grandchildDeath")
    ).toBe(false);
    expect(
      buckets.lifeEvents.some((e) => e.type === "spouseDeath")
    ).toBe(false);
  });
});