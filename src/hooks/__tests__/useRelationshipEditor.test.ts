import { renderHook, act } from "@testing-library/react";
import { useRelationshipEditor } from "../useRelationshipEditor";
import type { Relationship } from "@core/domain";

// --- Mocks ------------------------------------------------------------------

// deterministic uuid
jest.mock("uuid", () => ({ v4: jest.fn(() => "uuid-1") }));

// plain action creators so we can assert dispatch payloads
jest.mock("../../features/relationshipsSlice", () => ({
  addRelationship: (payload: any) => ({
    type: "relationships/addRelationship",
    payload,
  }),
  updateRelationship: (payload: any) => ({
    type: "relationships/updateRelationship",
    payload,
  }),
}));

// we'll mutate this per test so useAppSelector returns different states
const mockDispatch = jest.fn();
let selectorState: any = { relationships: { items: [] } };

// mock the store hooks
jest.mock("../../store", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: any) => sel(selectorState),
}));

/**
 * 🔁 Jest hoisting/TDZ workaround for @core
 *
 * We can't safely do:
 *   const wouldCreateCycleMock = jest.fn();
 *   jest.mock("@core/domain", () => ({ ...actual, wouldCreateCycle: wouldCreateCycleMock }));
 *
 * because jest.mock() is hoisted but the const isn't, so we'd hit TDZ.
 *
 * Instead we create a mutable holder object that exists (is initialized)
 * before the factory runs, then we assign its .wouldCreateCycle AFTER.
 */
const coreMocks: { wouldCreateCycle?: jest.Mock } = {};

jest.mock("@core/domain", () => {
  const actual = jest.requireActual("@core/domain");
  return {
    ...actual,
    wouldCreateCycle: (...args: any[]) =>
      coreMocks.wouldCreateCycle?.(...args),
  };
});

// now that the factory is defined, we can attach the actual mock fn
coreMocks.wouldCreateCycle = jest.fn(() => false);

// --- Helpers ----------------------------------------------------------------

const resetMocks = () => {
  mockDispatch.mockClear();
  // default: no cycle
  coreMocks.wouldCreateCycle!.mockReset();
  coreMocks.wouldCreateCycle!.mockReturnValue(false);

  selectorState = { relationships: { items: [] } };
};

// Narrow the two variants of the union so factories are well-typed
type SpouseRel = Extract<Relationship, { type: "spouse" }>;
type ParentChildRel = Extract<Relationship, { type: "parent-child" }>;

const spouseRel = (overrides: Partial<SpouseRel> = {}): SpouseRel => ({
  id: "rel-1",
  type: "spouse",
  person1Id: "a1",
  person2Id: "a2",
  weddingDate: "1901-01-01",
  weddingRegion: "REG",
  weddingCity: "CITY",
  weddingCongregation: "PAR",
  ...overrides,
});

const parentChildRel = (overrides: Partial<ParentChildRel> = {}): ParentChildRel => ({
  id: "rel-2",
  type: "parent-child",
  parentIds: ["p1", "p2"],
  childId: "c1",
  ...overrides,
});

// --- Tests ------------------------------------------------------------------

