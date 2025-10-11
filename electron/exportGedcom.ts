// src/utils/gedcom/exportGedcom.ts
import { Individual } from "../src/types/individual";
import { Relationship } from "../src/types/relationship";
import { formatDate } from "../src/utils/dateUtils.js";

/**
 * Pure GEDCOM string generator — no Electron or file system dependencies.
 * Suitable for unit tests.
 */
export function generateGedcom(
  individuals: Individual[],
  relationships: Relationship[]
): string {
  const lines: string[] = [];
  lines.push("0 HEAD");
  lines.push("1 SOUR GenealogyApp");
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5.1");
  lines.push("2 FORM LINEAGE-LINKED");
  lines.push("1 CHAR UTF-8");

  // Map IDs to GEDCOM IDs
  const indiMap: Record<string, string> = {};
  individuals.forEach((ind, idx) => (indiMap[ind.id] = `@I${idx + 1}@`));

  // Families (spouse + children)
  let famCount = 0;
  const families: Record<
    string,
    {
      husband?: string;
      wife?: string;
      children: string[];
      hasMarriage?: boolean;
      weddingDate?: string;
      weddingCity?: string;
      weddingRegion?: string;
      weddingCongregation?: string;
    }
  > = {};

  // --- Spouse relationships (FAM blocks)
  for (const rel of relationships) {
    if (rel.type === "spouse") {
      famCount++;
      const famId = `@F${famCount}@`;
      families[famId] = {
        husband: rel.person1Id ? indiMap[rel.person1Id] : undefined,
        wife: rel.person2Id ? indiMap[rel.person2Id] : undefined,
        children: [],
        hasMarriage: true,
        weddingDate: rel.weddingDate,
        weddingCity: rel.weddingCity,
        weddingRegion: rel.weddingRegion,
        weddingCongregation: rel.weddingCongregation,
      };
    }
  }

  // --- Parent-child relationships
  for (const rel of relationships) {
    if (rel.type !== "parent-child") continue;
    const child = indiMap[rel.childId];
    if (!child) continue;

    let famId = Object.entries(families).find(([_, fam]) => {
      const famParents = [fam.husband, fam.wife]
        .filter((p): p is string => Boolean(p))
        .sort();
      const relParents = rel.parentIds
        .map((pid) => indiMap[pid])
        .filter((p): p is string => Boolean(p))
        .sort();
      return famParents.join(",") === relParents.join(",");
    })?.[0];

    if (!famId) {
      famCount++;
      famId = `@F${famCount}@`;
      let husband: string | undefined;
      let wife: string | undefined;
      for (const pid of rel.parentIds) {
        const tag = indiMap[pid];
        const parent = individuals.find((i) => i.id === pid);
        if (!tag || !parent) continue;
        if (parent.gender === "male") husband = tag;
        else if (parent.gender === "female") wife = tag;
        else {
          if (!husband) husband = tag;
          else if (!wife) wife = tag;
        }
      }
      families[famId] = { husband, wife, children: [] };
    }

    families[famId].children.push(child);
  }

  // --- Reverse link maps
  const childFamilies: Record<string, string[]> = {};
  const spouseFamilies: Record<string, string[]> = {};

  for (const [famId, fam] of Object.entries(families)) {
    if (fam.husband) {
      spouseFamilies[fam.husband] ||= [];
      spouseFamilies[fam.husband].push(famId);
    }
    if (fam.wife) {
      spouseFamilies[fam.wife] ||= [];
      spouseFamilies[fam.wife].push(famId);
    }
    for (const child of fam.children) {
      childFamilies[child] ||= [];
      childFamilies[child].push(famId);
    }
  }

  // --- Individuals
  for (const ind of individuals) {
    const tag = indiMap[ind.id];
    const familyName = ind.familyName || ind.birthFamilyName || "";
    lines.push(`0 ${tag} INDI`);
    lines.push(`1 NAME ${ind.givenName || ""} /${familyName}/`);
    lines.push(`1 SEX ${ind.gender === "male" ? "M" : ind.gender === "female" ? "F" : "U"}`);

    // --- Birth
    if (ind.dateOfBirth || ind.birthCity || ind.birthRegion || ind.birthCongregation) {
      lines.push("1 BIRT");
      const d = formatDate(ind.dateOfBirth);
      if (d) lines.push(`2 DATE ${d}`);
      const place = [ind.birthCity, ind.birthRegion].filter(Boolean).join(", ");
      if (place) lines.push(`2 PLAC ${place}`);
      if (ind.birthCongregation) lines.push(`2 NOTE Församling: ${ind.birthCongregation}`);
    }

    // --- Death
    if (ind.dateOfDeath || ind.deathCity || ind.deathRegion || ind.deathCongregation) {
      lines.push("1 DEAT");
      const d = formatDate(ind.dateOfDeath);
      if (d) lines.push(`2 DATE ${d}`);
      const place = [ind.deathCity, ind.deathRegion].filter(Boolean).join(", ");
      if (place) lines.push(`2 PLAC ${place}`);
      if (ind.deathCongregation) lines.push(`2 NOTE Församling: ${ind.deathCongregation}`);
    }

    // --- Moves
    if (ind.moves?.length) {
      for (const mv of ind.moves) {
        lines.push("1 RESI");
        const d = formatDate(mv.date);
        if (d) lines.push(`2 DATE ${d}`);
        const place = [mv.city, mv.region].filter(Boolean).join(", ");
        if (place) lines.push(`2 PLAC ${place}`);
        if (mv.congregation) lines.push(`2 NOTE Församling: ${mv.congregation}`);
        if (mv.note) lines.push(`2 NOTE ${mv.note}`);
      }
    }

    // --- Story
    if (ind.story) {
      const storyLines = ind.story.split(/\r?\n/);
      for (const [i, text] of storyLines.entries()) {
        if (i === 0) lines.push(`1 NOTE ${text}`);
        else lines.push(`2 CONT ${text}`);
      }
    }

    // --- Family references
    spouseFamilies[tag]?.forEach((fid) => lines.push(`1 FAMS ${fid}`));
    childFamilies[tag]?.forEach((fid) => lines.push(`1 FAMC ${fid}`));
  }

  // --- Families section
  for (const [famId, fam] of Object.entries(families)) {
    lines.push(`0 ${famId} FAM`);
    if (fam.husband) lines.push(`1 HUSB ${fam.husband}`);
    if (fam.wife) lines.push(`1 WIFE ${fam.wife}`);

    // --- Marriage event (if applicable)
    if (fam.hasMarriage) {
      lines.push("1 MARR");
      const d = formatDate(fam.weddingDate);
      if (d) lines.push(`2 DATE ${d}`);
      const place = [fam.weddingCity, fam.weddingRegion].filter(Boolean).join(", ");
      if (place) lines.push(`2 PLAC ${place}`);
      if (fam.weddingCongregation)
        lines.push(`2 NOTE Församling: ${fam.weddingCongregation}`);
    }

    // --- Children
    for (const child of fam.children) lines.push(`1 CHIL ${child}`);
  }

  lines.push("0 TRLR");
  return lines.join("\n");
}