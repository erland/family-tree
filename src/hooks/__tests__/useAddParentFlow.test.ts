// Mocks must come before imports of the module under test
jest.mock("../../store", () => ({
  useAppSelector: jest.fn(),
}));

jest.mock("../../utils/relationshipUtils", () => ({
  canAddParentChild: jest.fn(),
}));

jest.mock("../useAddParent", () => ({
  useAddParent: jest.fn(),
}));

jest.mock("../../types/individual", () => ({
  IndividualSchema: { safeParse: jest.fn() },
}));

import { renderHook, act } from "@testing-library/react";
import { useAddParentFlow } from "../useAddParentFlow";

const { useAppSelector } = require("../../store") as { useAppSelector: jest.Mock };
const { canAddParentChild } = require("../../utils/relationshipUtils") as {
  canAddParentChild: jest.Mock;
};
const { useAddParent } = require("../useAddParent") as { useAddParent: jest.Mock };
const { IndividualSchema } = require("../../types/individual") as {
  IndividualSchema: { safeParse: jest.Mock };
};

describe("useAddParentFlow", () => {
  let addExistingParent: jest.Mock;
  let addNewParent: jest.Mock;
  let canLink: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const relationships = [
      { id: "r1", type: "parent-child", parentIds: ["pX"], childId: "cX" },
    ];
    useAppSelector.mockImplementation((selector: any) =>
      selector({
        relationships: { items: relationships },
        individuals: { items: [] },
      })
    );

    canAddParentChild.mockReturnValue({ ok: true });

    addExistingParent = jest.fn().mockResolvedValue(undefined);
    addNewParent = jest.fn().mockResolvedValue("parent-1");
    canLink = jest.fn().mockReturnValue(true);

    useAddParent.mockReturnValue({
      loading: false,
      error: null,
      canLink,
      addExistingParent,
      addNewParent,
    });

    IndividualSchema.safeParse.mockReturnValue({
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
  });

  test("linkExisting links only parents that pass canLink and cycle check", async () => {
    canLink.mockImplementation((childId: string, pid: string) => pid === "p1");

    const { result } = renderHook(() => useAddParentFlow());

    await act(async () => {
      await result.current.linkExisting({ childId: "c1", parentIds: ["p1", "p2"] });
    });

    expect(addExistingParent).toHaveBeenCalledTimes(1);
    expect(addExistingParent).toHaveBeenCalledWith("c1", "p1");
  });

  test("linkExisting throws when any parent would create a cycle", async () => {
    canAddParentChild.mockImplementation((_, pid: string) =>
      pid === "bad" ? { ok: false } : { ok: true }
    );

    const { result } = renderHook(() => useAddParentFlow());

    await act(async () => {
      await expect(
        result.current.linkExisting({ childId: "c1", parentIds: ["p1", "bad"] })
      ).rejects.toThrow(/cykel/i);
    });

    expect(addExistingParent).not.toHaveBeenCalled();
  });

  test("createAndLink creates parent and links to child; no other parent", async () => {
    const { result } = renderHook(() => useAddParentFlow());

    let pid = "";
    await act(async () => {
      pid = await result.current.createAndLink({
        childId: "c1",
        form: { givenName: "New", familyName: "Parent" },
      });
    });

    expect(pid).toBe("parent-1");
    expect(IndividualSchema.safeParse).toHaveBeenCalled();
    expect(addNewParent).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ givenName: "New", familyName: "Parent" })
    );
    expect(addExistingParent).not.toHaveBeenCalled();
  });

  test("createAndLink links otherParentId when cycle check passes and canLink is true", async () => {
    canLink.mockImplementation((childId: string, pid: string) => pid !== "skip");

    const { result } = renderHook(() => useAddParentFlow());

    await act(async () => {
      await result.current.createAndLink({
        childId: "c1",
        withOtherParentId: "p2",
        form: { givenName: "New" },
      });
    });

    expect(addNewParent).toHaveBeenCalled();
    expect(addExistingParent).toHaveBeenCalledWith("c1", "p2");
  });

  test("createAndLink throws when schema fails before any creation", async () => {
    IndividualSchema.safeParse.mockReturnValueOnce({ success: false });

    const { result } = renderHook(() => useAddParentFlow());

    await act(async () => {
      await expect(
        result.current.createAndLink({
          childId: "c1",
          form: {},
        })
      ).rejects.toThrow(/uppgifter/i);
    });

    expect(addNewParent).not.toHaveBeenCalled();
    expect(addExistingParent).not.toHaveBeenCalled();
  });

  test("createAndLink throws if other parent would create cycle (no second link)", async () => {
    canAddParentChild.mockImplementation((_, pid: string) =>
      pid === "pBad" ? { ok: false } : { ok: true }
    );

    const { result } = renderHook(() => useAddParentFlow());

    await act(async () => {
      await expect(
        result.current.createAndLink({
          childId: "c1",
          withOtherParentId: "pBad",
          form: { givenName: "New" },
        })
      ).rejects.toThrow(/cykel/i);
    });

    expect(addNewParent).toHaveBeenCalledTimes(1);
    expect(addExistingParent).not.toHaveBeenCalled();
  });
});