import { fullName } from "../nameUtils";
import { Individual } from "../../types/individual";

describe("nameUtils", () => {
  const base: Partial<Individual> = {
    id: "1",
    givenName: "Anna",
    birthFamilyName: "Svensson",
    familyName: "Lindberg",
    gender: "female",
  };

  it("returns empty string if individual is null or undefined", () => {
    expect(fullName(null)).toBe("");
    expect(fullName(undefined as any)).toBe("");
  });

  it("combines givenName + birthFamilyName + familyName", () => {
    expect(fullName(base as Individual)).toBe("Anna Lindberg");
  });

  it("omits missing fields", () => {
    expect(fullName({ ...base, birthFamilyName: "" } as Individual))
      .toBe("Anna Lindberg");

    expect(fullName({ ...base, familyName: "" } as Individual))
      .toBe("Anna Svensson");

    expect(fullName({ ...base, givenName: "" } as Individual))
      .toBe("Lindberg");
  });

  it("returns just givenName if no last names exist", () => {
    expect(fullName({ id: "2", givenName: "Karl" } as Individual))
      .toBe("Karl");
  });
});