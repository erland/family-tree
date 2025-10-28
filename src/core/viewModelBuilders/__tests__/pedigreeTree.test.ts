import { pickRootById, derivePedigreeTreeState } from "../pedigreeTree";

const makeIndividual = (id: string, givenName = "Test") =>
  ({ id, givenName } as any);

describe("pickRootById", () => {
  it("returns matching individual as both root and selected", () => {
    const people = [makeIndividual("a", "Alice"), makeIndividual("b", "Bob")];

    const result = pickRootById(people, "b");

    expect(result.root?.id).toBe("b");
    expect(result.selected?.id).toBe("b");
  });

  it("returns nulls if not found", () => {
    const people = [makeIndividual("a", "Alice")];

    const result = pickRootById(people, "zzz");

    expect(result.root).toBeNull();
    expect(result.selected).toBeNull();
  });
});

describe("derivePedigreeTreeState", () => {
  it("exposes rootId when root exists", () => {
    const alice = makeIndividual("a", "Alice");

    const derived = derivePedigreeTreeState(alice);

    expect(derived.rootId).toBe("a");
  });

  it("omits rootId when root is null", () => {
    const derived = derivePedigreeTreeState(null);

    expect(derived.rootId).toBeUndefined();
  });
});