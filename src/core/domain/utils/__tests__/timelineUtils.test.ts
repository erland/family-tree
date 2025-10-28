// src/utils/__tests__/timelineUtils.test.ts
import { buildTimelineEvents, getAllLocationEvents } from "..//timelineUtils";
import type { Individual } from "../../types/individual";
import type { Relationship } from "../../types/relationship";

// Minimal helper
const makeInd = (id: string, givenName: string, gender?: string, birth?: string, death?: string): Individual => ({
  id,
  givenName,
  gender,
  dateOfBirth: birth,
  dateOfDeath: death,
});

describe("getAllLocationEvents", () => {
  it("returns only birth and death when no moves", () => {
    const anna = makeInd("a", "Anna", "1800-01-01", "1880-01-01");
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
    const ind = makeInd("b", "Bertil", "1800-01-01", "1880-01-01");
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
    const ind = makeInd("c", "Cecilia", "1800", "1880");
    ind.birthCity = "Piteå";
    ind.deathCity = "Stockholm";
    ind.moves = [
      { id: "m1", date: "1820", city: "Umeå" },
      { id: "m2", city: "Luleå" }, // no date
    ];

    const events = getAllLocationEvents(ind);
    expect(events.map((e) => e.kind)).toEqual(["birth", "move", "move", "death"]);
    expect(events[1].label).toContain("Umeå"); // dated first
    expect(events[2].label).toContain("Luleå"); // undated before death
  });

  it("handles missing birth and death gracefully", () => {
    const ind = makeInd("d", "David");
    ind.moves = [{ id: "m1", city: "Umeå", region: "Västerbotten" }];

    const events = getAllLocationEvents(ind);
    expect(events.length).toBe(1);
    expect(events[0].label).toContain("Flyttade till Umeå");
  });

  it("includes note text when present", () => {
    const ind = makeInd("e", "Eva", "1800");
    ind.birthCity = "Piteå";
    ind.moves = [{ id: "m1", date: "1820", city: "Umeå", note: "Flyttade för arbete" }];

    const events = getAllLocationEvents(ind);
    const move = events.find((e) => e.kind === "move");
    expect(move?.note).toBe("Flyttade för arbete");
  });

  it("sorts correctly when multiple undated moves", () => {
    const ind = makeInd("f", "Fredrik", "1800", "1880");
    ind.birthCity = "Piteå";
    ind.deathCity = "Stockholm";
    ind.moves = [
      { id: "m1", city: "Kiruna" },
      { id: "m2", city: "Umeå" },
    ];

    const events = getAllLocationEvents(ind);
    // Still: birth first, then both moves (any order since both undated), then death
    expect(events[0].kind).toBe("birth");
    expect(events[events.length - 1].kind).toBe("death");
    expect(events.filter((e) => e.kind === "move").length).toBe(2);
  });
});

