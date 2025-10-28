import { buildTimelineViewModel } from "../timeline";
import { buildTimelineEvents } from "@core/domain";
import type { Individual, Relationship } from "@core/domain";

// Mock the @core/domain module so we control buildTimelineEvents behavior
jest.mock("@core/domain", () => {
  return {
    buildTimelineEvents: jest.fn(),
  };
});

describe("buildTimelineViewModel", () => {
  const makeIndividual = (id: string, givenName = "Test"): Individual => ({
    id,
    givenName,
    // minimally valid shape; other fields optional in IndividualSchema
  } as any);

  const makeSpouseRel = (id: string, person1Id: string, person2Id: string): Relationship => ({
    id,
    type: "spouse",
    person1Id,
    person2Id,
  } as any);

  const makeParentChildRel = (
    id: string,
    parents: string[],
    childId: string
  ): Relationship => ({
    id,
    type: "parent-child",
    parentIds: parents,
    childId,
  } as any);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("returns empty groups and null selected when no selectedId is provided", () => {
    const individuals: Individual[] = [
      makeIndividual("p1", "Alice"),
      makeIndividual("p2", "Bob"),
    ];

    const relationships: Relationship[] = [
      makeSpouseRel("r1", "p1", "p2"),
      makeParentChildRel("r2", ["p1", "p2"], "c1"),
    ];

    // We expect that when there's no selectedId,
    // buildTimelineEvents should NOT even be called.
    const vm = buildTimelineViewModel(individuals, relationships, null);

    expect(buildTimelineEvents).not.toHaveBeenCalled();

    // selected should be null
    expect(vm.selected).toBeNull();

    // individuals / relationships should be passed through
    expect(vm.individuals).toBe(individuals);
    expect(vm.relationships).toBe(relationships);

    // groups should exist and be empty buckets
    expect(vm.groups).toBeDefined();
    expect(vm.groups.beforeBirth).toEqual([]);
    expect(vm.groups.lifeEvents).toEqual([]);
    expect(vm.groups.afterDeath).toEqual([]);
    expect(vm.groups.undated).toEqual([]);

    // also flattened onto root (backwards compatibility)
    expect(vm.beforeBirth).toBe(vm.groups.beforeBirth);
    expect(vm.lifeEvents).toBe(vm.groups.lifeEvents);
    expect(vm.afterDeath).toBe(vm.groups.afterDeath);
    expect(vm.undated).toBe(vm.groups.undated);
  });

  test("returns populated groups and selected individual when selectedId matches", () => {
    const alice = makeIndividual("p1", "Alice");
    const bob = makeIndividual("p2", "Bob");

    const individuals: Individual[] = [alice, bob];

    const relationships: Relationship[] = [
      makeSpouseRel("r1", "p1", "p2"),
    ];

    // Stub timeline groups that buildTimelineEvents should return
    const stubGroups = {
      beforeBirth: [{ type: "ancestorBirth", label: "Ancestor born" }],
      lifeEvents: [{ type: "birth", label: "Alice was born" }],
      afterDeath: [{ type: "afterDeathExample", label: "Legacy" }],
      undated: [{ type: "custom", label: "Some note" }],
    };

    // Make our mock implementation return those groups
    (buildTimelineEvents as jest.Mock).mockReturnValue(stubGroups);

    const vm = buildTimelineViewModel(individuals, relationships, "p1");

    // Verify buildTimelineEvents was called correctly:
    // - first arg: the selected individual object (alice)
    // - second arg: relationships from state
    // - third arg: all individuals
    expect(buildTimelineEvents).toHaveBeenCalledTimes(1);
    expect(buildTimelineEvents).toHaveBeenCalledWith(
      alice,
      relationships,
      individuals
    );

    // selected should be Alice
    expect(vm.selected).toBe(alice);

    // individuals / relationships should be passed through
    expect(vm.individuals).toBe(individuals);
    expect(vm.relationships).toBe(relationships);

    // groups should match stubGroups exactly
    expect(vm.groups).toBe(stubGroups);

    // top-level shortcuts should reference the same arrays
    expect(vm.beforeBirth).toBe(stubGroups.beforeBirth);
    expect(vm.lifeEvents).toBe(stubGroups.lifeEvents);
    expect(vm.afterDeath).toBe(stubGroups.afterDeath);
    expect(vm.undated).toBe(stubGroups.undated);
  });
});