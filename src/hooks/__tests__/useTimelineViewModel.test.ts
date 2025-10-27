// --- Mocks must come first ---

// Mock store selector to feed individuals/relationships
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
}));

/**
 * We'll mock @core because the hook imports buildTimelineEvents from "@core".
 * We use the same hoist-safe "coreMocks" trick as in the other tests.
 */
const coreMocks: {
  buildTimelineEvents?: jest.Mock;
} = {};

jest.mock("@core", () => {
  const actual = jest.requireActual("@core");
  return {
    ...actual,
    buildTimelineEvents: (...args: any[]) =>
      coreMocks.buildTimelineEvents?.(...args),
  };
});

// now attach the concrete mock function (after the factory is defined)
coreMocks.buildTimelineEvents = jest.fn();

// --- Imports ---
import { renderHook } from "@testing-library/react";
import { useTimelineViewModel } from "../useTimelineViewModel";
import type { Individual } from "@core";

const useAppSelector = require("../../store")
  .useAppSelector as jest.Mock;

describe("useTimelineViewModel", () => {
  const individuals: Individual[] = [
    { id: "i1", givenName: "Anna", familyName: "Andersson" } as Individual,
    { id: "i2", givenName: "Bertil", familyName: "Berg" } as Individual,
  ];

  const relationships = [{ id: "r1", parentId: "i2", childId: "i1" }];

  beforeEach(() => {
    jest.clearAllMocks();

    // wire selectors
    useAppSelector.mockImplementation((selector: any) => {
      const selStr = String(selector);
      if (selStr.includes("individuals")) return individuals;
      if (selStr.includes("relationships")) return relationships;
      return [];
    });

    // reset our mock timeline builder for each test
    coreMocks.buildTimelineEvents!.mockReset();
  });

  // ---------------------------------------------------------------------
  test("returns null selected and empty groups when no ID provided", () => {
    const { result } = renderHook(() => useTimelineViewModel(null));

    expect(result.current.selected).toBeNull();
    expect(result.current.groups).toEqual({
      beforeBirth: [],
      lifeEvents: [],
      afterDeath: [],
      undated: [],
    });

    // hook should NOT call buildTimelineEvents if nothing selected
    expect(coreMocks.buildTimelineEvents).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  test("selects correct individual and calls buildTimelineEvents", () => {
    const fakeGroups = {
      beforeBirth: [{ label: "Pre" }],
      lifeEvents: [{ label: "Born" }],
      afterDeath: [],
      undated: [],
    };

    // what buildTimelineEvents should return for this test
    coreMocks.buildTimelineEvents!.mockReturnValue(fakeGroups);

    const { result } = renderHook(() => useTimelineViewModel("i1"));

    // selected person is correct
    expect(result.current.selected?.id).toBe("i1");

    // our mock was called with (selected, relationships, individuals)
    expect(coreMocks.buildTimelineEvents).toHaveBeenCalledWith(
      individuals[0],
      relationships,
      individuals
    );

    // and that same object bubbles out of the hook
    expect(result.current.groups).toBe(fakeGroups);
  });

  // ---------------------------------------------------------------------
  test("returns null selected if ID not found", () => {
    const { result } = renderHook(() =>
      useTimelineViewModel("does-not-exist")
    );

    expect(result.current.selected).toBeNull();
    expect(result.current.groups.beforeBirth).toEqual([]);
    expect(result.current.groups.lifeEvents).toEqual([]);
    expect(result.current.groups.afterDeath).toEqual([]);
    expect(result.current.groups.undated).toEqual([]);

    // still shouldn't try to build timeline
    expect(coreMocks.buildTimelineEvents).not.toHaveBeenCalled();
  });
});