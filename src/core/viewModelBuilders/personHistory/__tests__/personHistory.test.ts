// src/core/viewModelBuilders/personHistory/__tests__/personHistory.test.ts

import {
  getAllLocationEvents,
  buildLifeEvents,
  // 👇 new granular imports
  buildSelfEvents,
  buildMarriageAndSpouseEvents,
  buildChildEvents,
  buildGrandchildEvents,
  buildAncestorEvents,
  buildSiblingEvents,
  buildMoveEvents,
} from "../index";

import type { Individual } from "../../../domain";
import type { Relationship } from "../../../domain";

// --- test helpers ---

// Minimal helper for Individuals
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

// Tiny helper to build the ctx object each helper expects
const makeCtx = (
  individual: Individual,
  relationships: Relationship[],
  allIndividuals: Individual[]
) => ({
  individual,
  relationships,
  allIndividuals,
});

// ---------------------------------------------------------------------
// getAllLocationEvents
// ---------------------------------------------------------------------
describe("getAllLocationEvents", () => {
  it("returns only birth and death when no moves", () => {
    const anna = makeInd("a", "Anna", "female", "1800-01-01", "1880-01-01");
    anna.birthCity = "Piteå";
    anna.birthRegion = "Norrbotten";
    anna.deathCity = "Luleå";
    anna.deathRegion = "Norrbotten";

    const events = getAllLocationEvents(anna);

    expect(events.map((e) => e.kind)).toEqual(["birth", "death"]);
    expect(events[0].label).toContain("Född i Piteå");
    expect(events[1].label).toContain("Död i Luleå");
  });

  it("sorts moves with date chronologically between birth and death", () => {
    const ind = makeInd("b", "Bertil", "male", "1800-01-01", "1880-01-01");
    ind.birthCity = "Piteå";
    ind.deathCity = "Stockholm";
    ind.moves = [
      { id: "m1", date: "1820-05-01", city: "Umeå", region: "Västerbotten" },
      { id: "m2", date: "1830-05-01", city: "Luleå", region: "Norrbotten" },
    ];

    const events = getAllLocationEvents(ind);
    expect(events.map((e) => e.kind)).toEqual(["birth", "move", "move", "death"]);
    expect(events[1].label).toContain("Umeå");
    expect(events[2].label).toContain("Luleå");
  });

  it("places undated moves after dated ones but before death", () => {
    const ind = makeInd("c", "Cecilia", "female", "1800", "1880");
    ind.birthCity = "Piteå";
    ind.deathCity = "Stockholm";
    ind.moves = [
      { id: "m1", date: "1820", city: "Umeå" },
      { id: "m2", city: "Luleå" }, // no date
    ];

    const events = getAllLocationEvents(ind);
    expect(events.map((e) => e.kind)).toEqual(["birth", "move", "move", "death"]);
    expect(events[1].label).toContain("Umeå"); // dated first
    expect(events[2].label).toContain("Luleå"); // undated next
  });

  it("handles missing birth and death gracefully", () => {
    const ind = makeInd("d", "David");
    ind.moves = [{ id: "m1", city: "Umeå", region: "Västerbotten" }];

    const events = getAllLocationEvents(ind);
    expect(events.length).toBe(1);
    expect(events[0].label).toContain("Flyttade till Umeå");
  });

  it("includes note text when present", () => {
    const ind = makeInd("e", "Eva", "female", "1800");
    ind.birthCity = "Piteå";
    ind.moves = [
      {
        id: "m1",
        date: "1820",
        city: "Umeå",
        note: "Flyttade för arbete",
      },
    ];

    const events = getAllLocationEvents(ind);
    const move = events.find((e) => e.kind === "move");
    expect(move?.note).toBe("Flyttade för arbete");
  });

  it("sorts correctly when multiple undated moves", () => {
    const ind = makeInd("f", "Fredrik", "male", "1800", "1880");
    ind.birthCity = "Piteå";
    ind.deathCity = "Stockholm";
    ind.moves = [
      { id: "m1", city: "Kiruna" },
      { id: "m2", city: "Umeå" },
    ];

    const events = getAllLocationEvents(ind);

    expect(events[0].kind).toBe("birth");
    expect(events[events.length - 1].kind).toBe("death");
    expect(events.filter((e) => e.kind === "move").length).toBe(2);
  });
});