describe("useRelationshipEditor (new relationship)", () => {
  beforeEach(() => resetMocks());

  test("initial state defaults to spouse type with empty fields", () => {
    const { result } = renderHook(() => useRelationshipEditor());
    expect(result.current.isEdit).toBe(false);
    expect(result.current.type).toBe("spouse");

    // spouse fields empty
    expect(result.current.groom).toBe("");
    expect(result.current.bride).toBe("");
    expect(result.current.weddingDate).toBe("");
    expect(result.current.weddingRegion).toBe("");
    expect(result.current.weddingCity).toBe("");
    expect(result.current.weddingCongregation).toBe("");

    // parent-child fields empty
    expect(result.current.parentIds).toEqual([]);
    expect(result.current.childId).toBe("");
  });

  test("save() creates a spouse relationship and dispatches addRelationship", () => {
    const { result } = renderHook(() => useRelationshipEditor());

    act(() => {
      result.current.setGroom("id-groom");
      result.current.setBride("id-bride");
      result.current.setWeddingDate("1888-06-12");
      result.current.setWeddingRegion("Norrbotten");
      result.current.setWeddingCity("Luleå");
      result.current.setWeddingCongregation("Domkyrkan");
    });

    let ok = false;
    act(() => {
      ok = result.current.save();
    });
    expect(ok).toBe(true);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "relationships/addRelationship",
      payload: {
        id: "uuid-1",
        type: "spouse",
        person1Id: "id-groom",
        person2Id: "id-bride",
        weddingDate: "1888-06-12",
        weddingRegion: "Norrbotten",
        weddingCity: "Luleå",
        weddingCongregation: "Domkyrkan",
      },
    });
  });

  test("parent-child: validations block save with proper error messages", () => {
    const { result } = renderHook(() => useRelationshipEditor());

    // Switch to parent-child mode
    act(() => result.current.setType("parent-child"));

    // 1) Missing child
    act(() => {
      result.current.setParentIds(["p1"]);
      result.current.setChildId(""); // explicit
    });
    let ok = true;
    act(() => {
      ok = result.current.save();
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("Välj ett barn.");

    // 2) Missing parents
    act(() => {
      result.current.setParentIds([]);
      result.current.setChildId("c1");
    });
    act(() => {
      ok = result.current.save();
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("Välj minst en förälder.");

    // 3) Child equals parent
    act(() => {
      result.current.setParentIds(["c1"]);
      result.current.setChildId("c1");
    });
    act(() => {
      ok = result.current.save();
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("Ett barn kan inte också vara förälder.");

    // 4) Cycle detected via wouldCreateCycle
    resetMocks();
    selectorState = {
      relationships: {
        items: [
          {
            id: "r",
            type: "parent-child",
            parentIds: ["p1"],
            childId: "c1",
          },
        ],
      },
    };
    coreMocks.wouldCreateCycle!.mockReturnValue(true);

    const { result: result2 } = renderHook(() => useRelationshipEditor());
    act(() => result2.current.setType("parent-child"));
    act(() => {
      result2.current.setParentIds(["p1"]);
      result2.current.setChildId("c1");
    });
    act(() => {
      ok = result2.current.save();
    });
    expect(ok).toBe(false);
    expect(result2.current.error).toBe("Det här skulle skapa en cykel i släktträdet.");
  });

  test("parent-child: successful save dispatches addRelationship", () => {
    selectorState = { relationships: { items: [] } }; // no cycles
    const { result } = renderHook(() => useRelationshipEditor());

    act(() => result.current.setType("parent-child"));
    act(() => {
      result.current.setParentIds(["p1", "p2"]);
      result.current.setChildId("c9");
    });

    let ok = false;
    act(() => {
      ok = result.current.save();
    });
    expect(ok).toBe(true);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "relationships/addRelationship",
      payload: {
        id: "uuid-1",
        type: "parent-child",
        parentIds: ["p1", "p2"],
        childId: "c9",
      },
    });
  });

  test("reset(null) returns to clean spouse defaults", () => {
    const { result } = renderHook(() => useRelationshipEditor());

    act(() => {
      result.current.setType("parent-child");
      result.current.setParentIds(["p1"]);
      result.current.setChildId("c1");
    });

    act(() => result.current.reset(null));

    expect(result.current.type).toBe("spouse");
    expect(result.current.groom).toBe("");
    expect(result.current.bride).toBe("");
    expect(result.current.parentIds).toEqual([]);
    expect(result.current.childId).toBe("");
  });
});

describe("useRelationshipEditor (edit existing)", () => {
  beforeEach(() => resetMocks());

  test("spouse: initializes fields from initial relationship and updates via updateRelationship", () => {
    const initial = spouseRel();
    const { result } = renderHook(() => useRelationshipEditor(initial));

    expect(result.current.isEdit).toBe(true);
    expect(result.current.type).toBe("spouse");
    expect(result.current.groom).toBe("a1");
    expect(result.current.bride).toBe("a2");

    // change a couple of fields
    act(() => {
      result.current.setBride("a3");
      result.current.setWeddingCity("Kiruna");
    });

    let ok = false;
    act(() => {
      ok = result.current.save();
    });
    expect(ok).toBe(true);

    // id should be preserved (no uuid)
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "relationships/updateRelationship",
      payload: {
        id: "rel-1",
        type: "spouse",
        person1Id: "a1",
        person2Id: "a3",
        weddingDate: "1901-01-01",
        weddingRegion: "REG",
        weddingCity: "Kiruna",
        weddingCongregation: "PAR",
      },
    });
  });

  test("parent-child: initializes from initial and updates via updateRelationship", () => {
    const initial = parentChildRel();
    const { result } = renderHook(() => useRelationshipEditor(initial));

    expect(result.current.isEdit).toBe(true);
    expect(result.current.type).toBe("parent-child");
    expect(result.current.parentIds).toEqual(["p1", "p2"]);
    expect(result.current.childId).toBe("c1");

    act(() => {
      result.current.setParentIds(["p1"]); // drop second parent
      result.current.setChildId("c2"); // change child
    });

    let ok = false;
    act(() => {
      ok = result.current.save();
    });
    expect(ok).toBe(true);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "relationships/updateRelationship",
      payload: {
        id: "rel-2",
        type: "parent-child",
        parentIds: ["p1"],
        childId: "c2",
      },
    });
  });

  test("reset(initial) swaps correctly between spouse and parent-child modes", () => {
    // start with spouse editor
    const { result } = renderHook(() => useRelationshipEditor(spouseRel()));

    expect(result.current.type).toBe("spouse");
    expect(result.current.groom).toBe("a1");
    expect(result.current.bride).toBe("a2");

    // now reset to a parent-child relationship
    act(() => result.current.reset(parentChildRel({ parentIds: ["x"], childId: "y" })));

    expect(result.current.type).toBe("parent-child");
    expect(result.current.parentIds).toEqual(["x"]);
    expect(result.current.childId).toBe("y");

    // and back to spouse
    act(() => result.current.reset(spouseRel({ person1Id: "g", person2Id: "b" })));

    expect(result.current.type).toBe("spouse");
    expect(result.current.groom).toBe("g");
    expect(result.current.bride).toBe("b");
  });

  test("spouse: empty wedding fields are emitted as undefined", () => {
    resetMocks();
    const { result } = renderHook(() => useRelationshipEditor());

    // stay in spouse mode with empty wedding fields (default)
    act(() => {
      result.current.setGroom("g1");
      result.current.setBride("b1");
    });

    let ok = false;
    act(() => {
      ok = result.current.save();
    });
    expect(ok).toBe(true);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const action = mockDispatch.mock.calls[0][0];
    expect(action.type).toBe("relationships/addRelationship");
    // hit the `|| undefined` branches
    expect(action.payload).toMatchObject({
      id: "uuid-1",
      type: "spouse",
      person1Id: "g1",
      person2Id: "b1",
      weddingDate: undefined,
      weddingRegion: undefined,
      weddingCity: undefined,
      weddingCongregation: undefined,
    });
  });

  test("reset() with no argument resets to clean spouse defaults", () => {
    resetMocks();
    // start from an initial parent-child to exercise the opposite branch in reset()
    const { result } = renderHook(() => useRelationshipEditor({
      id: "rel-x",
      type: "parent-child",
      parentIds: ["p1", "p2"],
      childId: "c1",
    }));

    // sanity: we are in parent-child mode
    expect(result.current.type).toBe("parent-child");

    // call reset() with no args (different falsy path than reset(null))
    act(() => result.current.reset());

    expect(result.current.type).toBe("spouse");
    expect(result.current.groom).toBe("");
    expect(result.current.bride).toBe("");
    expect(result.current.parentIds).toEqual([]);
    expect(result.current.childId).toBe("");
  });  
  test("spouse (edit): missing wedding fields initialize to empty strings", () => {
    resetMocks();
  
    // Spouse relationship with undefined wedding fields to hit the `?? ""` init branches
    const initial = {
      id: "rel-s0",
      type: "spouse" as const,
      person1Id: "g1",
      person2Id: "b1",
      // wedding* intentionally omitted/undefined
      weddingDate: undefined,
      weddingRegion: undefined,
      weddingCity: undefined,
      weddingCongregation: undefined,
    };
  
    const { result } = renderHook(() => useRelationshipEditor(initial));
  
    expect(result.current.type).toBe("spouse");
    expect(result.current.groom).toBe("g1");
    expect(result.current.bride).toBe("b1");
  
    // These lines cover the false side of all the `initial?.weddingX ?? ""` branches
    expect(result.current.weddingDate).toBe("");
    expect(result.current.weddingRegion).toBe("");
    expect(result.current.weddingCity).toBe("");
    expect(result.current.weddingCongregation).toBe("");
  });
  
  test("reset(spouse with missing wedding fields) sets empty strings", () => {
    resetMocks();
  
    // Start in parent-child mode so we traverse both arms of reset()
    const { result } = renderHook(() =>
      useRelationshipEditor({
        id: "rel-pc0",
        type: "parent-child",
        parentIds: ["p1"],
        childId: "c1",
      })
    );
  
    expect(result.current.type).toBe("parent-child");
  
    act(() =>
      result.current.reset({
        id: "rel-s1",
        type: "spouse",
        person1Id: "g2",
        person2Id: "b2",
        // missing wedding* fields on purpose
        weddingDate: undefined,
        weddingRegion: undefined,
        weddingCity: undefined,
        weddingCongregation: undefined,
      })
    );
  
    expect(result.current.type).toBe("spouse");
    expect(result.current.groom).toBe("g2");
    expect(result.current.bride).toBe("b2");
    // Cover the `rel.weddingX ?? ""` branches inside reset()
    expect(result.current.weddingDate).toBe("");
    expect(result.current.weddingRegion).toBe("");
    expect(result.current.weddingCity).toBe("");
    expect(result.current.weddingCongregation).toBe("");
  });
});