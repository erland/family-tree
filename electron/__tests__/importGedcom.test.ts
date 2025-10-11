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
  0 @F1@ FAM
  1 HUSB @I1@
  1 CHIL @I2@
  0 TRLR
  `;
    // This string will:
    // - hit getPlaceParts(undefined) and getPlaceParts("OnlyCity")
    // - test when currentInd.moves is undefined (since we create new INDIs without moves)
    // - trigger an unknown tag ("NOTE")
    // - include a family missing wife / no marriage
  
    const result = parseGedcomContent(gedcom);
  
    // ✅ getPlaceParts(undefined) covered via missing PLAC in BIRT
    // ✅ getPlaceParts("OnlyCity") covered via RESI OnlyCity
    // ✅ unknown tag handled (NOTE ignored)
    // ✅ missing marriage still produces parent-child rel
    const ind = result.individuals.find(i => i.givenName === "Test");
    expect(ind).toBeDefined();
    expect(ind?.moves?.[0]?.city).toBe("OnlyCity");
  
    const rels = result.relationships;
    const parentChild = rels.find(r => r.type === "parent-child");
    expect(parentChild).toBeDefined();
    // spouse relation should not be created because no MARR tag
    expect(rels.find(r => r.type === "spouse")).toBeUndefined();
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