// ---------------------------------------------------------------------
// buildSelfEvents
// ---------------------------------------------------------------------
describe("buildSelfEvents", () => {
  it("emits birth event and (if present) death event", () => {
    const alice = makeInd("a", "Alice", "female", "1980-01-01", "2020-01-01");

    const events = buildSelfEvents(
      makeCtx(alice, [], [alice])
    );

    const birth = events.find((e) => e.type === "birth");
    const death = events.find((e) => e.type === "death");

    expect(birth?.label).toContain("Födelse av Alice");
    expect(death?.label).toContain("Avliden Alice");
  });

  it("still emits birth even if no birth date", () => {
    const noDate = makeInd("x", "Xavier");
    const events = buildSelfEvents(makeCtx(noDate, [], [noDate]));

    expect(events.some((e) => e.type === "birth")).toBe(true);
    expect(events.find((e) => e.type === "birth")?.date).toBeUndefined();
  });
});

// ---------------------------------------------------------------------
// buildMarriageAndSpouseEvents
// ---------------------------------------------------------------------
describe("buildMarriageAndSpouseEvents", () => {
  it("emits marriage and spouseDeath when applicable", () => {
    const alice = makeInd("a", "Alice", "female", "1980-01-01", "2020-01-01");
    const bob = makeInd("b", "Bob", "male", "1978-05-05", "2030-01-01");

    const rels: Relationship[] = [
      {
        id: "s1",
        type: "spouse",
        person1Id: "a",
        person2Id: "b",
        weddingDate: "1999-01-01",
      },
    ];

    const events = buildMarriageAndSpouseEvents(
      makeCtx(alice, rels, [alice, bob])
    );

    expect(events.some((e) => e.type === "marriage")).toBe(true);
    expect(events.some((e) => e.type === "spouseDeath")).toBe(true);

    const marriage = events.find((e) => e.type === "marriage");
    expect(marriage?.label).toMatch(/Gift/);

    const spouseDeath = events.find((e) => e.type === "spouseDeath");
    expect(spouseDeath?.label).toMatch(/Avliden make|Avliden maka|Avliden partner/);
  });

  it("does not emit spouseDeath if spouse is alive", () => {
    const alice = makeInd("a", "Alice", "female", "1980-01-01");
    const bob = makeInd("b", "Bob", "male", "1978-05-05");

    const rels: Relationship[] = [
      {
        id: "s1",
        type: "spouse",
        person1Id: "a",
        person2Id: "b",
        weddingDate: "1999-01-01",
      },
    ];

    const events = buildMarriageAndSpouseEvents(
      makeCtx(alice, rels, [alice, bob])
    );

    expect(events.some((e) => e.type === "marriage")).toBe(true);
    expect(events.some((e) => e.type === "spouseDeath")).toBe(false);
  });
});

// ---------------------------------------------------------------------
// buildChildEvents
// ---------------------------------------------------------------------
describe("buildChildEvents", () => {
  it("emits childBirth and childDeath with correct labels and age", () => {
    const parent = makeInd("p", "Parent", "female", "1970-01-01");
    const child = makeInd("c", "Charlie", "male", "2000-03-03", "2015-04-04");

    const rels: Relationship[] = [
      {
        id: "pc1",
        type: "parent-child",
        parentIds: ["p"],
        childId: "c",
      },
    ];

    const events = buildChildEvents(
      makeCtx(parent, rels, [parent, child])
    );

    expect(events.some((e) => e.type === "childBirth" && e.label.includes("Charlie"))).toBe(true);
    expect(events.some((e) => e.type === "childDeath" && e.label.includes("Charlie"))).toBe(true);
  });
});

// ---------------------------------------------------------------------
// buildGrandchildEvents
// ---------------------------------------------------------------------
describe("buildGrandchildEvents", () => {
  it("emits grandchildBirth and grandchildDeath", () => {
    const grandparent = makeInd("gp", "Grandparent", "female", "1950-01-01");
    const parent = makeInd("p", "Parent", "male", "1970-01-01");
    const grandchild = makeInd(
      "gc",
      "Baby",
      "female",
      "2000-01-01",
      "2005-01-01"
    );

    const rels: Relationship[] = [
      {
        id: "pc1",
        type: "parent-child",
        parentIds: ["gp"],
        childId: "p",
      },
      {
        id: "pc2",
        type: "parent-child",
        parentIds: ["p"],
        childId: "gc",
      },
    ];

    const events = buildGrandchildEvents(
      makeCtx(grandparent, rels, [grandparent, parent, grandchild])
    );

    expect(events.some((e) => e.type === "grandchildBirth" && e.label.includes("Baby"))).toBe(true);
    expect(events.some((e) => e.type === "grandchildDeath" && e.label.includes("Baby"))).toBe(true);
  });
});

