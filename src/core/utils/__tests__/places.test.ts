import { buildPlacesIndex, expandRelatedPlaces, PlaceInfo } from "../places";
import { Individual } from "../../types/individual";
import { Relationship } from "../../types/relationship";

function ind(id: string, data: Partial<Individual>): Individual {
  return {
    id,
    givenName: "Test",
    familyName: "Person",
    gender: "unknown",
    ...data,
  } as unknown as Individual;
}

describe("utils/places.ts", () => {
  describe("buildPlacesIndex", () => {
    it("includes birth and death places", () => {
      const individuals: Individual[] = [
        ind("1", { birthCity: "Luleå", dateOfBirth: "1900-01-01" }),
        ind("2", { deathCity: "Luleå", dateOfDeath: "1950-01-01" }),
      ];

      const result = buildPlacesIndex(individuals);

      const lulea = result.find((p) => p.name === "Luleå");
      expect(lulea).toBeTruthy();
      expect(lulea!.individuals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ event: "Födelse" }),
          expect.objectContaining({ event: "Död" }),
        ])
      );
    });

    it("includes move events", () => {
      const individuals: Individual[] = [
        ind("1", {
          moves: [
            { id: "m1", city: "Göteborg", date: "1920-05-01" },
            { id: "m2", city: "Kiruna", date: "1930-10-10" },
          ],
        }),
      ];

      const result = buildPlacesIndex(individuals);
      const goteborg = result.find((p) => p.name === "Göteborg");
      const kiruna = result.find((p) => p.name === "Kiruna");

      expect(goteborg).toBeTruthy();
      expect(kiruna).toBeTruthy();
      expect(goteborg!.individuals[0].event).toBe("Flytt");
      expect(goteborg!.individuals[0].date).toBe("1920-05-01");
    });

    it("includes wedding events from relationships", () => {
      const individuals: Individual[] = [
        ind("1", {}),
        ind("2", {}),
      ];
      const relationships: Relationship[] = [
        {
          id: "r1",
          type: "spouse",
          person1Id: "1",
          person2Id: "2",
          weddingCity: "Stockholm",
          weddingDate: "1930-06-15",
        } as any,
      ];

      const result = buildPlacesIndex(individuals, relationships);
      const sthlm = result.find((p) => p.name === "Stockholm");
      expect(sthlm).toBeTruthy();
      const events = sthlm!.individuals.map((e) => e.event);
      expect(events).toContain("Vigsel");
      expect(sthlm!.individuals.length).toBe(2); // both spouses
    });

    it("sorts events by date within a place", () => {
      const individuals: Individual[] = [
        ind("1", { birthCity: "Luleå", dateOfBirth: "1900-01-01" }),
        ind("2", { birthCity: "Luleå", dateOfBirth: "1890-01-01" }),
      ];
      const result = buildPlacesIndex(individuals);
      const lulea = result.find((p) => p.name === "Luleå");
      expect(lulea!.individuals[0].ind.id).toBe("2");
      expect(lulea!.individuals[1].ind.id).toBe("1");
    });

    it("sorts places alphabetically by name (Swedish locale)", () => {
      const individuals: Individual[] = [
        ind("1", { birthCity: "Åre" }),
        ind("2", { birthCity: "Älmhult" }),
        ind("3", { birthCity: "Örebro" }),
        ind("4", { birthCity: "Boden" }),
      ];

      const result = buildPlacesIndex(individuals);
      const names = result.map((p) => p.name);
      // Swedish order: A–B–...–Å–Ä–Ö
      expect(names).toEqual(["Boden", "Åre", "Älmhult", "Örebro"]);
    });

    it("ignores undefined or empty city names", () => {
      const individuals: Individual[] = [
        ind("1", { birthCity: undefined }),
        ind("2", { birthCity: "" }),
      ];
      const result = buildPlacesIndex(individuals);
      expect(result.length).toBe(0);
    });
    it("skips individuals when city is only whitespace", () => {
      const individuals = [ind("1", { birthCity: "   " })];
      const result = buildPlacesIndex(individuals);
      expect(result.length).toBe(0);
    });
    
    it("ignores relationships without weddingCity or with non-spouse type", () => {
      const individuals = [ind("1", {}), ind("2", {})];
      const relationships = [
        { id: "r1", type: "parent", person1Id: "1", person2Id: "2" }, // should be ignored
        { id: "r2", type: "spouse", person1Id: "1", person2Id: "2" }, // missing weddingCity
      ] as any;
      const result = buildPlacesIndex(individuals, relationships);
      expect(result.find((p) => p.name === undefined)).toBeFalsy();
    });
  });

  describe("expandRelatedPlaces", () => {
    const mockPlaces: PlaceInfo[] = [
      { name: "Brändön", individuals: [] },
      { name: "Brändön?", individuals: [] },
      { name: "Brändön 1", individuals: [] },
      { name: "Brändön 2", individuals: [] },
      { name: "Boden", individuals: [] },
    ];

    it("returns all variants for a base name", () => {
      const result = expandRelatedPlaces(mockPlaces, "Brändön");
      const names = result.map((p) => p.name);
      expect(names).toEqual(
        expect.arrayContaining(["Brändön", "Brändön?", "Brändön 1", "Brändön 2"])
      );
    });

    it("returns only the exact match for numbered places", () => {
      const result = expandRelatedPlaces(mockPlaces, "Brändön 1");
      expect(result.map((p) => p.name)).toEqual(["Brändön 1"]);
    });

    it("returns only the exact match for uncertain places (ending with '?')", () => {
      const result = expandRelatedPlaces(mockPlaces, "Brändön?");
      expect(result.map((p) => p.name)).toEqual(["Brändön?"]);
    });

    it("returns an empty list if no matches", () => {
      const result = expandRelatedPlaces(mockPlaces, "Nonexistent");
      expect(result.length).toBe(0);
    });
  });
});