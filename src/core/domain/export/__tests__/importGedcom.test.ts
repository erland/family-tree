import { parseGedcomToData } from "../importGedcom";
import { v4 as uuidv4 } from "uuid";
import type { Individual, Relationship } from "@core/domain";

jest.mock("uuid", () => ({
  v4: jest.fn(() => "uuid"),
}));

const mockedUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe("parseGedcomToData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("imports basic individuals and names", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Anna /Svensson/
1 SEX F
0 @I2@ INDI
1 NAME Erik /Karlsson/
1 SEX M
0 TRLR
`;

    const result = parseGedcomToData(gedcom);
    expect(result.individuals.length).toBe(2);

    const [anna, erik] = result.individuals;
    expect(anna.givenName).toBe("Anna");
    expect(anna.familyName).toBe("Svensson");
    expect(anna.gender).toBe("female");

    expect(erik.givenName).toBe("Erik");
    expect(erik.familyName).toBe("Karlsson");
    expect(erik.gender).toBe("male");
  });

  it("parses birth and death events with dates and places", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Karl /Andersson/
1 SEX M
1 BIRT
2 DATE 26 NOV 1901
2 PLAC Uppsala, Uppland
1 DEAT
2 DATE 3 MAY 1980
2 PLAC Stockholm, Uppland
0 TRLR
`;

    const { individuals } = parseGedcomToData(gedcom);
    const karl = individuals[0];

    expect(karl.dateOfBirth).toBe("1901-11-26");
    expect(karl.birthCity).toBe("Uppsala");
    expect(karl.birthRegion).toBe("Uppland");

    expect(karl.dateOfDeath).toBe("1980-05-03");
    expect(karl.deathCity).toBe("Stockholm");
    expect(karl.deathRegion).toBe("Uppland");
  });

  it("imports moves (RESI) correctly into moves array", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Lisa /Johansson/
1 RESI
2 DATE 5 JAN 1930
2 PLAC Lund, Skåne
1 RESI
2 PLAC Malmö, Skåne
0 TRLR
`;

    const { individuals } = parseGedcomToData(gedcom);
    const lisa = individuals[0];

    expect(lisa.moves).toHaveLength(2);

    expect(lisa.moves?.[0]).toMatchObject({
      date: "1930-01-05",
      city: "Lund",
      region: "Skåne",
    });

    expect(lisa.moves?.[1]).toMatchObject({
      city: "Malmö",
      region: "Skåne",
      date: undefined,
    });

    // each move got an id from uuid
    expect(lisa.moves?.[0].id).toBe("uuid");
    expect(lisa.moves?.[1].id).toBe("uuid");
    expect(mockedUuid).toHaveBeenCalled();
  });

  it("imports families with marriage and children correctly", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Johan /Nilsson/
1 SEX M
0 @I2@ INDI
1 NAME Maria /Nilsson/
1 SEX F
0 @I3@ INDI
1 NAME Sara /Nilsson/
1 SEX F
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
0 TRLR
`;

    const result = parseGedcomToData(gedcom);

    expect(result.individuals).toHaveLength(3);
    expect(result.relationships.length).toBe(2);

    const spouseRel = result.relationships.find((r) => r.type === "spouse");
    const parentRel = result.relationships.find(
      (r) => r.type === "parent-child"
    );

    // spouse rel must exist because of MARR
    expect(spouseRel).toBeDefined();
    expect(spouseRel?.person1Id).toBeDefined();
    expect(spouseRel?.person2Id).toBeDefined();

    // parent-child must exist with 2 parents + 1 child
    expect(parentRel).toBeDefined();
    expect(parentRel?.parentIds.length).toBe(2);
    expect(parentRel?.childId).toBeDefined();
  });

  it("imports wedding date, place, and Församling correctly", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Johan /Andersson/
1 SEX M
0 @I2@ INDI
1 NAME Maria /Andersson/
1 SEX F
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 12 JUN 1905
2 PLAC Stockholm, Uppland
2 NOTE Församling: Storkyrkan
0 TRLR
`;

    const { relationships } = parseGedcomToData(gedcom);
    const marriage = relationships.find((r) => r.type === "spouse");

    expect(marriage).toBeDefined();
    expect(marriage?.weddingDate).toBe("1905-06-12");
    expect(marriage?.weddingCity).toBe("Stockholm");
    expect(marriage?.weddingRegion).toBe("Uppland");
    expect(marriage?.weddingCongregation).toBe("Storkyrkan");
  });

  it("imports spouse relationships only when MARR tag is present", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Man /Married/
1 SEX M
0 @I2@ INDI
1 NAME Woman /Married/
1 SEX F
0 @I3@ INDI
1 NAME Child /Married/
1 SEX F
0 @I4@ INDI
1 NAME Man /Unmarried/
1 SEX M
0 @I5@ INDI
1 NAME Woman /Unmarried/
1 SEX F
0 @I6@ INDI
1 NAME Child /Unmarried/
1 SEX F
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
0 @F2@ FAM
1 HUSB @I4@
1 WIFE @I5@
1 CHIL @I6@
0 TRLR
`;

    const { relationships } = parseGedcomToData(gedcom);

    const spouseRels = relationships.filter((r) => r.type === "spouse");
    const parentChildRels = relationships.filter(
      (r) => r.type === "parent-child"
    );

    // Only the married couple (with MARR) should show up as spouse relationship
    expect(spouseRels.length).toBe(1);

    // Both families (married + unmarried) should appear as parent-child relationships
    expect(parentChildRels.length).toBeGreaterThanOrEqual(2);
  });

  it("handles missing gender, missing places, and unknown tags gracefully", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Unknown /
1 BIRT
2 DATE 1901
0 TRLR
`;

    const { individuals } = parseGedcomToData(gedcom);
    const ind = individuals[0];

    expect(ind.gender).toBe("unknown");
    expect(ind.dateOfBirth).toBe("1901");
    expect(ind.birthCity).toBeUndefined();
    expect(ind.birthRegion).toBeUndefined();
  });

  it("handles missing places, single-parent families, and RESI data with partial PLAC", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Test /Person/
1 SEX U
1 BIRT
2 DATE 2000
1 RESI
2 PLAC OnlyCity
1 NOTE Some note that should be ignored
0 @I2@ INDI
1 NAME Child /Person/
1 SEX U
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
0 TRLR
`;

    const { individuals, relationships } = parseGedcomToData(gedcom);

    const ind = individuals.find((i) => i.givenName === "Test");
    expect(ind).toBeDefined();

    // RESI PLAC "OnlyCity" -> city only, no region
    expect(ind?.moves?.[0]?.city).toBe("OnlyCity");
    expect(ind?.moves?.[0]?.region).toBeUndefined();

    // single-parent family still becomes parent-child
    const parentChild = relationships.find((r) => r.type === "parent-child");
    expect(parentChild).toBeDefined();

    // no MARR => no spouse rel
    const spouseRel = relationships.find((r) => r.type === "spouse");
    expect(spouseRel).toBeUndefined();
  });

  it("parses Församling and note from RESI NOTE lines", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Karin /Larsson/
1 RESI
2 DATE 5 MAR 1920
2 PLAC Skövde, Västergötland
2 NOTE Församling: Skara
2 NOTE Flyttade efter giftermål
0 TRLR
`;

    const { individuals } = parseGedcomToData(gedcom);
    const move = individuals[0].moves?.[0];

    expect(move?.congregation).toBe("Skara");
    expect(move?.note).toBe("Flyttade efter giftermål");
  });

  it("parses Församling for birth and death events", () => {
    const ged = `
0 HEAD
0 @I1@ INDI
1 NAME Karl /Johansson/
1 BIRT
2 DATE 12 FEB 1901
2 PLAC Skövde, Västergötland
2 NOTE Församling: Skara
1 DEAT
2 DATE 5 APR 1980
2 PLAC Göteborg, Västra Götaland
2 NOTE Församling: Domkyrko
0 TRLR
`;

    const { individuals } = parseGedcomToData(ged);
    const ind = individuals[0];

    expect(ind.birthCongregation).toBe("Skara");
    expect(ind.deathCongregation).toBe("Domkyrko");
  });

  it("imports story NOTE/CONT lines into Individual.story", () => {
    const ged = `
0 HEAD
0 @I1@ INDI
1 NAME Erik /Lind/
1 SEX M
1 NOTE Born in a small village.
2 CONT Loved carpentry.
2 CONT Moved to town.
0 TRLR
`;

    const { individuals } = parseGedcomToData(ged);

    expect(individuals[0].story).toBe(
      "Born in a small village.\nLoved carpentry.\nMoved to town."
    );
  });

  it("handles malformed lines, unknown tags, and incomplete families", () => {
    const ged = `
0 HEAD
0 @I1@ INDI
1 NAME Test /Person/
1 SEX X
1 ABC nonsense
1 BIRT
2 PLAC JustCity
1 RESI
2 NOTE Församling: MissingPlace
0 @F1@ FAM
1 CHIL @I1@
0 TRLR
`;

    const { individuals, relationships } = parseGedcomToData(ged);

    const ind = individuals[0];
    expect(ind.gender).toBe("unknown");
    expect(ind.birthCity).toBe("JustCity");
    expect(ind.birthRegion).toBeUndefined();
    expect(ind.moves?.[0]?.congregation).toBe("MissingPlace");

    // still returns an array of rels
    expect(Array.isArray(relationships)).toBe(true);
  });

  it("imports both married and birth family names when TYPE lines are present", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Anna /Johansson/
2 TYPE married
1 NAME Anna /Svensson/
2 TYPE birth
1 SEX F
0 TRLR
`;

    const { individuals } = parseGedcomToData(gedcom);
    const anna = individuals[0];

    expect(anna.givenName).toBe("Anna");
    expect(anna.familyName).toBe("Johansson");       // current/married
    expect(anna.birthFamilyName).toBe("Svensson");   // birth
    expect(anna.gender).toBe("female");
  });

  it("imports single NAME without TYPE as normal familyName only", () => {
    const gedcom = `
0 HEAD
0 @I1@ INDI
1 NAME Erik /Karlsson/
1 SEX M
0 TRLR
`;

    const { individuals } = parseGedcomToData(gedcom);
    const erik = individuals[0];

    expect(erik.givenName).toBe("Erik");
    expect(erik.familyName).toBe("Karlsson");
    expect(erik.birthFamilyName).toBeUndefined();
    expect(erik.gender).toBe("male");
  });
});