// --- Mocks must come first ---

// Mock the store selector to feed individuals/relationships
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
}));

// We'll create jest.fn() versions of the @core helpers we need.
// Then we'll partially mock @core so the hook uses these instead of the real ones.
const buildPlacesIndexMock = jest.fn();
const expandRelatedPlacesMock = jest.fn();
const fullNameMock = jest.fn(
  (ind: any) => `${ind?.givenName ?? "Förnamn"} ${ind?.familyName ?? "Efternamn"}`
);

// IMPORTANT: mock @core, not ../../utils/places or ../../utils/nameUtils
jest.mock("@core/domain", () => {
  const actual = jest.requireActual("@core/domain");
  return {
    ...actual,
    buildPlacesIndex: buildPlacesIndexMock,
    expandRelatedPlaces: expandRelatedPlacesMock,
    fullName: fullNameMock,
  };
});

// --- Imports ---
import React from "react";
import { renderHook } from "@testing-library/react";
import {
  usePlacesViewModel,
  type PlaceVM,
  type PlaceEventVM,
} from "../usePlacesViewModel";

const useAppSelector = require("../../store").useAppSelector as jest.Mock;

describe("usePlacesViewModel", () => {
  const mockIndividuals = [
    { id: "i1", givenName: "Anna", familyName: "Andersson" },
    { id: "i2", givenName: "Bertil", familyName: "Berg" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Make selectors deterministic
    useAppSelector.mockImplementation((selector: any) => {
      const fakeState = {
        individuals: { items: mockIndividuals },
        relationships: { items: [] },
      };
      return selector(fakeState);
    });

    // default implementations for the core mocks
    buildPlacesIndexMock.mockReset();
    expandRelatedPlacesMock.mockReset();
    fullNameMock.mockReset().mockImplementation(
      (ind: any) => `${ind?.givenName ?? "Förnamn"} ${ind?.familyName ?? "Efternamn"}`
    );

    // default safe values so tests that don't override still work
    buildPlacesIndexMock.mockReturnValue([]);
    expandRelatedPlacesMock.mockReturnValue([]);
  });

  // ---------------------------------------------------------------------
  test("maps and filters places correctly", () => {
    const base = [
      {
        name: "Uppsala, Domkyrko",
        individuals: [
          {
            id: "e1",
            date: "1900-05-01",
            event: "Födelse",
            ind: mockIndividuals[0],
          },
        ],
      },
      {
        name: "Stockholm",
        individuals: [
          {
            id: "e2",
            date: "1920-01-01",
            event: "Flytt",
            ind: mockIndividuals[1],
          },
        ],
      },
    ];

    buildPlacesIndexMock.mockReturnValue(base);

    // --- No query ---
    const { result } = renderHook(() =>
      usePlacesViewModel({ sort: "alpha", query: null })
    );

    expect(result.current.places.map((p: PlaceVM) => p.title)).toEqual([
      "Stockholm",
      "Uppsala, Domkyrko",
    ]);
    expect(result.current.totalEvents).toBe(2);

    // --- Filter by title ---
    buildPlacesIndexMock.mockReturnValue(base);
    const { result: resultStock } = renderHook(() =>
      usePlacesViewModel({ sort: "alpha", query: "Stock" })
    );
    expect(resultStock.current.places.map((p: PlaceVM) => p.title)).toEqual([
      "Stockholm",
    ]);

    // --- Filter by person name ---
    buildPlacesIndexMock.mockReturnValue(base);
    const { result: resultAnna } = renderHook(() =>
      usePlacesViewModel({ sort: "alpha", query: "Anna" })
    );
    expect(
      resultAnna.current.places.map((p: PlaceVM) => p.title)
    ).toContain("Uppsala, Domkyrko");
  });

  // ---------------------------------------------------------------------
  test("sorts by events count (desc)", () => {
    const base = [
      {
        name: "Fewville",
        individuals: [
          {
            id: "e1",
            date: "1900-01-01",
            event: "Födelse",
            ind: mockIndividuals[0],
          },
        ],
      },
      {
        name: "Manytown",
        individuals: [
          {
            id: "e2",
            date: "1901-01-01",
            event: "Födelse",
            ind: mockIndividuals[1],
          },
          {
            id: "e3",
            date: "1902-01-01",
            event: "Flytt",
            ind: mockIndividuals[1],
          },
          {
            id: "e4",
            date: "1903-01-01",
            event: "Död",
            ind: mockIndividuals[1],
          },
        ],
      },
    ];

    buildPlacesIndexMock.mockReturnValue(base);

    const { result } = renderHook(() =>
      usePlacesViewModel({ sort: "events-desc", query: null })
    );

    expect(result.current.places.map((p: PlaceVM) => p.title)).toEqual([
      "Manytown",
      "Fewville",
    ]);
  });

  test("sorts by events count (asc)", () => {
    const base = [
      { name: "X", individuals: new Array(3).fill({}) },
      { name: "Y", individuals: [{}] },
    ];

    buildPlacesIndexMock.mockReturnValue(base);

    const { result } = renderHook(() =>
      usePlacesViewModel({ sort: "events-asc", query: null })
    );

    expect(result.current.places.map((p: PlaceVM) => p.title)).toEqual([
      "Y",
      "X",
    ]);
  });

  // ---------------------------------------------------------------------
  test("expands and merges related places correctly", () => {
    const base = [
      {
        name: "Base",
        individuals: [
          {
            id: "e1",
            date: "1910-05-02",
            event: "Födelse",
            ind: mockIndividuals[0],
          },
        ],
      },
      { name: "Other", individuals: [] },
    ];

    buildPlacesIndexMock.mockReturnValue(base);

    expandRelatedPlacesMock.mockReturnValue([
      base[0],
      {
        name: "Base (variant)",
        individuals: [
          {
            id: "e3",
            date: "1909-03-10",
            event: "Flytt",
            ind: mockIndividuals[0],
          },
        ],
      },
    ]);

    const { result } = renderHook(() => usePlacesViewModel());
    const expanded = result.current.expandById("Base");

    expect(expandRelatedPlacesMock).toHaveBeenCalledWith(base, "Base");
    expect(expanded).not.toBeNull();
    expect(
      expanded!.events.map((e: PlaceEventVM) => e.id).sort()
    ).toEqual(["e1", "e3"]);
    expect(expanded!.subtitle).toBe("2 händelser");
    expect(expanded!.title).toBe("Base");
  });

  // ---------------------------------------------------------------------
  test("returns unchanged list when no query filter applied", () => {
    const base = [{ name: "Place A", individuals: [] }];
    buildPlacesIndexMock.mockReturnValue(base);

    const { result } = renderHook(() =>
      usePlacesViewModel({ sort: "alpha", query: null })
    );

    expect(result.current.places).toHaveLength(1);
    expect(result.current.places[0].title).toBe("Place A");
  });

  test("handles empty places gracefully", () => {
    const base = [{ name: "EmptyPlace", individuals: [] }];
    buildPlacesIndexMock.mockReturnValue(base);

    const { result } = renderHook(() => usePlacesViewModel());

    expect(result.current.places[0].events).toEqual([]);
    expect(result.current.places[0].subtitle).toBe("0 personer");
  });

  test("expandById returns null for falsy baseName", () => {
    const { result } = renderHook(() => usePlacesViewModel());
    expect(result.current.expandById("")).toBeNull();
  });
});