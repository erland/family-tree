import {
  buildGedcom,
  formatDate,
  type Individual,
  type Relationship,
} from "@core/domain";

// Helper to find lines quickly
function hasLine(lines: string[], text: string): boolean {
  return lines.some((l) => l.trim() === text.trim());
}

describe("buildGedcom", () => {
  it("returns a valid GEDCOM header and trailer", () => {
    const result = buildGedcom([], []);
    const lines = result.split("\n");
    expect(lines[0]).toBe("0 HEAD");
    expect(lines[lines.length - 1]).toBe("0 TRLR");
  });

  it("exports a single individual with basic data", () => {
    const individuals: Individual[] = [
      {
        id: "1",
        givenName: "Anna",
        familyName: "Svensson",
        gender: "female",
        dateOfBirth: "1900-01-02",
        birthCity: "Stockholm",
        birthRegion: "Uppland",
      } as Individual,
    ];

    const ged = buildGedcom(individuals, []);
    const lines = ged.split("\n");

    expect(hasLine(lines, "0 @I1@ INDI")).toBe(true);
    expect(hasLine(lines, "1 NAME Anna /Svensson/")).toBe(true);
    expect(hasLine(lines, "1 SEX F")).toBe(true);

    expect(hasLine(lines, "1 BIRT")).toBe(true);
    expect(hasLine(lines, `2 DATE ${formatDate("1900-01-02")}`)).toBe(true);
    expect(hasLine(lines, "2 PLAC Stockholm, Uppland")).toBe(true);
  });

  it("includes moves as RESI entries with date, place, and notes", () => {
    const individuals: Individual[] = [
      {
        id: "1",
        givenName: "Karl",
        familyName: "Andersson",
        gender: "male",
        moves: [
          {
            date: "1920-03-05",
            city: "Göteborg",
            region: "Västergötland",
            congregation: "Domkyrko",
            note: "Moved for work",
          },
        ],
      } as any,
    ];

    const ged = buildGedcom(individuals, []);
    const lines = ged.split("\n");

    expect(hasLine(lines, "1 RESI")).toBe(true);
    expect(hasLine(lines, `2 DATE ${formatDate("1920-03-05")}`)).toBe(true);
    expect(hasLine(lines, "2 PLAC Göteborg, Västergötland")).toBe(true);
    expect(hasLine(lines, "2 NOTE Församling: Domkyrko")).toBe(true);
    expect(hasLine(lines, "2 NOTE Moved for work")).toBe(true);
  });

  it("creates spouse and parent-child family relationships", () => {
    const anna: Individual = {
      id: "1",
      givenName: "Anna",
      familyName: "Lind",
      gender: "female",
    } as Individual;
    const erik: Individual = {
      id: "2",
      givenName: "Erik",
      familyName: "Lind",
      gender: "male",
    } as Individual;
    const child: Individual = {
      id: "3",
      givenName: "Lisa",
      familyName: "Lind",
      gender: "female",
    } as Individual;

    const relationships: Relationship[] = [
      {
        id: "r1",
        type: "spouse",
        person1Id: erik.id,
        person2Id: anna.id,
      } as Relationship,
      {
        id: "r2",
        type: "parent-child",
        parentIds: [erik.id, anna.id],
        childId: child.id,
      } as Relationship,
    ];

    const ged = buildGedcom([anna, erik, child], relationships);
    const lines = ged.split("\n");

    // Spouse family (HUSB, WIFE)
    expect(lines.some((l) => l.includes("1 HUSB"))).toBe(true);
    expect(lines.some((l) => l.includes("1 WIFE"))).toBe(true);

    // Child entry in family
    expect(lines.some((l) => l.includes("1 CHIL"))).toBe(true);

    // Child has FAMC (family as child)
    const childIndex = lines.findIndex((l) => l.includes("@I3@"));
    const childLines = lines.slice(childIndex, childIndex + 10);
    expect(childLines.some((l) => l.includes("1 FAMC @F"))).toBe(true);

    // Parents have FAMS (family as spouse)
    const annaStart = lines.findIndex((l) => l.includes("0 @I1@ INDI"));
    const annaLines = lines.slice(annaStart, annaStart + 15);

    const erikStart = lines.findIndex((l) => l.includes("0 @I2@ INDI"));
    const erikLines = lines.slice(erikStart, erikStart + 15);

    expect(annaLines.some((l) => l.includes("1 FAMS @F"))).toBe(true);
    expect(erikLines.some((l) => l.includes("1 FAMS @F"))).toBe(true);
  });

  it("exports MARR tag only for spouse relationships (not just shared parents)", () => {
    const marriedMan = {
      id: "m1",
      givenName: "MarriedMan",
      gender: "male",
    } as any;
    const marriedWoman = {
      id: "w1",
      givenName: "MarriedWoman",
      gender: "female",
    } as any;
    const unmarriedMan = {
      id: "u1",
      givenName: "UnmarriedMan",
      gender: "male",
    } as any;
    const unmarriedWoman = {
      id: "u2",
      givenName: "UnmarriedWoman",
      gender: "female",
    } as any;
    const child = { id: "c1", givenName: "Child" } as any;

    const relationships = [
      {
        id: "s1",
        type: "spouse" as const,
        person1Id: marriedMan.id,
        person2Id: marriedWoman.id,
      },
      {
        id: "p1",
        type: "parent-child" as const,
        parentIds: [marriedMan.id, marriedWoman.id],
        childId: child.id,
      },
      {
        id: "p2",
        type: "parent-child" as const,
        parentIds: [unmarriedMan.id, unmarriedWoman.id],
        childId: child.id,
      },
    ] satisfies Relationship[];

    const ged = buildGedcom(
      [marriedMan, marriedWoman, unmarriedMan, unmarriedWoman, child] as any,
      relationships as any
    );

    // Split GEDCOM into family blocks
    const famBlocks = ged
      .split(/^0 /m)
      .filter((b) => b.trim().startsWith("@F"));

    // try to identify families by who's HUSB/WIFE
    const marriedFam = famBlocks.find(
      (b) => b.includes("HUSB @I1@") || b.includes("HUSB @I2@")
    );
    const unmarriedFam = famBlocks.find(
      (b) => b.includes("HUSB @I3@") || b.includes("HUSB @I4@")
    );

    expect(typeof marriedFam).toBe("string");
    expect(typeof unmarriedFam).toBe("string");

    // Married family should contain a MARR line
    expect(marriedFam).toMatch(/1 MARR/);

    // Unmarried family should NOT contain MARR
    expect(unmarriedFam).not.toMatch(/1 MARR/);
  });

  it("exports wedding date, place, and Församling for spouse relationships", () => {
    const husband: Individual = {
      id: "1",
      givenName: "Johan",
      familyName: "Andersson",
      gender: "male",
    } as Individual;

    const wife: Individual = {
      id: "2",
      givenName: "Maria",
      familyName: "Andersson",
      gender: "female",
    } as Individual;

    const relationships: Relationship[] = [
      {
        id: "r1",
        type: "spouse",
        person1Id: husband.id,
        person2Id: wife.id,
        weddingDate: "1905-06-12",
        weddingCity: "Stockholm",
        weddingRegion: "Uppland",
        weddingCongregation: "Storkyrkan",
      } as any,
    ];

    const ged = buildGedcom([husband, wife], relationships);
    const lines = ged.split("\n");

    // Locate the FAM block (first family will be @F1@)
    const famIndex = lines.findIndex((l) => l.includes("0 @F1@ FAM"));
    expect(famIndex).toBeGreaterThan(-1);

    const famBlock = lines.slice(famIndex, famIndex + 12);

    // Ensure MARR event exists
    expect(famBlock).toContain("1 MARR");

    // Ensure date and place are formatted correctly
    expect(famBlock).toContain("2 DATE 12 JUN 1905");
    expect(famBlock).toContain("2 PLAC Stockholm, Uppland");
    expect(famBlock).toContain("2 NOTE Församling: Storkyrkan");
  });

  it("handles individuals with missing gender or partial dates gracefully", () => {
    const individuals: Individual[] = [
      {
        id: "1",
        givenName: "Unknown",
        familyName: "Person",
        gender: "unknown",
        dateOfBirth: "1950",
      } as any,
    ];

    const ged = buildGedcom(individuals, []);
    const lines = ged.split("\n");

    expect(hasLine(lines, "1 SEX U")).toBe(true);
    // just make sure the partial date shows up somewhere in a DATE line
    expect(lines.join("\n")).toContain("2 DATE 1950");
  });

  it("handles empty inputs", () => {
    const ged = buildGedcom([], []);
    expect(ged).toContain("0 HEAD");
    expect(ged).toContain("0 TRLR");
    expect(ged.split("\n").length).toBeGreaterThan(2);
  });

  it("creates new family when parents have unknown gender (fallback branch)", () => {
    const parent1 = {
      id: "p1",
      givenName: "Alex",
      gender: "unknown",
    } as any;
    const parent2 = {
      id: "p2",
      givenName: "Sam",
      gender: "unknown",
    } as any;
    const child = { id: "c1", givenName: "Charlie" } as any;

    const relationships: Relationship[] = [
      {
        id: "r1",
        type: "parent-child",
        parentIds: [parent1.id, parent2.id],
        childId: child.id,
      } as any,
    ];

    const ged = buildGedcom([parent1, parent2, child], relationships);
    const lines = ged.split("\n");

    // We should still get a FAM block with those two parents + child
    expect(lines.some((l) => l.includes("0 @F1@ FAM"))).toBe(true);
    expect(lines.some((l) => l.includes("1 CHIL @I3@"))).toBe(true);
  });

  it("exports moves correctly even when some fields are missing", () => {
    const person = {
      id: "m1",
      givenName: "Mover",
      gender: "unknown",
      moves: [
        // full move (date + place + notes)
        {
          date: "1910-01-01",
          city: "Uppsala",
          region: "Uppland",
          congregation: "Domkyrko",
          note: "Full move",
        },
        // partial move (no date, no region)
        { city: "Lund" },
        // minimal move (only congregation)
        { congregation: "Storkyrkan" },
      ],
    } as any;

    const ged = buildGedcom([person], []);
    const lines = ged.split("\n");

    // Should contain multiple RESI blocks
    const resiCount = lines.filter((l) => l.trim() === "1 RESI").length;
    expect(resiCount).toBe(3);

    const firstResiIdx = lines.findIndex((l) => l.includes("1 RESI"));
    const firstResi = lines.slice(firstResiIdx, firstResiIdx + 10);
    expect(firstResi.some((l) => l.startsWith("2 DATE"))).toBe(true);
    expect(firstResi.some((l) => l.startsWith("2 PLAC"))).toBe(true);
    expect(
      firstResi.filter((l) => l.startsWith("2 NOTE")).length
    ).toBeGreaterThanOrEqual(2);

    // Second RESI (Lund) has PLAC but no DATE
    const secondResiIdx = lines.findIndex(
      (l, i) => i > firstResiIdx && l.includes("1 RESI")
    );
    const secondResi = lines.slice(secondResiIdx, secondResiIdx + 10);
    expect(secondResi.some((l) => l.includes("2 PLAC Lund"))).toBe(true);
    expect(secondResi.every((l) => !l.startsWith("2 DATE"))).toBe(true);

    // Third RESI has only NOTE Församling
    const thirdResiIdx = lines.findIndex(
      (l, i) => i > secondResiIdx && l.includes("1 RESI")
    );
    const thirdResi = lines.slice(thirdResiIdx, thirdResiIdx + 10);
    expect(
      thirdResi.some((l) => l.includes("Församling: Storkyrkan"))
    ).toBe(true);
    expect(thirdResi.every((l) => !l.startsWith("2 PLAC"))).toBe(true);
  });

  it("exports Församling notes for birth and death events", () => {
    const individuals = [
      {
        id: "1",
        givenName: "Karl",
        familyName: "Johansson",
        gender: "male",
        dateOfBirth: "1901-02-12",
        birthCity: "Skövde",
        birthRegion: "Västergötland",
        birthCongregation: "Skara",
        dateOfDeath: "1980-04-05",
        deathCity: "Göteborg",
        deathRegion: "Västra Götaland",
        deathCongregation: "Domkyrko",
      },
    ] as any;

    const relationships: any[] = [];

    const gedcom = buildGedcom(individuals, relationships);
    const lines = gedcom.split("\n");

    // Birth block
    const birthIndex = lines.findIndex((l) => l.trim() === "1 BIRT");
    expect(birthIndex).toBeGreaterThan(-1);
    const birthBlock = lines.slice(birthIndex, birthIndex + 6);
    expect(birthBlock).toContain("2 DATE 12 FEB 1901");
    expect(birthBlock).toContain("2 PLAC Skövde, Västergötland");
    expect(birthBlock).toContain("2 NOTE Församling: Skara");

    // Death block
    const deathIndex = lines.findIndex((l) => l.trim() === "1 DEAT");
    expect(deathIndex).toBeGreaterThan(-1);
    const deathBlock = lines.slice(deathIndex, deathIndex + 6);
    expect(deathBlock).toContain("2 DATE 05 APR 1980");
    expect(deathBlock).toContain("2 PLAC Göteborg, Västra Götaland");
    expect(deathBlock).toContain("2 NOTE Församling: Domkyrko");
  });

  it("exports story field as NOTE/CONT lines", () => {
    const individuals = [
      {
        id: "1",
        givenName: "Erik",
        familyName: "Lind",
        gender: "male",
        story:
          "Born in a small village.\nLoved carpentry.\nMoved to town.",
      },
    ] as any;

    const gedcom = buildGedcom(individuals, []);
    const lines = gedcom.split("\n");

    const noteIdx = lines.findIndex((l) => l.startsWith("1 NOTE"));
    expect(noteIdx).toBeGreaterThan(-1);
    expect(lines[noteIdx]).toBe("1 NOTE Born in a small village.");
    expect(lines[noteIdx + 1]).toBe("2 CONT Loved carpentry.");
    expect(lines[noteIdx + 2]).toBe("2 CONT Moved to town.");
  });

  it("handles missing genders, undefined IDs, and incomplete families gracefully", () => {
    const individuals = [
      {
        id: "a",
        givenName: "NoGender",
        familyName: "Unknown",
        gender: "unknown",
      },
      { id: "b", givenName: "Child", familyName: "Unknown" },
    ] as any;

    const relationships = [
      {
        id: "r1",
        type: "spouse",
        person1Id: undefined,
        person2Id: "a",
      },
      {
        id: "r2",
        type: "parent-child",
        parentIds: ["a"],
        childId: "b",
      },
    ] as any;

    const gedcom = buildGedcom(individuals, relationships);
    const lines = gedcom.split("\n");

    expect(gedcom).toContain("1 SEX U"); // gender unknown still mapped to U
    expect(gedcom).toContain("0 @F1@ FAM"); // family still emitted
    expect(gedcom).toContain("1 CHIL @I2@"); // child linked
    expect(gedcom).toContain("0 TRLR"); // trailer always present
  });

  it("exports both married and birth names when they differ", () => {
    const individuals: Individual[] = [
      {
        id: "1",
        givenName: "Anna",
        familyName: "Johansson",
        birthFamilyName: "Svensson",
        gender: "female",
      } as any,
    ];

    const ged = buildGedcom(individuals, []);
    const lines = ged.split("\n");

    // Should include two NAME entries with TYPE tags
    const nameLines = lines.filter((l) => l.startsWith("1 NAME"));
    const typeLines = lines.filter((l) => l.startsWith("2 TYPE"));

    expect(nameLines.length).toBe(2);
    expect(typeLines).toContain("2 TYPE married");
    expect(typeLines).toContain("2 TYPE birth");

    // Married/current last name should appear before birth name
    const marriedIdx = lines.findIndex((l) =>
      l.includes("/Johansson/")
    );
    const birthIdx = lines.findIndex((l) =>
      l.includes("/Svensson/")
    );
    expect(marriedIdx).toBeLessThan(birthIdx);
  });

  it("exports only one NAME when birth and married names are identical", () => {
    const individuals: Individual[] = [
      {
        id: "1",
        givenName: "Karin",
        familyName: "Lindberg",
        birthFamilyName: "Lindberg",
        gender: "female",
      } as any,
    ];

    const ged = buildGedcom(individuals, []);
    const lines = ged.split("\n");

    // Should have only one NAME and no TYPE lines
    const nameLines = lines.filter((l) => l.startsWith("1 NAME"));
    const typeLines = lines.filter((l) => l.startsWith("2 TYPE"));

    expect(nameLines.length).toBe(1);
    expect(nameLines[0]).toContain("/Lindberg/");
    expect(typeLines.length).toBe(0);
  });
});