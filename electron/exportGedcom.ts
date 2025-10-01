import { Individual } from "../src/types/individual";
import { Relationship } from "../src/types/relationship";
import { dialog } from "@electron/remote"; // or via ipcRenderer if in renderer
import { formatDate } from "../src/utils/dateUtils.js";

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

  // Family structures
  let famCount = 0;
  const families: Record<
    string,
    { husband?: string; wife?: string; children: string[] }
  > = {};

  // Spouse relations first
  for (const rel of relationships) {
    if (rel.type === "spouse") {
      famCount++;
      const famId = `@F${famCount}@`;
      families[famId] = {
        husband: rel.person1Id ? indiMap[rel.person1Id] : undefined,
        wife: rel.person2Id ? indiMap[rel.person2Id] : undefined,
        children: [],
      };
    }
  }

  // Parent-child relations
  for (const rel of relationships) {
    if (rel.type !== "parent-child") continue;
    const child = indiMap[rel.childId];
    if (!child) continue;

    // Try to find existing family with same parents
    let famId = Object.entries(families).find(([_, fam]) => {
      const famParents = [fam.husband, fam.wife].filter(
        (p): p is string => !!p
      );
      const relParents = rel.parentIds
        .map((pid) => indiMap[pid])
        .filter((p): p is string => !!p);
      return (
        famParents.length === relParents.length &&
        famParents.every((p) => relParents.includes(p))
      );
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

  // Map of family memberships for reverse links
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

  // Export individuals
  for (const ind of individuals) {
    const tag = indiMap[ind.id];
    const familyName = ind.familyName || ind.birthFamilyName || ""
    lines.push(`0 ${tag} INDI`);
    lines.push(`1 NAME ${ind.givenName || ""} /${familyName}/`);
    if (ind.gender === "male") lines.push("1 SEX M");
    else if (ind.gender === "female") lines.push("1 SEX F");
    else lines.push("1 SEX U");

    if (ind.dateOfBirth) {
      lines.push("1 BIRT");
      const d = formatDate(ind.dateOfBirth);
      if (d) lines.push(`2 DATE ${d}`);
      if (ind.birthCity || ind.birthRegion) {
        const place = [ind.birthCity, ind.birthRegion].filter(Boolean).join(", ");
        lines.push(`2 PLAC ${place}`);
      }
    }

    if (ind.dateOfDeath) {
      lines.push("1 DEAT");
      const d = formatDate(ind.dateOfDeath);
      if (d) lines.push(`2 DATE ${d}`);
      if (ind.deathCity || ind.deathRegion) {
        const place = [ind.deathCity, ind.deathRegion].filter(Boolean).join(", ");
        lines.push(`2 PLAC ${place}`);
      }
    }

    // 🔹 Reverse family links
    if (spouseFamilies[tag]) {
      for (const famId of spouseFamilies[tag]) {
        lines.push(`1 FAMS ${famId}`);
      }
    }
    if (childFamilies[tag]) {
      for (const famId of childFamilies[tag]) {
        lines.push(`1 FAMC ${famId}`);
      }
    }
  }

  // Export families
  for (const [famId, fam] of Object.entries(families)) {
    lines.push(`0 ${famId} FAM`);
    if (fam.husband) lines.push(`1 HUSB ${fam.husband}`);
    if (fam.wife) lines.push(`1 WIFE ${fam.wife}`);
    for (const child of fam.children) {
      lines.push(`1 CHIL ${child}`);
    }
  }

  lines.push("0 TRLR");
  return lines.join("\n");
}