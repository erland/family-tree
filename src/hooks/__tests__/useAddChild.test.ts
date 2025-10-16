// --- Mocks must come first ---
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(),
}));

// ⬇️ mock your actual slices under features/*
// Generate ids like the real thunks would do, so tests can control via setUUIDs(...)
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
import { useAddChild } from "../useAddChild";

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

describe("useAddChild", () => {
  let dispatch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Simulate RTK thunk behavior: dispatch returns an object with .unwrap()
    dispatch = jest.fn((action: any) => {
      // tests can still check dispatch.mock.calls to see the action
      const payload = action?.payload ?? action;
      return { unwrap: () => Promise.resolve(payload) };
    });
    useAppDispatch.mockReturnValue(dispatch);

    useAppSelector.mockImplementation((selector: any) => {
      const state = {
        individuals: {
          items: [
            { id: "p1", givenName: "Parent", familyName: "One" },
            { id: "c1", givenName: "Child", familyName: "One" },
            { id: "c2", givenName: "Child", familyName: "Two" },
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
    const { result } = renderHook(() => useAddChild());
    expect(result.current.canLink("p1", "missing")).toBe(false);
    expect(result.current.canLink("missing", "c1")).toBe(false);
    expect(result.current.canLink("p1", "p1")).toBe(false);
    expect(result.current.canLink("p1", "c1")).toBe(false);
    expect(result.current.canLink("p1", "c2")).toBe(true);
  });

  test("addExistingChild creates new relation when child has none", async () => {
    setUUIDs("rel-new"); // id used by addRelationship mock
    const { result } = renderHook(() => useAddChild());

    await act(async () => {
      await result.current.addExistingChild("p1", "c2");
    });

    // The hook calls addRelationship WITHOUT id; your mock adds id to the returned action.
    // So assert the dispatch payload (action sent to store), not the function argument.
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "relationships/add",
        payload: expect.objectContaining({
          id: "rel-new",
          type: "parent-child",
          parentIds: ["p1"],
          childId: "c2",
        }),
      })
    );

    // (Optional) you can still sanity-check the raw call but WITHOUT id:
    expect(addRelationship).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "parent-child",
        parentIds: ["p1"],
        childId: "c2",
      })
    );
  });

  test("addExistingChild rejects on duplicate link and sets error", async () => {
    const { result } = renderHook(() => useAddChild());

    await act(async () => {
      await expect(result.current.addExistingChild("p1", "c1")).rejects.toThrow(/Ogiltig/i);
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/Ogiltig/i);
  });

  test("addNewChild creates individual and relation", async () => {
    // 1st UUID -> child id (addIndividual), 2nd -> relationship id (addRelationship)
    setUUIDs("child-1", "rel-1");

    // For this test only, pre-seed the selector so canLink sees the new child
    // (simulates the store being updated after addIndividual).
    useAppSelector.mockImplementationOnce((selector: any) => {
      const state = {
        individuals: {
          items: [
            { id: "p1", givenName: "Parent", familyName: "One" },
            { id: "c1", givenName: "Child", familyName: "One" },
            { id: "c2", givenName: "Child", familyName: "Two" },
            { id: "child-1", givenName: "New", familyName: "Kid" }, // pre-seeded new child
          ],
        },
        relationships: {
          items: [{ id: "rel-existing", type: "parent-child", parentIds: ["p1"], childId: "c1" }],
        },
      };
      return selector(state);
    });

    const { result } = renderHook(() => useAddChild());

    let childId = "";
    await act(async () => {
      childId = await result.current.addNewChild("p1", { givenName: "New", familyName: "Kid" });
    });

    expect(childId).toBe("child-1");

    // Hook calls addIndividual without id; the mock adds id internally
    expect(addIndividual).toHaveBeenCalledWith(
      expect.objectContaining({ givenName: "New", familyName: "Kid" })
    );

    // Assert the dispatched addRelationship action carries the generated id
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "relationships/add",
        payload: expect.objectContaining({
          id: "rel-1",
          type: "parent-child",
          parentIds: ["p1"],
          childId: "child-1",
        }),
      })
    );

    // (Optional) raw call without id (since the hook doesn't pass it)
    expect(addRelationship).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "parent-child",
        parentIds: ["p1"],
        childId: "child-1",
      })
    );

    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  test("addNewChild rejects on invalid parent (child created, link fails)", async () => {
    setUUIDs("child-x"); // id for the new child creation

    const { result } = renderHook(() => useAddChild());

    await act(async () => {
      await expect(result.current.addNewChild("missing", { givenName: "X" })).rejects.toBeDefined();
    });

    // One dispatch for addIndividual occurred, but addRelationship should not
    expect(addIndividual).toHaveBeenCalled();
    expect(addRelationship).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);

    // Hook surfaces a friendly error message set in addExistingChild
    expect(result.current.error).toMatch(/Ogiltig/i);
  });
});