// Mocks must come before imports of the module under test

// 1. Mock store hooks so we can control selector output
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
}));

// 2. Mock the lower-level hook that useAddChildFlow composes
jest.mock("../useAddChild", () => ({
  useAddChild: jest.fn(),
}));

// 3. Partially mock @core so we can:
//    - control canAddParentChild (cycle detection / validity)
//    - control IndividualSchema.safeParse (form validation)
//    We keep the rest of @core's real exports intact.
jest.mock("@core", () => {
  const actual = jest.requireActual("@core");

  return {
    ...actual,

    // mockable relationship rule used in useAddChildFlow.validateNoCycles
    canAddParentChild: jest.fn(),

    // mockable zod schema
    IndividualSchema: {
      safeParse: jest.fn(),
    },
  };
});

// Now import test utilities and the hook under test
import { renderHook, act } from "@testing-library/react";
import { useAddChildFlow } from "../useAddChildFlow";

// Grab the mocks we declared above
const { useAppSelector } = require("../../store") as {
  useAppSelector: jest.Mock;
};

const { useAddChild } = require("../useAddChild") as {
  useAddChild: jest.Mock;
};

const {
  canAddParentChild,
  IndividualSchema,
} = require("@core") as {
  canAddParentChild: jest.Mock;
  IndividualSchema: { safeParse: jest.Mock };
};


describe("useAddChildFlow", () => {
  let addExistingChild: jest.Mock;
  let addNewChild: jest.Mock;
  let canLink: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default store shape; we invoke the selector with our fake state
    const relationships = [
      { id: "r1", type: "parent-child", parentIds: ["pA"], childId: "cA" },
    ];
    useAppSelector.mockImplementation((selector: any) =>
      selector({
        relationships: { items: relationships },
        individuals: { items: [] },
      })
    );

    // Default relationship checks succeed
    canAddParentChild.mockReturnValue({ ok: true });

    // Default lower-level hook behavior
    addExistingChild = jest.fn().mockResolvedValue(undefined);
    addNewChild = jest.fn().mockResolvedValue("child-1");
    canLink = jest.fn().mockReturnValue(true);

    useAddChild.mockReturnValue({
      loading: false,
      error: null,
      canLink,
      addExistingChild,
      addNewChild,
    });

    // Default schema success
    IndividualSchema.safeParse.mockReturnValue({
      success: true,
      data: {
        givenName: "New",
        familyName: "Kid",
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
  });

  test("linkExisting links only parents that pass canLink and cycle check", async () => {
    // make p2 fail canLink; p1 passes
    canLink.mockImplementation((pid: string) => pid === "p1");

    const { result } = renderHook(() => useAddChildFlow());

    await act(async () => {
      await result.current.linkExisting({ parentIds: ["p1", "p2"], childId: "c1" });
    });

    expect(addExistingChild).toHaveBeenCalledTimes(1);
    expect(addExistingChild).toHaveBeenCalledWith("p1", "c1");
  });

  test("linkExisting throws when any parent would create a cycle", async () => {
    canAddParentChild.mockImplementation((_, pid: string) =>
      pid === "bad" ? { ok: false } : { ok: true }
    );

    const { result } = renderHook(() => useAddChildFlow());

    await act(async () => {
      await expect(
        result.current.linkExisting({ parentIds: ["p1", "bad"], childId: "c1" })
      ).rejects.toThrow(/cykel/i);
    });

    expect(addExistingChild).not.toHaveBeenCalled();
  });

  test("createAndLink creates child and links only primary parent when no otherParentId", async () => {
    const { result } = renderHook(() => useAddChildFlow());

    await act(async () => {
      await result.current.createAndLink({
        primaryParentId: "p1",
        form: { givenName: "New", familyName: "Kid" },
      });
    });

    // ensure schema was used
    expect(IndividualSchema.safeParse).toHaveBeenCalled();

    // created child linked to primary parent
    expect(addNewChild).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ givenName: "New", familyName: "Kid" })
    );
    expect(addExistingChild).not.toHaveBeenCalled();
  });

  test("createAndLink links second parent when cycle check passes and canLink is true", async () => {
    canLink.mockImplementation((pid: string) => pid !== "skip");
    const { result } = renderHook(() => useAddChildFlow());

    await act(async () => {
      await result.current.createAndLink({
        primaryParentId: "p1",
        otherParentId: "p2",
        form: { givenName: "New" },
      });
    });

    expect(addNewChild).toHaveBeenCalled();
    expect(addExistingChild).toHaveBeenCalledWith("p2", "child-1");
  });

  test("createAndLink throws when schema fails before any creation", async () => {
    IndividualSchema.safeParse.mockReturnValueOnce({ success: false });

    const { result } = renderHook(() => useAddChildFlow());

    await act(async () => {
      await expect(
        result.current.createAndLink({
          primaryParentId: "p1",
          form: {},
        })
      ).rejects.toThrow(/uppgifter/i);
    });

    expect(addNewChild).not.toHaveBeenCalled();
    expect(addExistingChild).not.toHaveBeenCalled();
  });

  test("createAndLink throws if second parent would create cycle (no rollback of initial link)", async () => {
    // Primary creation ok; second parent invalid
    canAddParentChild.mockImplementation((_, pid: string) =>
      pid === "pBad" ? { ok: false } : { ok: true }
    );

    const { result } = renderHook(() => useAddChildFlow());

    await act(async () => {
      await expect(
        result.current.createAndLink({
          primaryParentId: "p1",
          otherParentId: "pBad",
          form: { givenName: "New" },
        })
      ).rejects.toThrow(/cykel/i);
    });

    expect(addNewChild).toHaveBeenCalledTimes(1);
    expect(addExistingChild).not.toHaveBeenCalled();
  });
});