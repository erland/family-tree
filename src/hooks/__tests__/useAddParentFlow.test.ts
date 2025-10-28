// --- Mocks must come first ---

// Mock selector hook so useAddParentFlow can read relationships from state
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
}));

// Mock the inner hook that the flow hook uses
jest.mock("../useAddParent", () => ({
  useAddParent: jest.fn(),
}));

// We'll mock @core because useAddParentFlow imports these at runtime:
const coreMocks: {
  canAddParentChild: jest.Mock<{ ok: boolean }, [any, string, string]>;
  IndividualSchema: {
    safeParse: jest.Mock<any, any>;
  };
} = {
  canAddParentChild: jest.fn(),
  IndividualSchema: {
    safeParse: jest.fn(),
  },
};

// We must not use ...args spreads with ts-jest complaining, so explicit params:
jest.mock("@core/domain", () => {
  const actual = jest.requireActual("@core/domain");
  return {
    ...actual,
    canAddParentChild: (rels: any, pid: string, cid: string) =>
      coreMocks.canAddParentChild(rels, pid, cid),
    IndividualSchema: {
      safeParse: (candidate: any) =>
        coreMocks.IndividualSchema.safeParse(candidate),
    },
  };
});

// --- Imports AFTER mocks ---
import { renderHook, act } from "@testing-library/react";
import { useAddParentFlow } from "../useAddParentFlow";

const { useAppSelector } = require("../../store") as {
  useAppSelector: jest.Mock;
};

const { useAddParent } = require("../useAddParent") as {
  useAddParent: jest.Mock;
};

describe("useAddParentFlow", () => {
  let addExistingParent: jest.Mock;
  let addNewParent: jest.Mock;
  let canLink: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Pretend this is what's in Redux
    const relationships = [
      { id: "rel1", type: "parent-child", parentIds: ["p1"], childId: "c1" },
    ];

    useAppSelector.mockImplementation((selector: any) =>
      selector({
        relationships: { items: relationships },
        individuals: { items: [] },
      })
    );

    // Default: cycle check passes for any pid/cid
    coreMocks.canAddParentChild.mockReset();
    coreMocks.canAddParentChild.mockImplementation(
      (_rels: any, _pid: string, _cid: string) => ({ ok: true })
    );

    // Default schema validation succeeds
    coreMocks.IndividualSchema.safeParse.mockReset();
    coreMocks.IndividualSchema.safeParse.mockReturnValue({
      success: true,
      data: {
        givenName: "New",
        familyName: "Parent",
        birthFamilyName: "",
        dateOfBirth: "",
        birthRegion: "",
        birthCongregation: "",
        birthCity: "",
        dateOfDeath: "",
        deathRegion: "",
        deathCongregation: "",
        deathCity: "",
        gender: "unknown",
        story: "",
      },
    });

    // mock inner hook API
    addExistingParent = jest.fn().mockResolvedValue(undefined);
    addNewParent = jest.fn().mockResolvedValue("parent-1");
    canLink = jest
      .fn()
      .mockImplementation((_childId: string, _parentId: string) => true);

    useAddParent.mockReturnValue({
      loading: false,
      error: null,
      canLink,
      addExistingParent,
      addNewParent,
    });
  });

  test("linkExisting links only allowed parents", async () => {
    // block p2, allow p1
    canLink.mockImplementation((childId: string, parentId: string) => {
      return childId === "c1" && parentId === "p1";
    });

    const { result } = renderHook(() => useAddParentFlow());

    await act(async () => {
      await result.current.linkExisting({
        childId: "c1",
        parentIds: ["p1", "p2"],
      });
    });

    expect(addExistingParent).toHaveBeenCalledTimes(1);
    expect(addExistingParent).toHaveBeenCalledWith("c1", "p1");
  });

  //
  // ⬇️ UPDATED: reject case #1
  //
  test("linkExisting throws when any parent would create a cycle", async () => {
    // make parent 'bad' fail the cycle check
    coreMocks.canAddParentChild.mockImplementation(
      (_rels: any, pid: string, _cid: string) =>
        pid === "bad" ? { ok: false } : { ok: true }
    );

    const { result } = renderHook(() => useAddParentFlow());

    // Call the hook and grab the returned promise
    const prom = result.current.linkExisting({
      childId: "c1",
      parentIds: ["p1", "bad"],
    });

    // Immediately assert on that promise. No wrapping in act, no delayed await.
    await expect(prom).rejects.toThrow(/cykel/i);

    // and we never tried to actually link anything
    expect(addExistingParent).not.toHaveBeenCalled();
  });

  test("createAndLink creates parent and links to child; no other parent", async () => {
    const { result } = renderHook(() => useAddParentFlow());

    let newParentId = "";
    await act(async () => {
      newParentId = await result.current.createAndLink({
        childId: "c1",
        withOtherParentId: null,
        form: { givenName: "New", familyName: "Parent" },
      });
    });

    expect(newParentId).toBe("parent-1");

    // schema was consulted
    expect(coreMocks.IndividualSchema.safeParse).toHaveBeenCalled();

    // first parent created+linked via addNewParent
    expect(addNewParent).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({
        givenName: "New",
        familyName: "Parent",
      })
    );

    // no secondary link attempt
    expect(addExistingParent).not.toHaveBeenCalled();
  });

  test("createAndLink links second parent if allowed", async () => {
    // allow all except "skip"
    canLink.mockImplementation(
      (_childId: string, parentId: string) => parentId !== "skip"
    );

    const { result } = renderHook(() => useAddParentFlow());

    await act(async () => {
      await result.current.createAndLink({
        childId: "c1",
        withOtherParentId: "p2",
        form: { givenName: "Kid" },
      });
    });

    // we created the first parent…
    expect(addNewParent).toHaveBeenCalledTimes(1);
    // …and then linked the provided second parent
    expect(addExistingParent).toHaveBeenCalledWith("c1", "p2");
  });

  //
  // ⬇️ UPDATED: reject case #2 (schema invalid)
  //
  test("createAndLink throws if form fails schema BEFORE creating anything", async () => {
    // next validation fails
    coreMocks.IndividualSchema.safeParse.mockReturnValueOnce({
      success: false,
    });

    const { result } = renderHook(() => useAddParentFlow());

    // capture the promise
    const prom = result.current.createAndLink({
      childId: "c1",
      withOtherParentId: null,
      form: {}, // invalid form
    });

    // assert the promise rejects with the validation error
    await expect(prom).rejects.toThrow(/uppgifter/i);

    // nothing should have been dispatched to add/link parents
    expect(addNewParent).not.toHaveBeenCalled();
    expect(addExistingParent).not.toHaveBeenCalled();
  });

  //
  // ⬇️ UPDATED: reject case #3 (second parent causes cycle)
  //
  test("createAndLink throws if other parent would create cycle (no second link)", async () => {
    // ban pBad: cycle risk
    coreMocks.canAddParentChild.mockImplementation(
      (_rels: any, pid: string, _cid: string) =>
        pid === "pBad" ? { ok: false } : { ok: true }
    );

    const { result } = renderHook(() => useAddParentFlow());

    // call and capture promise
    const prom = result.current.createAndLink({
      childId: "c1",
      withOtherParentId: "pBad",
      form: { givenName: "New" },
    });

    // check rejection directly
    await expect(prom).rejects.toThrow(/cykel/i);

    // we DID create the first parent via addNewParent()
    expect(addNewParent).toHaveBeenCalledTimes(1);

    // but we never tried to link the bad second parent
    expect(addExistingParent).not.toHaveBeenCalled();
  });
});