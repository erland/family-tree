// --- Mocks must come first ---
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
}));
jest.mock("../../utils/timelineUtils", () => ({
  buildTimelineEvents: jest.fn(),
}));

// --- Imports ---
import { renderHook } from "@testing-library/react";
import { useTimelineViewModel } from "../useTimelineViewModel";
import type { Individual } from "../../types/individual";

const useAppSelector = require("../../store").useAppSelector as jest.Mock;
const { buildTimelineEvents } = require("../../utils/timelineUtils") as {
  buildTimelineEvents: jest.Mock;
};

describe("useTimelineViewModel", () => {
  const individuals: Individual[] = [
    { id: "i1", givenName: "Anna", familyName: "Andersson" } as Individual,
    { id: "i2", givenName: "Bertil", familyName: "Berg" } as Individual,
  ];
  const relationships = [
    { id: "r1", parentId: "i2", childId: "i1" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    useAppSelector.mockImplementation((selector: any) => {
      const selStr = String(selector);
      if (selStr.includes("individuals")) return individuals;
      if (selStr.includes("relationships")) return relationships;
      return [];
    });
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
    expect(buildTimelineEvents).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  test("selects correct individual and calls buildTimelineEvents", () => {
    const fakeGroups = {
      beforeBirth: [{ label: "Pre" }],
      lifeEvents: [{ label: "Born" }],
      afterDeath: [],
      undated: [],
    };
    buildTimelineEvents.mockReturnValue(fakeGroups);

    const { result } = renderHook(() => useTimelineViewModel("i1"));

    expect(result.current.selected?.id).toBe("i1");
    expect(buildTimelineEvents).toHaveBeenCalledWith(
      individuals[0],
      relationships,
      individuals
    );
    expect(result.current.groups).toBe(fakeGroups); // same reference returned
  });

  // ---------------------------------------------------------------------
  test("returns null selected if ID not found", () => {
    const { result } = renderHook(() => useTimelineViewModel("missing-id"));

    expect(result.current.selected).toBeNull();
    expect(result.current.groups.beforeBirth).toEqual([]);
  });
});