describe("timelineUtils", () => {
  const alice = makeInd("a", "Alice", "female", "1980-01-01", "2020-01-01");
  const bob = makeInd("b", "Bob", "male", "1978-05-05");
  const charlie = makeInd("c", "Charlie", "male", "2000-03-03", "2015-04-04");
  const diana = makeInd("d", "Diana", "female", "2010-04-04", "2015-04-04");
  const erin = makeInd("e", "Erin", "female", "1990-06-06", "2019-06-06");
  const frank = makeInd("f", "Frank", "male", "1950-07-07", "2000-07-07");
  const grace = makeInd("g", "Grace", "female", "1955-08-08");

  const individuals = [alice, bob, charlie, diana, erin, frank, grace];

  const relationships: Relationship[] = [
    { id: "s1", type: "spouse", person1Id: "a", person2Id: "b", weddingDate: "1999-01-01" },
    { id: "pc1", type: "parent-child", parentIds: ["a", "b"], childId: "c" },
    { id: "pc2", type: "parent-child", parentIds: ["c"], childId: "d" }, // grandchild
    { id: "pc3", type: "parent-child", parentIds: ["f", "g"], childId: "a" }, // ancestors
  ];

  it("builds a full set of timeline events", () => {
    const buckets = buildTimelineEvents(alice, relationships, individuals);

    // Birth event
    expect(buckets.lifeEvents.some(e => e.type === "birth")).toBe(true);

    // Death event
    expect(buckets.lifeEvents.some(e => e.type === "death")).toBe(true);

    // Marriage
    expect(buckets.lifeEvents.some(e => e.type === "marriage" && e.label.includes("Gift"))).toBe(true);

    // Spouse death (Erin is spouse with death)
    const spouseRel: Relationship = { id: "s2", type: "spouse", person1Id: "a", person2Id: "e", weddingDate: "2010-01-01" };
    const withErin = buildTimelineEvents(alice, [...relationships, spouseRel], individuals);
    expect(withErin.lifeEvents.some(e => e.type === "spouseDeath")).toBe(true);

    // Child events
    expect(buckets.lifeEvents.some(e => e.type === "childBirth" && e.label.includes("Charlie"))).toBe(true);
    expect(buckets.lifeEvents.some(e => e.type === "childDeath" && e.label.includes("Charlie"))).toBe(true);

    // Grandchild events
    expect(buckets.lifeEvents.some(e => e.type === "grandchildBirth" && e.label.includes("Diana"))).toBe(true);
    expect(buckets.lifeEvents.some(e => e.type === "grandchildDeath" && e.label.includes("Diana"))).toBe(true);

    // Ancestor events (Frank = farfar, Grace = mormor depending on path)
    expect(
      buckets.beforeBirth.some(
        e => e.type === "ancestorBirth" && (e.label.includes("far") || e.label.includes("mor"))
      )
    ).toBe(true);
    expect(buckets.lifeEvents.some(e => e.type === "ancestorDeath" && e.label.includes("Avliden"))).toBe(true);

    // Sibling events (make another child of F+G to trigger sibling)
    const hannah = makeInd("h", "Hannah", "female", "1982-09-09");
    const sibRels: Relationship[] = [...relationships, { id: "pc4", type: "parent-child", parentIds: ["f", "g"], childId: "h" }];
    const sibBuckets = buildTimelineEvents(alice, sibRels, [...individuals, hannah]);
    expect(sibBuckets.lifeEvents.some(e => e.type === "siblingBirth" && e.label.includes("Hannah"))).toBe(true);
  });

  it("puts ancestor death after individual's death into afterDeath bucket", () => {
    const child = makeInd("c1", "Child", "male", "2000-01-01", "2010-01-01");
    const parent = makeInd("p1", "Parent", "male", "1970-01-01", "2020-01-01");
    const rels: Relationship[] = [{ id: "pc1", type: "parent-child", parentIds: ["p1"], childId: "c1" }];
    const res = buildTimelineEvents(child, rels, [child, parent]);

    // By design, ancestor death after child's death should produce an ancestorDeath event
    expect(res.afterDeath.some(e => e.type === "ancestorDeath")).toBe(true);
  });
});

describe("relationName helper (via buildTimelineEvents)", () => {
  const child = makeInd("c", "Child", "male", "2000-01-01");
  const f = makeInd("f", "Father", "male", "1970-01-01");
  const m = makeInd("m", "Mother", "female", "1972-01-01");
  const ff = makeInd("ff", "Farfar", "male", "1950-01-01");
  const fm = makeInd("fm", "Farmor", "female", "1952-01-01");
  const mf = makeInd("mf", "Morfar", "male", "1951-01-01");
  const mm = makeInd("mm", "Mormor", "female", "1953-01-01");

  const all = [child, f, m, ff, fm, mf, mm];
  const rels: Relationship[] = [
    { id: "pc1", type: "parent-child", parentIds: ["f", "m"], childId: "c" },
    { id: "pc2", type: "parent-child", parentIds: ["ff", "fm"], childId: "f" },
    { id: "pc3", type: "parent-child", parentIds: ["mf", "mm"], childId: "m" },
  ];

  it("produces correct Swedish kinship terms for ancestors", () => {
    const events = buildTimelineEvents(child, rels, all);
    const labels = events.beforeBirth.filter(e => e.type === "ancestorBirth").map(e => e.label).join(" ");
    expect(labels).toMatch(/farfar/);
    expect(labels).toMatch(/farmor/);
    expect(labels).toMatch(/morfar/);
    expect(labels).toMatch(/mormor/);
  });
});

