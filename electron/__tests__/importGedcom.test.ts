import { parseGedcomContent, importGedcom } from "../importGedcom";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";

jest.mock("fs");
jest.mock("uuid", () => ({ v4: jest.fn(() => "uuid") }));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe("parseGedcomContent", () => {
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
    const result = parseGedcomContent(gedcom);
    expect(result.individuals.length).toBe(2);
    expect(result.individuals[0].givenName).toBe("Anna");
    expect(result.individuals[1].gender).toBe("male");
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
    const result = parseGedcomContent(gedcom);
    const karl = result.individuals[0];
    expect(karl.dateOfBirth).toBe("1901-11-26");
    expect(karl.birthCity).toBe("Uppsala");
    expect(karl.deathCity).toBe("Stockholm");
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
    const result = parseGedcomContent(gedcom);
    const lisa = result.individuals[0];
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
    const result = parseGedcomContent(gedcom);

    expect(result.individuals).toHaveLength(3);
    expect(result.relationships.length).toBe(2);

    const spouseRel = result.relationships.find((r) => r.type === "spouse");
    expect(spouseRel).toBeDefined();

    const parentRel = result.relationships.find((r) => r.type === "parent-child");
    expect(parentRel?.parentIds.length).toBe(2);
    expect(parentRel?.childId).toBeDefined();
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
    const result = parseGedcomContent(gedcom);
    const ind = result.individuals[0];

    expect(ind.gender).toBe("unknown");
    expect(ind.dateOfBirth).toBe("1901");
    expect(ind.birthCity).toBeUndefined();
    expect(ind.birthRegion).toBeUndefined();
  });
  it("handles missing places, undefined moves array, unknown tags, and incomplete families", () => {
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
  
    const result = parseGedcomContent(gedcom);
  
    // basic person exists
    const ind = result.individuals.find(i => i.givenName === "Test");
    expect(ind).toBeDefined();
    // RESI PLAC "OnlyCity" → covers getPlaceParts("OnlyCity")
    expect(ind?.moves?.[0]?.city).toBe("OnlyCity");
  
    // parent-child created (single parent, no MARR)
    const parentChild = result.relationships.find(r => r.type === "parent-child");
    expect(parentChild).toBeDefined();
  
    // spouse NOT created (no MARR)
    expect(result.relationships.find(r => r.type === "spouse")).toBeUndefined();
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
    const result = parseGedcomContent(gedcom);
    const move = result.individuals[0].moves?.[0];
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
    const { individuals } = parseGedcomContent(ged);
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
    const { individuals } = parseGedcomContent(ged);
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
    const { individuals, relationships } = parseGedcomContent(ged);
  
    const ind = individuals[0];
    expect(ind.gender).toBe("unknown");
    expect(ind.birthCity).toBe("JustCity");
    expect(ind.birthRegion).toBeUndefined();
    expect(ind.moves?.[0]?.congregation).toBe("MissingPlace");
  
    // incomplete family with only child should not crash
    expect(Array.isArray(relationships)).toBe(true);
  });
});

describe("importGedcom (file reading wrapper)", () => {
  it("reads GEDCOM file from disk and passes it to parser", async () => {
    mockedFs.readFileSync.mockReturnValue("0 HEAD\n0 TRLR");
    const spy = jest.spyOn(fs, "readFileSync");
    const result = await importGedcom("dummy.ged");

    expect(spy).toHaveBeenCalledWith("dummy.ged", "utf-8");
    expect(result).toHaveProperty("individuals");
    expect(result).toHaveProperty("relationships");
  });
});