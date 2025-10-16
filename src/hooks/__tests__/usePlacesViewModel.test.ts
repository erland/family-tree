// --- Mocks must come first ---
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
}));
jest.mock("../../utils/places", () => ({
  buildPlacesIndex: jest.fn(),
  expandRelatedPlaces: jest.fn(),
}));
jest.mock("../../utils/nameUtils", () => ({
  fullName: jest.fn((ind: any) => `${ind.givenName ?? "Förnamn"} ${ind.familyName ?? "Efternamn"}`),
}));

// --- Imports ---
import React from "react";
import { renderHook } from "@testing-library/react";
import { usePlacesViewModel, type PlaceVM, type PlaceEventVM } from "../usePlacesViewModel";

const useAppSelector = require("../../store").useAppSelector as jest.Mock;
const { buildPlacesIndex, expandRelatedPlaces } = require("../../utils/places") as {
  buildPlacesIndex: jest.Mock;
  expandRelatedPlaces: jest.Mock;
};

// --- Shared helpers ---
const mockIndividuals = [
  { id: "i1", givenName: "Anna", familyName: "Andersson" },
  { id: "i2", givenName: "Bertil", familyName: "Berg" },
];

describe("usePlacesViewModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useAppSelector.mockImplementation((selector: any) => {
      const selStr = String(selector);
      if (selStr.includes("individuals")) return mockIndividuals;
      if (selStr.includes("relationships")) return [];
      return [];
    });
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

    buildPlacesIndex.mockReturnValue(base);

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
    buildPlacesIndex.mockReturnValue(base);
    const { result: resultStock } = renderHook(() =>
      usePlacesViewModel({ sort: "alpha", query: "Stock" })
    );
    expect(resultStock.current.places.map((p: PlaceVM) => p.title)).toEqual(["Stockholm"]);

    // --- Filter by person name ---
    buildPlacesIndex.mockReturnValue(base);
    const { result: resultAnna } = renderHook(() =>
      usePlacesViewModel({ sort: "alpha", query: "Anna" })
    );
    expect(resultAnna.current.places.map((p: PlaceVM) => p.title)).toContain("Uppsala, Domkyrko");
  });

  // ---------------------------------------------------------------------
  test("sorts by events count (desc)", () => {
    const base = [
      {
        name: "Fewville",
        individuals: [{ id: "e1", date: "1900-01-01", event: "Födelse", ind: mockIndividuals[0] }],
      },
      {
        name: "Manytown",
        individuals: [
          { id: "e2", date: "1901-01-01", event: "Födelse", ind: mockIndividuals[1] },
          { id: "e3", date: "1902-01-01", event: "Flytt", ind: mockIndividuals[1] },
          { id: "e4", date: "1903-01-01", event: "Död", ind: mockIndividuals[1] },
        ],
      },
    ];

    buildPlacesIndex.mockReturnValue(base);
    const { result } = renderHook(() => usePlacesViewModel({ sort: "events-desc", query: null }));

    expect(result.current.places.map((p: PlaceVM) => p.title)).toEqual(["Manytown", "Fewville"]);
  });

  test("sorts by events count (asc)", () => {
    const base = [
      { name: "X", individuals: new Array(3).fill({}) },
      { name: "Y", individuals: [{}] },
    ];
    buildPlacesIndex.mockReturnValue(base);

    const { result } = renderHook(() => usePlacesViewModel({ sort: "events-asc", query: null }));
    expect(result.current.places.map((p: PlaceVM) => p.title)).toEqual(["Y", "X"]);
  });

  // ---------------------------------------------------------------------
  test("expands and merges related places correctly", () => {
    const base = [
      { name: "Base", individuals: [{ id: "e1", date: "1910-05-02", event: "Födelse", ind: mockIndividuals[0] }] },
      { name: "Other", individuals: [] },
    ];
    buildPlacesIndex.mockReturnValue(base);

    expandRelatedPlaces.mockReturnValue([
      base[0],
      {
        name: "Base (variant)",
        individuals: [{ id: "e3", date: "1909-03-10", event: "Flytt", ind: mockIndividuals[0] }],
      },
    ]);

    const { result } = renderHook(() => usePlacesViewModel());
    const expanded = result.current.expandById("Base");

    expect(expandRelatedPlaces).toHaveBeenCalledWith(base, "Base");
    expect(expanded).not.toBeNull();
    expect(expanded!.events.map((e: PlaceEventVM) => e.id).sort()).toEqual(["e1", "e3"]);
    expect(expanded!.subtitle).toBe("2 händelser");
    expect(expanded!.title).toBe("Base");
  });

  // ---------------------------------------------------------------------
  test("returns unchanged list when no query filter applied", () => {
    const base = [{ name: "Place A", individuals: [] }];
    buildPlacesIndex.mockReturnValue(base);

    const { result } = renderHook(() => usePlacesViewModel({ sort: "alpha", query: null }));
    expect(result.current.places).toHaveLength(1);
  });

  test("handles empty places gracefully", () => {
    const base = [{ name: "EmptyPlace", individuals: [] }];
    buildPlacesIndex.mockReturnValue(base);

    const { result } = renderHook(() => usePlacesViewModel());
    expect(result.current.places[0].events).toEqual([]);
    expect(result.current.places[0].subtitle).toBe("0 personer");
  });

  test("expandById returns null for falsy baseName", () => {
    const { result } = renderHook(() => usePlacesViewModel());
    expect(result.current.expandById("")).toBeNull();
  });
});