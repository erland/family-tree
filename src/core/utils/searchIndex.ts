// src/utils/searchIndex.ts
import Fuse from "fuse.js";
import type { Individual } from "../types/individual";
import type { Relationship } from "../types/relationship";

export type SearchEntry = {
  // identity
  id: string;

  // names
  givenName: string;
  familyName?: string;
  birthFamilyName?: string;

  // normalized (for better matches)
  fullName?: string;
  fullBirthName?: string;

  // text / notes
  story?: string;

  // birth / death
  dateOfBirth?: string;
  birthRegion?: string;
  birthCongregation?: string;
  birthCity?: string;
  dateOfDeath?: string;
  deathRegion?: string;
  deathCongregation?: string;
  deathCity?: string;

  // wedding (from spouse relationships)
  weddingRegion?: string;
  weddingCongregation?: string;
  weddingCity?: string;
  weddingDate?: string;
};

export function buildSearchEntries(
  individuals: Individual[],
  relationships: Relationship[]
): SearchEntry[] {
  const base: SearchEntry[] = individuals.map((i) => {
    const givenName = i.givenName?.trim() ?? "";
    const familyName = (i.familyName ?? i.birthFamilyName ?? "").trim();
    const birthFamilyName = (i.birthFamilyName ?? i.familyName ?? "").trim();

    return {
      id: i.id,
      givenName: i.givenName ?? "",
      familyName: i.familyName,
      birthFamilyName: i.birthFamilyName,
      story: i.story,
      dateOfBirth: i.dateOfBirth,
      birthRegion: i.birthRegion,
      birthCongregation: i.birthCongregation,
      birthCity: i.birthCity,
      dateOfDeath: i.dateOfDeath,
      deathRegion: i.deathRegion,
      deathCongregation: i.deathCongregation,
      deathCity: i.deathCity,

      // normalized fields used by Fuse (reflecting your current logic)  [oai_citation:0‡digest.txt](sediment://file_0000000095a861f4a97ece73f61960a0)
      fullName: `${givenName} ${familyName}`.trim().toLowerCase(),
      fullBirthName: `${givenName} ${birthFamilyName}`.trim().toLowerCase(),
    };
  });

  // Enrich with wedding fields from spouse relationships,
  // mirroring the current “spouseExtras” behavior.  [oai_citation:1‡digest.txt](sediment://file_0000000095a861f4a97ece73f61960a0)
  const spouseExtras: SearchEntry[] = [];
  for (const r of relationships) {
    if (r.type !== "spouse") continue;
    const p1 = individuals.find((i) => i.id === r.person1Id);
    const p2 = individuals.find((i) => i.id === r.person2Id);

    if (p1) {
      spouseExtras.push({
        id: p1.id,
        givenName: p1.givenName ?? "",
        familyName: p1.familyName,
        birthFamilyName: p1.birthFamilyName,
        story: p1.story,
        dateOfBirth: p1.dateOfBirth,
        birthRegion: p1.birthRegion,
        birthCongregation: p1.birthCongregation,
        birthCity: p1.birthCity,
        dateOfDeath: p1.dateOfDeath,
        deathRegion: p1.deathRegion,
        deathCongregation: p1.deathCongregation,
        deathCity: p1.deathCity,
        weddingDate: r.weddingDate,
        weddingRegion: r.weddingRegion,
        weddingCongregation: r.weddingCongregation,
        weddingCity: r.weddingCity,
      });
    }
    if (p2) {
      spouseExtras.push({
        id: p2.id,
        givenName: p2.givenName ?? "",
        familyName: p2.familyName,
        birthFamilyName: p2.birthFamilyName,
        story: p2.story,
        dateOfBirth: p2.dateOfBirth,
        birthRegion: p2.birthRegion,
        birthCongregation: p2.birthCongregation,
        birthCity: p2.birthCity,
        dateOfDeath: p2.dateOfDeath,
        deathRegion: p2.deathRegion,
        deathCongregation: p2.deathCongregation,
        deathCity: p2.deathCity,
        weddingDate: r.weddingDate,
        weddingRegion: r.weddingRegion,
        weddingCongregation: r.weddingCongregation,
        weddingCity: r.weddingCity,
      });
    }
  }

  return [...base, ...spouseExtras];
}

export type SearchResult = import("fuse.js").FuseResult<SearchEntry>;

export function createSearcher(entries: SearchEntry[]) {
  const fuse = new Fuse(entries, {
    keys: [
      { name: "fullName", weight: 0.6 },
      { name: "fullBirthName", weight: 0.6 },
      { name: "givenName", weight: 0.3 },
      { name: "familyName", weight: 0.3 },
      { name: "birthFamilyName", weight: 0.3 },
      { name: "story", weight: 0.1 },
      "dateOfBirth",
      "birthRegion",
      "birthCongregation",
      "birthCity",
      "dateOfDeath",
      "deathRegion",
      "deathCongregation",
      "deathCity",
      "weddingRegion",
      "weddingCongregation",
      "weddingCity",
      "weddingDate",
    ],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 1,
    includeScore: true,
  });

  return {
    search(query: string, limit = 10): SearchResult[] {
      if (!query?.trim()) return [];
      return fuse.search(query).slice(0, limit);
    },
  };
}