describe("relationName edge cases", () => {
  it("handles grandparents kinship terms and fallback", () => {
    const child = makeInd("c", "Child", "male", "2000-01-01");
    const f = makeInd("f", "Father", "male", "1970-01-01");
    const ff = makeInd("ff", "Farfar", "male", "1950-01-01");
    const fm = makeInd("fm", "Farmor", "female", "1951-01-01");
    const m = makeInd("m", "Mother", "female", "1972-01-01");
    const mf = makeInd("mf", "Morfar", "male", "1952-01-01");
    const mm = makeInd("mm", "Mormor", "female", "1953-01-01");


    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["f", "m"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["ff", "fm"], childId: "f" },
      { id: "pc3", type: "parent-child", parentIds: ["mf", "mm"], childId: "m" },
    ];

    const all = [child, f, ff, fm, m, mf, mm];
    const events = buildTimelineEvents(child, rels, all);
    const labels = events.beforeBirth
      .filter(e => e.type === "ancestorBirth")
      .map(e => e.label)
      .join(" ");

    expect(labels).toMatch(/farfar/);
    expect(labels).toMatch(/farmor/);
    expect(labels).toMatch(/morfar/);
    expect(labels).toMatch(/mormor/);
    // fallback
    expect(labels).not.toMatch(/förfader/);
  });
  it("handles great grandparents on fathers side kinship terms and fallback", () => {
    const child = makeInd("c", "Child", "male", "2000-01-01");
    const f = makeInd("f", "Father", "male", "1970-01-01");
    const m = makeInd("m", "Mother", "female", "1972-01-01");
    const ff = makeInd("ff", "Farfar", "male", "1950-01-01");
    const fm = makeInd("fm", "Farmor", "female", "1951-01-01");
    const mf = makeInd("mf", "Morfar", "male", "1952-01-01");
    const mm = makeInd("mm", "Mormor", "female", "1953-01-01");
    const fff = makeInd("fff", "Gammelfarfar", "male", "1930-01-01");
    const mmf = makeInd("mmf", "Gammelmorfar", "male", "1930-01-01");
    const ffm = makeInd("ffm", "Gammelfarmor", "female", "1930-01-01");
    const mmm = makeInd("mmm", "Gammelmormor", "female", "1930-01-01");
    const ffff = makeInd("ffff", "Förfader", "male", "1880-01-01");


    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["f", "m"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["ff", "fm"], childId: "f" },
      { id: "pc3", type: "parent-child", parentIds: ["mf", "mm"], childId: "m" },
      { id: "pc4", type: "parent-child", parentIds: ["fff", "ffm"], childId: "ff" }, 
      { id: "pc5", type: "parent-child", parentIds: ["mmf", "mmm"], childId: "mm" }, 
      { id: "pc6", type: "parent-child", parentIds: ["ffff"], childId: "fff" }, 
    ];

    const all = [child, f, m, ff, mf, mm, fm, mmm, mmf, ffm, fff, ffff];
    const events = buildTimelineEvents(child, rels, all);
    const labels = events.beforeBirth
      .filter(e => e.type === "ancestorBirth")
      .map(e => e.label)
      .join(" ");

    expect(labels).toMatch(/gammelfarfar/);
    expect(labels).toMatch(/gammelfarmor/);
    expect(labels).toMatch(/gammelmorfar/);
    expect(labels).toMatch(/gammelmormor/);
    // fallback
    expect(labels).not.toMatch(/förfader/);
  });
  it("handles great grandparents on mothers side kinship terms", () => {
    const child = makeInd("c", "Child", "male", "2000-01-01");
    const f = makeInd("f", "Father", "male", "1970-01-01");
    const m = makeInd("m", "Mother", "female", "1972-01-01");
    const ff = makeInd("ff", "Farfar", "male", "1950-01-01");
    const fm = makeInd("fm", "Farmor", "female", "1951-01-01");
    const mf = makeInd("mf", "Morfar", "male", "1952-01-01");
    const mm = makeInd("mm", "Mormor", "female", "1953-01-01");
    const fmf = makeInd("fmf", "Gammelfarfar", "male", "1930-01-01");
    const mff = makeInd("mff", "Gammelmorfar", "male", "1930-01-01");
    const fmm = makeInd("fmm", "Gammelfarmor", "female", "1930-01-01");
    const mfm = makeInd("mfm", "Gammelmormor", "female", "1930-01-01");


    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["f", "m"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["fmf", "fmm"], childId: "fm" }, 
      { id: "pc3", type: "parent-child", parentIds: ["mf", "mm"], childId: "m" },
      { id: "pc4", type: "parent-child", parentIds: ["ff", "fm"], childId: "f" },
      { id: "pc5", type: "parent-child", parentIds: ["mff", "mfm"], childId: "mf" }, 
    ];

    const all = [child, f, m, ff, mf, mm, fm, fmm, fmf, mff, mfm];
    const events = buildTimelineEvents(child, rels, all);
    const labels = events.beforeBirth
      .filter(e => e.type === "ancestorBirth")
      .map(e => e.label)
      .join(" ");

    expect(labels).toMatch(/gammelfarfar/);
    expect(labels).toMatch(/gammelfarmor/);
    expect(labels).toMatch(/gammelmorfar/);
    expect(labels).toMatch(/gammelmormor/);
    // fallback
    expect(labels).not.toMatch(/förfader/);
  });

});

