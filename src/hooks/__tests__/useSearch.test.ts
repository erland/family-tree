// --- Mocks must come first ---
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
}));
jest.mock("../../utils/searchIndex", () => ({
  buildSearchEntries: jest.fn(),
  createSearcher: jest.fn(),
}));

// --- Imports ---
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSearch } from "../useSearch";
import type { Individual } from "../../types/individual";

const useAppSelector = require("../../store").useAppSelector as jest.Mock;
const {
  buildSearchEntries,
  createSearcher,
} = require("../../utils/searchIndex") as {
  buildSearchEntries: jest.Mock;
  createSearcher: jest.Mock;
};

describe("useSearch (smoke)", () => {
  const individuals: Individual[] = [
    {
      id: "i1",
      givenName: "John",
      familyName: "Doe",
      birthFamilyName: "Smith",
      birthCity: "Gothenburg",
      deathCity: "Uppsala",
    } as any,
    {
      id: "i2",
      givenName: "Jane",
      familyName: "Roe",
      birthCity: "Malmö",
    } as any,
  ];
  const relationships = [
    {
      id: "r1",
      type: "spouse",
      person1Id: "i1",
      person2Id: "i2",
      weddingCity: "Stockholm",
      weddingRegion: "Stockholms län",
      weddingCongregation: "Klara",
      weddingDate: "1990-05-01",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock selectors like your other tests do
    useAppSelector.mockImplementation((selector: any) => {
      const selStr = String(selector);
      if (selStr.includes("individuals")) return individuals;
      if (selStr.includes("relationships")) return relationships;
      return [];
    });

    // We don’t need real Fuse here—stub the util to be deterministic
    const entries = [
      { id: "i1", givenName: "John", familyName: "Doe" },
      { id: "i2", givenName: "Jane", familyName: "Roe" },
    ];
    buildSearchEntries.mockReturnValue(entries);

    const searchMock = jest.fn((q: string, limit?: number) => {
      const trimmed = (q || "").trim().toLowerCase();
      if (!trimmed) return [];
      let pool: Array<{ item: any; score: number }> = [];
      if (trimmed.includes("stockholm")) {
        pool = [
          { item: entries[0], score: 0.1 }, // i1
          { item: entries[1], score: 0.2 }, // i2
        ];
      } else if (trimmed.includes("jane")) {
        pool = [{ item: entries[1], score: 0.05 }]; // i2
      }
      return typeof limit === "number" ? pool.slice(0, limit) : pool;
    });

    createSearcher.mockReturnValue({ search: searchMock });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------
  test("returns empty for blank query and calls onResults([])", async () => {
    const onResults = jest.fn();

    const { result } = renderHook(() => useSearch("", { debounceMs: 1, onResults }));

    // Effect path should clear immediately
    expect(result.current.ids).toEqual([]);
    expect(result.current.results).toEqual([]);

    await waitFor(() => {
      expect(onResults).toHaveBeenCalledWith([]);
    });
  });

  // ---------------------------------------------------------------------
  test("debounces and returns ids for a matching query", async () => {
    const onResults = jest.fn();

    const { result, rerender } = renderHook(
      ({ q }) => useSearch(q, { debounceMs: 1, onResults, limit: 10 }),
      { initialProps: { q: "" } }
    );

    // Update query -> advance timers to fire debounce
    await act(async () => {
      rerender({ q: "Stockholm" });
      jest.advanceTimersByTime(1);
    });

    await waitFor(() =>
      expect(result.current.ids).toEqual(expect.arrayContaining(["i1", "i2"]))
    );
    expect(onResults).toHaveBeenLastCalledWith(
      expect.arrayContaining(["i1", "i2"])
    );

    // Reset to blank
    await act(async () => {
      rerender({ q: "" });
      jest.advanceTimersByTime(1);
    });
    await waitFor(() => expect(result.current.ids).toEqual([]));
    expect(onResults).toHaveBeenLastCalledWith([]);
  });

  // ---------------------------------------------------------------------
  test("respects the limit option and exposes score", async () => {
    const onResults = jest.fn();

    const { result, rerender } = renderHook(
      ({ q }) => useSearch(q, { debounceMs: 1, onResults, limit: 1 }),
      { initialProps: { q: "" } }
    );

    await act(async () => {
      rerender({ q: "Stockholm" });
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => expect(result.current.ids.length).toBe(1));
    expect(typeof result.current.results[0].score).toBe("number");
  });

  // ---------------------------------------------------------------------
  test("supports other queries (e.g., by name)", async () => {
    const onResults = jest.fn();

    const { result, rerender } = renderHook(
      ({ q }) => useSearch(q, { debounceMs: 1, onResults }),
      { initialProps: { q: "" } }
    );

    await act(async () => {
      rerender({ q: "Jane" });
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => expect(result.current.ids).toEqual(["i2"]));
  });
});