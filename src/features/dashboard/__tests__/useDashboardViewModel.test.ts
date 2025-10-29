// 1. Mock the Redux hooks before importing the hook
jest.mock("../../../store", () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(),
}));

// 2. Mock the slices' action creators (thunks + plain actions)
jest.mock("../../../features/individualsSlice", () => ({
  fetchIndividuals: jest.fn(() => ({ type: "individuals/fetch" })),
  clearIndividuals: jest.fn(() => ({ type: "individuals/clear" })),
}));

jest.mock("../../../features/relationshipsSlice", () => ({
  fetchRelationships: jest.fn(() => ({ type: "relationships/fetch" })),
  clearRelationships: jest.fn(() => ({ type: "relationships/clear" })),
}));

// 3. Mock the pure stats builder
jest.mock("@core/viewModelBuilders/dashboard", () => ({
  buildDashboardStats: jest.fn(),
}));

import { renderHook, act } from "@testing-library/react";
import { useDashboardViewModel } from "../useDashboardViewModel";
import { buildDashboardStats } from "@core/viewModelBuilders/dashboard";

const mockBuildDashboardStats = buildDashboardStats as jest.Mock;

const { useAppSelector, useAppDispatch } = require("../../../store") as {
  useAppSelector: jest.Mock;
  useAppDispatch: jest.Mock;
};

describe("useDashboardViewModel (thin hook adapter + actions)", () => {
  const fakeIndividuals = [
    { id: "i1", givenName: "Anna" },
    { id: "i2", givenName: "Bertil" },
  ];

  const fakeRelationships = [
    { id: "rel1", type: "spouse", person1Id: "i1", person2Id: "i2" },
    {
      id: "rel2",
      type: "parent-child",
      parentIds: ["i1", "i2"],
      childId: "c1",
    },
  ];

  let dispatchSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // dispatch spy
    dispatchSpy = jest.fn();
    useAppDispatch.mockReturnValue(dispatchSpy);

    // selectors: feed the hook deterministic data
    useAppSelector.mockImplementation((selectorFn: any) => {
      const fakeState = {
        individuals: { items: fakeIndividuals },
        relationships: { items: fakeRelationships },
      };
      return selectorFn(fakeState);
    });

    // builder output
    mockBuildDashboardStats.mockReturnValue({
      individualCount: 2,
      marriageCount: 1,
      familyCount: 1,
    });

    // stub global alert and preload API
    (global as any).alert = jest.fn();

    (window as any).api = {
      importExcel: jest.fn(),
      importGedcom: jest.fn(),
      exportIndividualsExcel: jest.fn(),
      exportGedcom: jest.fn(),
      resetDatabase: jest.fn(),
    };
  });

  it("exposes derived stats from buildDashboardStats", () => {
    const { result } = renderHook(() => useDashboardViewModel());

    expect(mockBuildDashboardStats).toHaveBeenCalledWith(
      fakeIndividuals,
      fakeRelationships
    );

    expect(result.current.individualCount).toBe(2);
    expect(result.current.marriageCount).toBe(1);
    expect(result.current.familyCount).toBe(1);
  });

  it("handleImportExcel calls preload importExcel(), alerts, and dispatches refetches", async () => {
    (window as any).api.importExcel.mockResolvedValue({
      count: 10,
      relCount: 5,
    });

    const { result } = renderHook(() => useDashboardViewModel());

    await act(async () => {
      await result.current.handleImportExcel();
    });

    expect((window as any).api.importExcel).toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith(
      "Importerade 10 personer och 5 relationer."
    );

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "individuals/fetch" });
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "relationships/fetch" });
  });

  it("handleImportGedcom calls preload importGedcom(), alerts, and dispatches refetches", async () => {
    (window as any).api.importGedcom.mockResolvedValue({
      count: 3,
      relCount: 2,
    });

    const { result } = renderHook(() => useDashboardViewModel());

    await act(async () => {
      await result.current.handleImportGedcom();
    });

    expect((window as any).api.importGedcom).toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith(
      "Importerade 3 personer och 2 relationer."
    );

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "individuals/fetch" });
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "relationships/fetch" });
  });

  it("handleExportExcel calls exportIndividualsExcel and alerts on success", async () => {
    (window as any).api.exportIndividualsExcel.mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useDashboardViewModel());

    await act(async () => {
      await result.current.handleExportExcel();
    });

    expect((window as any).api.exportIndividualsExcel).toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith("Excel-export klar!");
  });

  it("handleExportGedcom calls exportGedcom and alerts on success", async () => {
    (window as any).api.exportGedcom.mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useDashboardViewModel());

    await act(async () => {
      await result.current.handleExportGedcom();
    });

    expect((window as any).api.exportGedcom).toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith("GEDCOM-export klar!");
  });

  it("handleResetDatabase wipes DB, clears redux, and reloads", async () => {
    const { result } = renderHook(() => useDashboardViewModel());

    // Silence jsdom's navigation warning ("Not implemented: navigation ...")
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // We want to intercept window.location.reload().
    // We'll try to redefine just reload; if jsdom won't let us, we skip that assertion.
    const originalReload = window.location.reload;
    let reloadMock: jest.Mock | null = jest.fn();

    try {
      Object.defineProperty(window.location, "reload", {
        configurable: true,
        value: reloadMock,
      });
    } catch {
      // cannot redefine reload in this environment -> don't assert it
      reloadMock = null;
    }

    await act(async () => {
      await result.current.handleResetDatabase();
    });

    // preload DB reset was called
    expect((window as any).api.resetDatabase).toHaveBeenCalled();

    // redux got cleared
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "individuals/clear" });
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "relationships/clear" });

    // browser reload attempted (if we could mock it)
    if (reloadMock) {
      expect(reloadMock).toHaveBeenCalled();
    }

    // restore reload if possible
    try {
      Object.defineProperty(window.location, "reload", {
        configurable: true,
        value: originalReload,
      });
    } catch {
      // ignore if not redefinable, same logic as above
    }

    // restore console
    consoleErrorSpy.mockRestore();
  });
});