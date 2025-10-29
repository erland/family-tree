// 1. Mock store selector before importing the hook
jest.mock("../../../store", () => ({
  useAppSelector: jest.fn(),
}));

// 2. Mock the pure builder that the hook delegates to
jest.mock("@core/viewModelBuilders/timeline", () => ({
  buildTimelineViewModel: jest.fn(),
}));

import { renderHook } from "@testing-library/react";
import { useTimelineViewModel } from "../useTimelineViewModel";

import { buildTimelineViewModel } from "@core/viewModelBuilders/timeline";
const mockBuildTimelineViewModel = buildTimelineViewModel as jest.Mock;

const { useAppSelector } = require("../../../store") as {
  useAppSelector: jest.Mock;
};

describe("useTimelineViewModel", () => {
  const individuals = [
    { id: "i1", givenName: "Anna" },
    { id: "i2", givenName: "Bertil" },
  ];

  const relationships = [
    { id: "r1", type: "parent-child", parentIds: ["i2"], childId: "i1" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Make the selector return our fake slices.
    // We don't have to be fancy. We'll just detect which slice the selector
    // is trying to read based on its stringified source.
    useAppSelector.mockImplementation((selectorFn: any) => {
      const src = String(selectorFn);
      if (src.includes("individuals")) return individuals;
      if (src.includes("relationships")) return relationships;
      return undefined;
    });
  });

  it("passes store data + selectedId into buildTimelineViewModel and returns its result", () => {
    // Arrange: what our pure builder should pretend to return
    const fakeVM = {
      selected: { id: "i1", givenName: "Anna" },
      groups: {
        beforeBirth: [],
        lifeEvents: [{ label: "Anna was born" }],
        afterDeath: [],
        undated: [],
      },
      // the builder in our code also spreads groups and includes individuals/relationships,
      // but for the purpose of this test we don't actually care about shape fidelity —
      // we just care that the hook returns exactly what the builder gave it.
      whateverElse: 123,
    };

    mockBuildTimelineViewModel.mockReturnValue(fakeVM);

    // Act: render hook with some selectedId
    const { result } = renderHook(() => useTimelineViewModel("i1"));

    // Assert: the hook called the builder with data from redux + the param
    expect(mockBuildTimelineViewModel).toHaveBeenCalledTimes(1);
    expect(mockBuildTimelineViewModel).toHaveBeenCalledWith(
      individuals,
      relationships,
      "i1"
    );

    // And whatever the builder returned is exactly what the hook returns
    expect(result.current).toBe(fakeVM);
  });

  it("still calls builder even if selectedId is null, and returns its result", () => {
    const fakeVM = {
      selected: null,
      groups: {
        beforeBirth: [],
        lifeEvents: [],
        afterDeath: [],
        undated: [],
      },
    };

    mockBuildTimelineViewModel.mockReturnValue(fakeVM);

    const { result } = renderHook(() => useTimelineViewModel(null));

    expect(mockBuildTimelineViewModel).toHaveBeenCalledTimes(1);
    expect(mockBuildTimelineViewModel).toHaveBeenCalledWith(
      individuals,
      relationships,
      null
    );

    expect(result.current).toBe(fakeVM);
  });
});