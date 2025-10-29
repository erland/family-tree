// 1. Mock the Redux selector hook before importing the hook
jest.mock("../../../store", () => ({
  useAppSelector: jest.fn(),
}));

// 2. Mock the pure helpers from viewModelBuilders
jest.mock("@core/viewModelBuilders/pedigreeTree", () => ({
  pickRootById: jest.fn(),
  derivePedigreeTreeState: jest.fn(),
}));

// 3. Mock the export utils so we don't actually try to render/export anything
jest.mock("../../../utils/exportTreeSvg", () => ({
  exportFullTreeSVG: jest.fn(),
}));

jest.mock("../../../utils/exportTreePdf", () => ({
  exportFullTreePDF: jest.fn(),
}));

import { renderHook, act } from "@testing-library/react";
import { usePedigreeTreeViewModel } from "../usePedigreeTreeViewModel";

import { pickRootById, derivePedigreeTreeState } from "@core/viewModelBuilders/pedigreeTree";
import { exportFullTreeSVG } from "../../../utils/exportTreeSvg";
import { exportFullTreePDF } from "../../../utils/exportTreePdf";

const mockPickRootById = pickRootById as jest.Mock;
const mockDeriveState = derivePedigreeTreeState as jest.Mock;
const mockExportSvg = exportFullTreeSVG as jest.Mock;
const mockExportPdf = exportFullTreePDF as jest.Mock;

const { useAppSelector } = require("../../../store") as {
  useAppSelector: jest.Mock;
};

