import { buildTimelineViewModel } from "../timeline/buildTimelineViewModel";
import { buildLifeEvents } from "@core/viewModelBuilders/personHistory";
import { groupTimelineEvents } from "../timeline/groupTimelineEvents";
import type { Individual, Relationship } from "@core/domain";

// We are now mocking the two collaborators that
// buildTimelineViewModel uses internally.
jest.mock("@core/viewModelBuilders/personHistory", () => {
  return {
    // Only mock the function we care about
    buildLifeEvents: jest.fn(),
  };
});

jest.mock("../timeline/groupTimelineEvents", () => {
  return {
    groupTimelineEvents: jest.fn(),
  };
});

describe("buildTimelineViewModel", () => {
  const makeIndividual = (id: string, givenName = "Test"): Individual => ({
    id,
    givenName,
  } as any);

  const makeSpouseRel = (
    id: string,
    person1Id: string,
    person2Id: string
  ): Relationship =>
    ({
      id,
      type: "spouse",
      person1Id,
      person2Id,
    } as any);

  const makeParentChildRel = (
    id: string,
    parents: string[],
    childId: string
  ): Relationship =>
    ({
      id,
      type: "parent-child",
      parentIds: parents,
      childId,
    } as any);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("returns empty buckets and null selected when no selectedId is provided", () => {
    const individuals: Individual[] = [
      makeIndividual("p1", "Alice"),
      makeIndividual("p2", "Bob"),
    ];

    const relationships: Relationship[] = [
      makeSpouseRel("r1", "p1", "p2"),
      makeParentChildRel("r2", ["p1", "p2"], "c1"),
    ];

    // Call with no selectedId
    const vm = buildTimelineViewModel(individuals, relationships, null);

    // Because no one is selected, we should NOT even try to build events.
    expect(buildLifeEvents).not.toHaveBeenCalled();
    expect(groupTimelineEvents).not.toHaveBeenCalled();

    // New return shape:
    expect(vm.selected).toBeNull();
    expect(vm.beforeBirth).toEqual([]);
    expect(vm.lifeEvents).toEqual([]);
    expect(vm.afterDeath).toEqual([]);
    expect(vm.undated).toEqual([]);

    // We no longer expose vm.groups, vm.individuals, vm.relationships
    expect((vm as any).groups).toBeUndefined();
    expect((vm as any).individuals).toBeUndefined();
    expect((vm as any).relationships).toBeUndefined();
  });

  test("returns buckets from groupTimelineEvents when selectedId matches", () => {
    const alice = makeIndividual("p1", "Alice");
    const bob = makeIndividual("p2", "Bob");

    const individuals: Individual[] = [alice, bob];
    const relationships: Relationship[] = [
      makeSpouseRel("r1", "p1", "p2"),
    ];

    // 1. We stub buildLifeEvents to return the "raw" per-person events array
    const stubRawEvents = [
      { type: "birth", label: "Alice was born", date: "1900-01-01" },
      { type: "marriage", label: "Married Bob", date: "1920-06-06" },
    ];
    (buildLifeEvents as jest.Mock).mockReturnValue(stubRawEvents);

    // 2. We stub groupTimelineEvents to bucket those events into beforeBirth / lifeEvents / etc.
    const stubBuckets = {
      beforeBirth: [{ type: "ancestorBirth", label: "Ancestor born" }],
      lifeEvents: [{ type: "birth", label: "Alice was born" }],
      afterDeath: [{ type: "afterDeathExample", label: "Legacy" }],
      undated: [{ type: "custom", label: "Some note" }],
    };
    (groupTimelineEvents as jest.Mock).mockReturnValue(stubBuckets);

    // Act
    const vm = buildTimelineViewModel(individuals, relationships, "p1");

    // Verify we resolved the selected person correctly
    expect(vm.selected).toBe(alice);

    // Verify buildLifeEvents was called correctly:
    // - individual (alice)
    // - all relationships
    // - all individuals
    expect(buildLifeEvents).toHaveBeenCalledTimes(1);
    expect(buildLifeEvents).toHaveBeenCalledWith(
      alice,
      relationships,
      individuals
    );

    // Verify groupTimelineEvents was called with:
    // - the selected person
    // - the raw events returned from buildLifeEvents
    expect(groupTimelineEvents).toHaveBeenCalledTimes(1);
    expect(groupTimelineEvents).toHaveBeenCalledWith(
      alice,
      stubRawEvents
    );

    // And finally, the view model returns those buckets directly at top level
    expect(vm.beforeBirth).toBe(stubBuckets.beforeBirth);
    expect(vm.lifeEvents).toBe(stubBuckets.lifeEvents);
    expect(vm.afterDeath).toBe(stubBuckets.afterDeath);
    expect(vm.undated).toBe(stubBuckets.undated);

    // It should NOT expose older compatibility props:
    expect((vm as any).groups).toBeUndefined();
    expect((vm as any).individuals).toBeUndefined();
    expect((vm as any).relationships).toBeUndefined();
  });
});