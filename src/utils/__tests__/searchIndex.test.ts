import { buildSearchEntries, createSearcher } from "../searchIndex";

describe("searchIndex utils", () => {
  const individuals = [
    {
      id: "i1",
      givenName: "John",
      familyName: "Doe",
      birthFamilyName: "Smith",
      story: "Moved to Sweden.",
      birthCity: "Gothenburg",
      deathCity: "Uppsala",
    },
    {
      id: "i2",
      givenName: "Jane",
      familyName: "Roe",
      story: "Researcher",
      birthCity: "Malmö",
    },
    {
      id: "i3",
      givenName: "Karin",
      familyName: "Lind",
      birthFamilyName: "Andersson",
      story: "Teacher",
      birthCity: "Lund",
    },
  ] as any[];

  const relationships = [
    {
      id: "r1",
      type: "spouse",
      person1Id: "i1",
      person2Id: "i2",
      weddingCity: "Stockholm",
      weddingRegion: "Stockholms län",
      weddingCongregation: "Klara",
      weddingDate: "1990-05-01",
    },
  ] as any[];

  describe("buildSearchEntries", () => {
    it("builds base entries for all individuals and enriches spouse wedding fields", () => {
      const entries = buildSearchEntries(individuals, relationships);

      // Base: one per individual
      const baseCount = individuals.length;

      // Spouse extras: one for each spouse side (i1 + i2) = 2
      expect(entries.length).toBe(baseCount + 2);

      // Normalized name fields are present and lowercased
      const i1Base = entries.find((e) => e.id === "i1" && e.fullName);
      expect(i1Base).toBeDefined();
      expect(i1Base?.fullName).toBe("john doe");
      expect(i1Base?.fullBirthName).toBe("john smith");

      // Enriched entries have wedding fields for both partners
      const i1Wedding = entries.find(
        (e) => e.id === "i1" && e.weddingCity === "Stockholm"
      );
      const i2Wedding = entries.find(
        (e) => e.id === "i2" && e.weddingCity === "Stockholm"
      );
      expect(i1Wedding).toBeDefined();
      expect(i2Wedding).toBeDefined();
      // Cover more wedding fields
      expect(i1Wedding?.weddingRegion).toBe("Stockholms län");
      expect(i1Wedding?.weddingCongregation).toBe("Klara");
      expect(i1Wedding?.weddingDate).toBe("1990-05-01");

      // i3 should not have wedding enrichment
      const i3Wedding = entries.find(
        (e) => e.id === "i3" && e.weddingCity === "Stockholm"
      );
      expect(i3Wedding).toBeUndefined();
    });

    it("ignores non-spouse relationships for enrichment", () => {
      const withNonSpouse = [
        ...relationships,
        {
          id: "r2",
          type: "parent-child",
          person1Id: "i1",
          person2Id: "i3",
          weddingCity: "FakeCity", // should be ignored entirely
        },
      ] as any[];

      const entries = buildSearchEntries(individuals, withNonSpouse);

      // No entry should have FakeCity since non-spouse is ignored
      expect(entries.find((e) => e.weddingCity === "FakeCity")).toBeUndefined();
    });

    it("enriches only existing partner when other spouse id is missing", () => {
      const withMissing = [
        ...relationships,
        {
          id: "r3",
          type: "spouse",
          person1Id: "i3", // exists
          person2Id: "ix", // missing
          weddingCity: "Kiruna",
        },
      ] as any[];

      const entries = buildSearchEntries(individuals, withMissing);

      // Should enrich i3 but not create phantom entries for ix
      const i3Kiruna = entries.find(
        (e) => e.id === "i3" && e.weddingCity === "Kiruna"
      );
      expect(i3Kiruna).toBeDefined();
      const phantomIx = entries.find((e) => (e as any).id === "ix");
      expect(phantomIx).toBeUndefined();
    });

    it("normalizes names with trimming and fallbacks when familyName is missing", () => {
      const extraIndividuals = [
        ...individuals,
        {
          id: "i4",
          givenName: "  ALVA  ",
          // familyName missing on purpose; should fallback to birthFamilyName
          birthFamilyName: "BERGMAN",
          story: "Artist",
        },
      ] as any[];

      const entries = buildSearchEntries(extraIndividuals, []);
      const i4 = entries.find((e) => e.id === "i4");

      expect(i4).toBeDefined();
      // fullName uses fallback to birthFamilyName and lowercases + trims
      expect(i4?.fullName).toBe("alva bergman");
      expect(i4?.fullBirthName).toBe("alva bergman");
    });
  });

  describe("createSearcher", () => {
    const entries = buildSearchEntries(individuals, relationships);
    const searcher = createSearcher(entries);

    it("returns empty array for blank queries", () => {
      expect(searcher.search("")).toEqual([]);
      expect(searcher.search("   ")).toEqual([]);
    });

    it("finds by full name (normalized)", () => {
      const res = searcher.search("john doe");
      const ids = res.map((r) => r.item.id);
      expect(ids).toContain("i1");
    });

    it("finds by birth surname via fullBirthName", () => {
      const res = searcher.search("smith");
      const ids = res.map((r) => r.item.id);
      expect(ids).toContain("i1");
    });

    it("finds by wedding city/region/congregation through spouse enrichment", () => {
      const byCity = searcher.search("Stockholm");
      expect(byCity.map((r) => r.item.id)).toEqual(
        expect.arrayContaining(["i1", "i2"])
      );

      const byRegion = searcher.search("Stockholms län");
      expect(byRegion.map((r) => r.item.id)).toEqual(
        expect.arrayContaining(["i1", "i2"])
      );

      const byCong = searcher.search("Klara");
      expect(byCong.map((r) => r.item.id)).toEqual(
        expect.arrayContaining(["i1", "i2"])
      );
    });

    it("matches on story and deathCity fields", () => {
      const byStory = searcher.search("sweden");
      expect(byStory.map((r) => r.item.id)).toContain("i1");

      const byDeath = searcher.search("Uppsala");
      expect(byDeath.map((r) => r.item.id)).toContain("i1");
    });

    it("respects the result limit parameter", () => {
      const res = searcher.search("Stockholm", 1);
      expect(res.length).toBe(1);
      // includeScore is true, score should be a number in [0,1]
      expect(typeof res[0].score).toBe("number");
      expect(res[0].score! >= 0 && res[0].score! <= 1).toBe(true);
    });
  });
});