describe("usePedigreeTreeViewModel (thin hook adapter with local UI state)", () => {
  const fakeIndividuals = [
    { id: "i1", givenName: "Anna" },
    { id: "i2", givenName: "Bertil" },
  ];

  // We don't really assert on `relationships` content in this hook,
  // but we provide some so the selectors and export calls have stable values.
  const fakeRelationships = [
    { id: "rel1", type: "spouse", person1Id: "i1", person2Id: "i2" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Make the selectors return our deterministic slices.
    useAppSelector.mockImplementation((selectorFn: any) => {
      const fakeState = {
        individuals: { items: fakeIndividuals },
        relationships: { items: fakeRelationships },
      };
      return selectorFn(fakeState);
    });

    // Default derivePedigreeTreeState result
    mockDeriveState.mockReturnValue({ rootId: undefined });

    // Default pickRootById
    mockPickRootById.mockReturnValue({
      root: null,
      selected: null,
    });
  });

  it("initializes state and exposes derived rootId from derivePedigreeTreeState", () => {
    mockDeriveState.mockReturnValue({ rootId: "i1" });

    const { result } = renderHook(() => usePedigreeTreeViewModel());

    // default local state
    expect(result.current.root).toBeNull();
    expect(result.current.mode).toBe("descendants");
    expect(result.current.layoutKind).toBe("orthogonal");
    expect(result.current.maxGenerations).toBe(3);
    expect(result.current.selected).toBeNull();
    expect(result.current.editing).toBeNull();

    // derivePedigreeTreeState should have been called with root (null at init)
    expect(mockDeriveState).toHaveBeenCalledWith(null);

    // rootId is taken from derivePedigreeTreeState
    expect(result.current.rootId).toBe("i1");

    // setters / actions should be functions
    expect(typeof result.current.setRoot).toBe("function");
    expect(typeof result.current.setMode).toBe("function");
    expect(typeof result.current.setLayoutKind).toBe("function");
    expect(typeof result.current.setMaxGenerations).toBe("function");
    expect(typeof result.current.setSelected).toBe("function");
    expect(typeof result.current.setEditing).toBe("function");

    expect(typeof result.current.handlePickRoot).toBe("function");
    expect(typeof result.current.handleExportSvg).toBe("function");
    expect(typeof result.current.handleExportPdf).toBe("function");
  });

  it("handlePickRoot uses pickRootById and updates root/selected accordingly", () => {
    // pickRootById should return the 'new' root and selected individual
    mockPickRootById.mockReturnValue({
      root: { id: "i2", givenName: "Bertil" },
      selected: { id: "i2", givenName: "Bertil" },
    });

    const { result } = renderHook(() => usePedigreeTreeViewModel());

    act(() => {
      result.current.handlePickRoot("i2");
    });

    // Should call our pure helper with (individuals, "i2")
    expect(mockPickRootById).toHaveBeenCalledWith(fakeIndividuals, "i2");

    // Hook state should now reflect what pickRootById returned
    expect(result.current.root).toEqual({ id: "i2", givenName: "Bertil" });
    expect(result.current.selected).toEqual({
      id: "i2",
      givenName: "Bertil",
    });
  });

  it("handleExportSvg does nothing if root is null", () => {
    const { result } = renderHook(() => usePedigreeTreeViewModel());

    act(() => {
      result.current.handleExportSvg();
    });

    // Because root was null (initial state), we should not call exportFullTreeSVG
    expect(mockExportSvg).not.toHaveBeenCalled();
  });

  it("handleExportPdf does nothing if root is null", () => {
    const { result } = renderHook(() => usePedigreeTreeViewModel());

    act(() => {
      result.current.handleExportPdf();
    });

    expect(mockExportPdf).not.toHaveBeenCalled();
  });

  it("handleExportSvg calls exportFullTreeSVG with the right args when root is set", () => {
    // We'll make pickRootById set a root so we can then trigger export
    mockPickRootById.mockReturnValue({
      root: { id: "i1", givenName: "Anna" },
      selected: { id: "i1", givenName: "Anna" },
    });

    const { result } = renderHook(() => usePedigreeTreeViewModel());

    // first pick the root so root != null
    act(() => {
      result.current.handlePickRoot("i1");
    });

    // Now call export
    act(() => {
      result.current.handleExportSvg();
    });

    expect(mockExportSvg).toHaveBeenCalledTimes(1);

    // exportFullTreeSVG(individuals, relationships, root.id, mode, maxGenerations)
    expect(mockExportSvg).toHaveBeenCalledWith(
      fakeIndividuals,
      fakeRelationships,
      "i1",
      "descendants",
      3
    );
  });

  it("handleExportPdf calls exportFullTreePDF with the right args when root is set", () => {
    mockPickRootById.mockReturnValue({
      root: { id: "i2", givenName: "Bertil" },
      selected: { id: "i2", givenName: "Bertil" },
    });

    const { result } = renderHook(() => usePedigreeTreeViewModel());

    // Set root first
    act(() => {
      result.current.handlePickRoot("i2");
    });

    // Now export PDF
    act(() => {
      result.current.handleExportPdf();
    });

    expect(mockExportPdf).toHaveBeenCalledTimes(1);

    // exportFullTreePDF(individuals, relationships, root.id, mode, maxGenerations)
    expect(mockExportPdf).toHaveBeenCalledWith(
      fakeIndividuals,
      fakeRelationships,
      "i2",
      "descendants",
      3
    );
  });

  it("allows caller to change mode/maxGenerations/layoutKind via setters", () => {
    const { result } = renderHook(() => usePedigreeTreeViewModel());

    act(() => {
      result.current.setMode("ancestors");
      result.current.setLayoutKind("circular");
      result.current.setMaxGenerations(5);
    });

    expect(result.current.mode).toBe("ancestors");
    expect(result.current.layoutKind).toBe("circular");
    expect(result.current.maxGenerations).toBe(5);
  });

  it("allows caller to change editing + selected directly via setters", () => {
    const { result } = renderHook(() => usePedigreeTreeViewModel());

    act(() => {
      result.current.setSelected({ id: "tmp", givenName: "Tmp" } as any);
      result.current.setEditing({ id: "edit", givenName: "Edit" } as any);
    });

    expect(result.current.selected).toEqual({
      id: "tmp",
      givenName: "Tmp",
    });
    expect(result.current.editing).toEqual({
      id: "edit",
      givenName: "Edit",
    });
  });
});