// ---------------------------------------------------------------------
// buildAncestorEvents
// ---------------------------------------------------------------------
describe("buildAncestorEvents", () => {
  it("emits ancestorBirth / ancestorDeath using Swedish kinship terms", () => {
    // child -> parents -> grandparents
    const child = makeInd("c", "Child", "male", "2000-01-01");
    const f = makeInd("f", "Father", "male", "1970-01-01");
    const m = makeInd("m", "Mother", "female", "1972-01-01");
    const ff = makeInd("ff", "Farfar", "male", "1950-01-01", "2000-01-01");
    const fm = makeInd("fm", "Farmor", "female", "1952-01-01");
    const mf = makeInd("mf", "Morfar", "male", "1951-01-01");
    const mm = makeInd("mm", "Mormor", "female", "1953-01-01", "2010-01-01");

    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["f", "m"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["ff", "fm"], childId: "f" },
      { id: "pc3", type: "parent-child", parentIds: ["mf", "mm"], childId: "m" },
    ];

    const events = buildAncestorEvents(
      makeCtx(child, rels, [child, f, m, ff, fm, mf, mm])
    );

    const birthLabels = events
      .filter((e) => e.type === "ancestorBirth")
      .map((e) => e.label)
      .join(" ");

    const deathLabels = events
      .filter((e) => e.type === "ancestorDeath")
      .map((e) => e.label)
      .join(" ");

    expect(birthLabels).toMatch(/farfar|farmor|morfar|mormor/);
    expect(deathLabels).toMatch(/Avliden/);
  });
});

// ---------------------------------------------------------------------
// buildSiblingEvents
// ---------------------------------------------------------------------
describe("buildSiblingEvents", () => {
  it("emits siblingBirth and siblingDeath", () => {
    const parent = makeInd("p", "Parent", "male", "1970-01-01");
    const child = makeInd("c", "Child", "male", "2000-01-01");
    const sibAlive = makeInd("s1", "Sis", "female", "2002-01-01");
    const sibDead = makeInd("s2", "Bro", "male", "2001-01-01", "2010-01-01");

    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["p"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["p"], childId: "s1" },
      { id: "pc3", type: "parent-child", parentIds: ["p"], childId: "s2" },
    ];

    const events = buildSiblingEvents(
      makeCtx(child, rels, [parent, child, sibAlive, sibDead])
    );

    expect(events.some((e) => e.type === "siblingBirth" && e.label.includes("Sis"))).toBe(true);
    expect(events.some((e) => e.type === "siblingBirth" && e.label.includes("Bro"))).toBe(true);

    expect(events.some((e) => e.type === "siblingDeath" && e.label.includes("Bro"))).toBe(true);
  });
});

// ---------------------------------------------------------------------
// buildMoveEvents
// ---------------------------------------------------------------------
describe("buildMoveEvents", () => {
  it("emits move events for each recorded move", () => {
    const ind = makeInd("m", "Mover", "male", "1900-01-01");
    ind.moves = [
      { id: "mv1", date: "1920-01-01", city: "Umeå", region: "Västerbotten" },
      { id: "mv2", date: "1930-01-01", city: "Luleå", region: "Norrbotten" },
    ];

    const events = buildMoveEvents(makeCtx(ind, [], [ind]));

    expect(events.filter((e) => e.type === "move").length).toBe(2);
    expect(events[0].label).toBe("Flyttade till");
    expect(events[0].location?.city).toBe("Umeå");
  });
});

// ---------------------------------------------------------------------
// buildLifeEvents (integration)
// ---------------------------------------------------------------------
describe("buildLifeEvents (integration)", () => {
  it("concatenates all sub-event categories", () => {
    const parent = makeInd("p", "Parent", "female", "1970-01-01", "2030-01-01");
    const spouse = makeInd("s", "Spouse", "male", "1975-01-01", "2040-01-01");
    const child = makeInd("c", "Child", "male", "2000-01-01", "2020-01-01");

    const rels: Relationship[] = [
      { id: "sp1", type: "spouse", person1Id: "p", person2Id: "s", weddingDate: "1995-06-06" },
      { id: "pc1", type: "parent-child", parentIds: ["p", "s"], childId: "c" },
    ];

    const lifeEvents = buildLifeEvents(parent, rels, [parent, spouse, child]);

    // smoke check: we should see several different categories represented
    const types = lifeEvents.map((e) => e.type);
    expect(types).toContain("birth");
    expect(types).toContain("marriage");
    expect(types).toContain("childBirth");
    expect(types).toContain("spouseDeath"); // spouse has a death date
    expect(types).toContain("death");       // parent has a death date
  });
});