describe("undated and sibling edge cases", () => {
  it("puts events without dates into undated bucket", () => {
    const ind = makeInd("x", "Xavier");
    const rels: Relationship[] = [];
    const res = buildTimelineEvents(ind, rels, [ind]);
    expect(res.undated.some(e => e.type === "birth")).toBe(true); // no birth date
  });

  it("handles sibling with no birth date", () => {
    const child = makeInd("c", "Child", "male", "2000-01-01");
    const sib = makeInd("s", "Sibling", "female"); // no birth
    const parent = makeInd("p", "Parent", "male", "1970-01-01");
    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["p"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["p"], childId: "s" },
    ];
    const res = buildTimelineEvents(child, rels, [child, sib, parent]);
    expect(res.undated.some(e => e.type === "siblingBirth")).toBe(true);
  });

  it("produces siblingDeath when sibling has a death date", () => {
    const child = makeInd("c", "Child", "male", "2000-01-01");
    const sib = makeInd("s", "Sibling", "male", "2001-01-01", "2010-01-01");
    const parent = makeInd("p", "Parent", "male", "1970-01-01");
    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["p"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["p"], childId: "s" },
    ];
    const res = buildTimelineEvents(child, rels, [child, sib, parent]);
    expect(res.lifeEvents.some(e => e.type === "siblingDeath")).toBe(true);
  });
});
describe("afterDeath bucket", () => {
  it("places ancestor death that occurs after individual's death into afterDeath array", () => {
    // Child dies young
    const child = makeInd("c", "Child", "male", "2000-01-01", "2010-01-01");
    // Parent dies much later
    const parent = makeInd("p", "Parent", "male", "1970-01-01", "2020-01-01");

    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["p"], childId: "c" }
    ];

    const res = buildTimelineEvents(child, rels, [child, parent]);

    // Ancestor death should not be in lifeEvents, but in afterDeath
    expect(res.afterDeath.some(e => e.type === "ancestorDeath" && e.label.includes("Avliden"))).toBe(true);
    expect(res.lifeEvents.some(e => e.type === "ancestorDeath")).toBe(false);
  });

  it("places child death that occurs after individual's death into afterDeath array", () => {
    // Child dies young
    const child = makeInd("c", "Child", "male", "2000-01-01", "2020-01-01");
    // Parent dies much later
    const parent = makeInd("p", "Parent", "male", "1970-01-01", "2010-01-01");

    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["p"], childId: "c" }
    ];

    const res = buildTimelineEvents(parent, rels, [child, parent]);

    // Ancestor death should not be in lifeEvents, but in afterDeath
    expect(res.afterDeath.some(e => e.type === "childDeath" && e.label.includes("Avliden"))).toBe(true);
    expect(res.lifeEvents.some(e => e.type === "childDeath")).toBe(false);
  });

  it("places grandchild death that occurs after individual's death into afterDeath array", () => {
    // Child dies young
    const child = makeInd("c", "Child", "male", "2000-01-01", "2020-01-01");
    const grandChild = makeInd("gc", "Grand child", "male", "2018-01-01", "2022-01-01");
    // Parent dies much later
    const parent = makeInd("p", "Parent", "male", "1970-01-01", "2010-01-01");

    const rels: Relationship[] = [
      { id: "pc1", type: "parent-child", parentIds: ["p"], childId: "c" },
      { id: "pc2", type: "parent-child", parentIds: ["c"], childId: "gc" }
    ];

    const res = buildTimelineEvents(parent, rels, [child, grandChild, parent]);

    // Ancestor death should not be in lifeEvents, but in afterDeath
    expect(res.afterDeath.some(e => e.type === "grandchildDeath" && e.label.includes("Avlidet"))).toBe(true);
    expect(res.lifeEvents.some(e => e.type === "grandchildDeath")).toBe(false);
  });

  it("places spouse death after individual's death into afterDeath array", () => {
    const person = makeInd("p", "Person", "female", "1980-01-01", "2010-01-01");
    const spouse = makeInd("s", "Spouse", "male", "1980-01-01", "2020-01-01");
    const rels: Relationship[] = [
      { id: "s1", type: "spouse", person1Id: "p", person2Id: "s", weddingDate: "2000-01-01" }
    ];

    const res = buildTimelineEvents(person, rels, [person, spouse]);

    // Since spouse dies after person, spouseDeath event should go to afterDeath
    expect(res.afterDeath.some(e => e.type === "spouseDeath")).toBe(true);
    expect(res.lifeEvents.some(e => e.type === "spouseDeath")).toBe(false);
  });
});