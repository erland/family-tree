// --- Mocks must come first ---
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(),
}));

// Generate ids like the real thunks do, so tests can control via setUUIDs(...)
jest.mock("../../features/individualsSlice", () => ({
  addIndividual: jest.fn((payload: any) => {
    const id = payload?.id ?? (global as any).crypto?.randomUUID?.();
    return { type: "individuals/add", payload: { ...payload, id } };
  }),
}));

jest.mock("../../features/relationshipsSlice", () => ({
  addRelationship: jest.fn((payload: any) => {
    const id = payload?.id ?? (global as any).crypto?.randomUUID?.();
    return { type: "relationships/add", payload: { ...payload, id } };
  }),
  updateRelationship: jest.fn((payload: any) => ({ type: "relationships/update", payload })),
}));

// --- Imports ---
import { renderHook, act } from "@testing-library/react";
import { useAddParent } from "../useAddParent";

const { useAppSelector, useAppDispatch } = require("../../store") as {
  useAppSelector: jest.Mock;
  useAppDispatch: jest.Mock;
};
const { addIndividual } = require("../../features/individualsSlice") as {
  addIndividual: jest.Mock;
};
const { addRelationship, updateRelationship } = require("../../features/relationshipsSlice") as {
  addRelationship: jest.Mock;
  updateRelationship: jest.Mock;
};

// Deterministic UUIDs
let originalCrypto: Crypto | undefined;
beforeAll(() => {
  originalCrypto = global.crypto as any;
  Object.defineProperty(global, "crypto", {
    value: { randomUUID: jest.fn() },
    configurable: true,
  });
});
afterAll(() => {
  Object.defineProperty(global, "crypto", { value: originalCrypto, configurable: true });
});
const setUUIDs = (...vals: string[]) => {
  const fn = (global as any).crypto.randomUUID as jest.Mock;
  fn.mockReset();
  vals.forEach((v) => fn.mockReturnValueOnce(v));
};

describe("useAddParent", () => {
  let dispatch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Simulate RTK thunk behavior: dispatch returns an object with .unwrap()
    dispatch = jest.fn((action: any) => {
      const payload = action?.payload ?? action;
      return { unwrap: () => Promise.resolve(payload) };
    });
    useAppDispatch.mockReturnValue(dispatch);

    // Default selector state used by most tests
    useAppSelector.mockImplementation((selector: any) => {
      const state = {
        individuals: {
          items: [
            { id: "c1", givenName: "Child", familyName: "One" },
            { id: "p1", givenName: "Parent", familyName: "One" },
            { id: "p2", givenName: "Parent", familyName: "Two" },
          ],
        },
        relationships: {
          items: [{ id: "rel-existing", type: "parent-child", parentIds: ["p1"], childId: "c1" }],
        },
      };
      return selector(state);
    });
  });

  test("canLink guards", () => {
    const { result } = renderHook(() => useAddParent());
    expect(result.current.canLink("missing", "p2")).toBe(false);
    expect(result.current.canLink("c1", "missing")).toBe(false);
    expect(result.current.canLink("c1", "c1")).toBe(false);
    expect(result.current.canLink("c1", "p1")).toBe(false);
    expect(result.current.canLink("c1", "p2")).toBe(true);
  });

  test("addExistingParent merges into existing relation (second parent)", async () => {
    const { result } = renderHook(() => useAddParent());

    await act(async () => {
      await result.current.addExistingParent("c1", "p2");
    });

    expect(updateRelationship).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rel-existing",
        type: "parent-child",
        childId: "c1",
        parentIds: expect.arrayContaining(["p1", "p2"]),
      })
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "relationships/update" })
    );
  });

  test("addExistingParent rejects on duplicate and sets error", async () => {
    const { result } = renderHook(() => useAddParent());

    await act(async () => {
      await expect(result.current.addExistingParent("c1", "p1")).rejects.toThrow(/Ogiltig/i);
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/Ogiltig/i);
  });

  test("addNewParent creates individual and updates relation", async () => {
    // First id -> parent-1 (new parent), second id -> would be used if a new relation was created
    setUUIDs("parent-1", "rel-2");

    // For this test only, pre-seed the selector with the soon-to-exist parent ("parent-1"),
    // so canLink(childId, parentId) sees it without requiring a rerender cycle.
    useAppSelector.mockImplementationOnce((selector: any) => {
      const state = {
        individuals: {
          items: [
            { id: "c1", givenName: "Child", familyName: "One" },
            { id: "p1", givenName: "Parent", familyName: "One" },
            { id: "p2", givenName: "Parent", familyName: "Two" },
            { id: "parent-1", givenName: "New", familyName: "Parent" }, // pre-seeded
          ],
        },
        relationships: {
          items: [{ id: "rel-existing", type: "parent-child", parentIds: ["p1"], childId: "c1" }],
        },
      };
      return selector(state);
    });

    const { result } = renderHook(() => useAddParent());

    let parentId = "";
    await act(async () => {
      parentId = await result.current.addNewParent("c1", { givenName: "New", familyName: "Parent" });
    });

    expect(parentId).toBe("parent-1");

    // Hook calls addIndividual without id; thunk generates id internally
    expect(addIndividual).toHaveBeenCalledWith(
      expect.objectContaining({
        givenName: "New",
        familyName: "Parent",
      })
    );
    // We still verify the generated id via the returned parentId and the update payload below

    // Existing relation for the child → update (merge parentIds)
    expect(updateRelationship).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "parent-child",
        childId: "c1",
        parentIds: expect.arrayContaining(["p1", "parent-1"]),
      })
    );

    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  test("addNewParent rejects on invalid child (parent created, link fails)", async () => {
    setUUIDs("parent-x");

    const { result } = renderHook(() => useAddParent());
    await act(async () => {
      await expect(result.current.addNewParent("missing", { givenName: "X" })).rejects.toBeDefined();
    });

    expect(addIndividual).toHaveBeenCalled();       // parent was created
    expect(addRelationship).not.toHaveBeenCalled(); // link failed
    expect(updateRelationship).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);

    expect(result.current.error).toMatch(/Ogiltig/i);
  });
});