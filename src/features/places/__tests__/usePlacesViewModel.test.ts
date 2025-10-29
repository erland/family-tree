// 1. Mock the Redux selector hook before importing the hook under test
jest.mock("../../../store", () => ({
  useAppSelector: jest.fn(),
}));

// 2. Mock the viewModelBuilders functions that usePlacesViewModel delegates to
jest.mock("@core/viewModelBuilders/places", () => ({
  buildPlacesBaseIndex: jest.fn(),
  buildPlacesList: jest.fn(),
  countTotalEvents: jest.fn(),
  expandPlacesById: jest.fn(),
  // we also need to export the types so TS is happy when importing from the hook
  PlacesSortMode: undefined,
}));

import { renderHook, act } from "@testing-library/react";
import { usePlacesViewModel } from "../usePlacesViewModel";

import {
  buildPlacesBaseIndex,
  buildPlacesList,
  countTotalEvents,
  expandPlacesById,
} from "@core/viewModelBuilders/places";

const mockBuildPlacesBaseIndex = buildPlacesBaseIndex as jest.Mock;
const mockBuildPlacesList = buildPlacesList as jest.Mock;
const mockCountTotalEvents = countTotalEvents as jest.Mock;
const mockExpandPlacesById = expandPlacesById as jest.Mock;

const { useAppSelector } = require("../../../store") as {
  useAppSelector: jest.Mock;
};

describe("usePlacesViewModel (thin hook adapter)", () => {
  const fakeIndividuals = [
    { id: "i1", givenName: "Anna" },
    { id: "i2", givenName: "Bertil" },
  ];
  const fakeRelationships = [
    { id: "rel1", type: "spouse", person1Id: "i1", person2Id: "i2" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Make Redux selectors return our fake slices.
    // We don't need to get fancy here: we just pass a fake store object
    // to the provided selector fn.
    useAppSelector.mockImplementation((selectorFn: any) => {
      const fakeState = {
        individuals: { items: fakeIndividuals },
        relationships: { items: fakeRelationships },
      };
      return selectorFn(fakeState);
    });

    // Default mocked return values for the builder functions
    mockBuildPlacesBaseIndex.mockReturnValue([{ name: "MockPlace" }]);

    mockBuildPlacesList.mockReturnValue([
      {
        id: "MockPlace",
        title: "MockPlace",
        subtitle: "2 personer",
        events: [],
        raw: { foo: "bar" },
      },
    ]);

    mockCountTotalEvents.mockReturnValue(99);

    mockExpandPlacesById.mockImplementation((baseIndexArg: any[], name: string) => {
      return {
        id: name,
        title: name,
        subtitle: "3 händelser",
        events: [{ id: "evt1" }, { id: "evt2" }, { id: "evt3" }],
        raw: baseIndexArg,
      };
    });
  });

  it("builds places, totalEvents, and expandById using builder functions", () => {
    // Act: call hook with explicit options
    const { result } = renderHook(() =>
      usePlacesViewModel({ sort: "alpha", query: "Stock" })
    );

    // Assert: base index was built using data from Redux
    expect(mockBuildPlacesBaseIndex).toHaveBeenCalledWith(
      fakeIndividuals,
      fakeRelationships
    );

    // Assert: buildPlacesList got the base index + query + sort mode
    expect(mockBuildPlacesList).toHaveBeenCalledWith(
      [{ name: "MockPlace" }],
      "Stock",
      "alpha"
    );

    // Assert: countTotalEvents got the same base index
    expect(mockCountTotalEvents).toHaveBeenCalledWith([{ name: "MockPlace" }]);

    // The hook should expose the data the builders returned
    expect(result.current.places).toEqual([
      {
        id: "MockPlace",
        title: "MockPlace",
        subtitle: "2 personer",
        events: [],
        raw: { foo: "bar" },
      },
    ]);

    expect(result.current.totalEvents).toBe(99);
  });

  it("exposes expandById that wraps expandPlacesById with the memoized baseIndex", () => {
    const { result } = renderHook(() => usePlacesViewModel());

    // When calling expandById("Gotham"), it should delegate to expandPlacesById
    // using the same baseIndex that was memoized earlier.
    let expanded;
    act(() => {
      expanded = result.current.expandById("Gotham");
    });

    expect(mockExpandPlacesById).toHaveBeenCalledWith(
      [{ name: "MockPlace" }],
      "Gotham"
    );

    // And we propagate whatever expandPlacesById returns
    expect(expanded).toEqual({
      id: "Gotham",
      title: "Gotham",
      subtitle: "3 händelser",
      events: [{ id: "evt1" }, { id: "evt2" }, { id: "evt3" }],
      raw: [{ name: "MockPlace" }],
    });
  });

  it("defaults options.sort='alpha' and options.query=null if not provided", () => {
    renderHook(() => usePlacesViewModel());

    expect(mockBuildPlacesList).toHaveBeenCalledWith(
      [{ name: "MockPlace" }],
      null,
      "alpha"
    );
  });
});