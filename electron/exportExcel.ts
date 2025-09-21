import ExcelJS from "exceljs";
import type { Column } from "exceljs";
import { app, dialog } from "electron";
import { getIndividuals, getRelationships } from "./db.js";
import { Individual } from "../src/types/individual";
import { Relationship } from "../src/types/relationship";

// Split date into [day, month name, year]
function splitDate(dateStr?: string): { day: string; month: string; year: string } {
  if (!dateStr) return { day: "", month: "", year: "" };
  const [y, m, d] = dateStr.split("-");
  const months = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
  return {
    day: d || "",
    month: months[parseInt(m || "1", 10) - 1] || "",
    year: y || "",
  };
}

// Compute Släktskap + Generation by traversing *upwards* from virtual probands
function computeCodes(
  individuals: Individual[],
  relationships: Relationship[]
): Record<string, { code: string; gen: number }> {
  const idToInd: Record<string, Individual> = {};
  for (const ind of individuals) idToInd[ind.id] = ind;

  // Build quick lookups
  const childToParents: Record<string, string[]> = {};
  const parentToChildren: Record<string, string[]> = {};

  relationships
    .filter((r) => r.type === "parent-child")
    .forEach((r) => {
      childToParents[r.childId] = (childToParents[r.childId] || []).concat(r.parentIds || []);
      (r.parentIds || []).forEach((pid) => {
        parentToChildren[pid] = (parentToChildren[pid] || []).concat(r.childId);
      });
    });

  // Gen-1 candidates (parents of a *virtual* proband): have parents, but no children
  let gen1Candidates = individuals.filter(
    (ind) => !!childToParents[ind.id] && !parentToChildren[ind.id]
  );

  // Fallback: if none found, treat everyone who *has parents* as candidate
  if (gen1Candidates.length === 0) {
    gen1Candidates = individuals.filter((ind) => !!childToParents[ind.id]);
  }

  // BFS upward from each candidate. Initial code is 'f' or 'm' by candidate's gender.
  const best: Record<string, { code: string; gen: number }> = {};

  const pushIfBetter = (id: string, code: string) => {
    const gen = code.length;
    const cur = best[id];
    if (!cur || gen < cur.gen) {
      best[id] = { code, gen };
    }
  };

  for (const start of gen1Candidates) {
    const startSuffix =
      start.gender === "male" ? "f" : start.gender === "female" ? "m" : "";
    if (!startSuffix) {
      // If we don't know the candidate's gender, we can't emit a valid f/m code for Gen-1.
      // Skip this candidate; others may cover the line.
      continue;
    }

    const queue: Array<{ id: string; code: string }> = [{ id: start.id, code: startSuffix }];

    while (queue.length) {
      const { id, code } = queue.shift()!;
      // Record best (shortest) code
      pushIfBetter(id, code);

      // Move to this person's parents, appending f/m based on *parent's* gender
      const parents = childToParents[id] || [];
      for (const pid of parents) {
        const p = idToInd[pid];
        if (!p) continue;

        const step =
          p.gender === "male" ? "f" : p.gender === "female" ? "m" : "";
        if (!step) {
          // If parent's gender unknown, we can't produce a canonical f/m step for Excel — skip
          continue;
        }

        const nextCode = code + step;

        // Only enqueue if we can potentially improve (shorter code) or this parent unvisited
        const cur = best[pid];
        if (!cur || nextCode.length < cur.gen) {
          queue.push({ id: pid, code: nextCode });
        }
      }
    }
  }

  return best; // id -> { code, gen }
}

function computeLinjeId(code: string): number {
  if (code === "f") return 1;
  if (code === "m") return 2;

  let id = 0;
  let cur = "";
  for (const c of code) {
    cur += c;
    if (cur === "f") {
      id = 1;
    } else if (cur === "m") {
      id = 2;
    } else {
      const parentCode = cur.slice(0, -1);
      const parentId = computeLinjeId(parentCode);
      id = c === "f" ? parentId * 2 + 1 : parentId * 2 + 2;
    }
  }
  return id;
}

function formatSlaktskap(raw: string): string {
  if (!raw) return "";
  const parts: string[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    parts.push(raw.slice(i, i + 2));
  }
  return parts.join(" ");
}

/**
 * Export individuals in "Hela_släkten" format
 */
export async function exportExcel(
  individuals: Individual[],
  relationships: Relationship[],
  filePath: string
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hela_släkten");

  // Headers
  const headerRow = sheet.addRow([
    "LinjeId",
    "Rad",
    "Generation",
    "Släktskap",
    "Förnamn",
    "Efternamn 1",
    "Efternamn 2",
    "Fdag", "Fmån", "Får",
    "Födelseort", "Födelseförsamling", "Födelselän",
    "Ddag", "Dmån", "Dår",
    "Dödsort", "Dödsförsamling", "Dödslän",
  ]);

  // Make header bold
  headerRow.font = { bold: true };

  const indToCodeGen = computeCodes(individuals, relationships);

  individuals.forEach((ind, index) => {
    const b = splitDate(ind.dateOfBirth);
    const d = splitDate(ind.dateOfDeath);
  
    const rawCode = indToCodeGen[ind.id]?.code ?? "";
    const gen = rawCode.length;
    const linjeId = rawCode ? computeLinjeId(rawCode) : 0;
    const code = formatSlaktskap(rawCode); // "ff f", "ff ff", etc.
    const rad = index + 2; // Excel row (header + 1)
  
    sheet.addRow([
      linjeId,
      rad,
      gen,
      code,
      ind.givenName ?? "",
      ind.birthFamilyName ?? "",
      ind.familyName ?? "",
      b.day, b.month, b.year,
      ind.birthCity ?? "",
      ind.birthCongregation ?? "",
      ind.birthRegion ?? "",
      d.day, d.month, d.year,
      ind.deathCity ?? "",
      ind.deathCongregation ?? "",
      ind.deathRegion ?? "",
    ]);
  });

  // Adjust column widths automatically (based on header text length)
  sheet.columns.forEach((col) => {
    const column = col as Column; // cast to suppress TS optional errors
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : "";
      if (val.length > maxLength) {
        maxLength = val.length;
      }
    });
    column.width = maxLength + 2;
  });

  await workbook.xlsx.writeFile(filePath);
}

/**
 * Export relationships to Excel with Swedish headers and names
 */
export async function exportRelationshipsExcel() {
  const relationships = await getRelationships();
  const individuals = await getIndividuals();
  const byId: Record<string, any> = Object.fromEntries(
    individuals.map((i: any) => [i.id, i])
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relationer");

  // Define headers
  sheet.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "Typ", key: "type", width: 15 },
    { header: "Person 1 (ID)", key: "person1Id", width: 36 },
    { header: "Person 1 (Namn)", key: "person1Name", width: 25 },
    { header: "Person 2 (ID)", key: "person2Id", width: 36 },
    { header: "Person 2 (Namn)", key: "person2Name", width: 25 },
    { header: "Barn (ID)", key: "childId", width: 36 },
    { header: "Barn (Namn)", key: "childName", width: 25 },
    { header: "Föräldrar (ID)", key: "parentIds", width: 40 },
    { header: "Föräldrar (Namn)", key: "parentNames", width: 40 },
    { header: "Vigseldatum", key: "weddingDate", width: 15 },
    { header: "Region (man)", key: "groomRegion", width: 20 },
    { header: "Församling (man)", key: "groomCongregation", width: 20 },
    { header: "Stad (man)", key: "groomCity", width: 20 },
    { header: "Region (kvinna)", key: "brideRegion", width: 20 },
    { header: "Församling (kvinna)", key: "brideCongregation", width: 20 },
    { header: "Stad (kvinna)", key: "brideCity", width: 20 },
  ];

  // Add rows
  relationships.forEach((r: any) => {
    const person1Name = r.person1Id ? byId[r.person1Id]?.givenName ?? "" : "";
    const person2Name = r.person2Id ? byId[r.person2Id]?.givenName ?? "" : "";
    const childName = r.childId ? byId[r.childId]?.givenName ?? "" : "";

    const parentIds = Array.isArray(r.parentIds) ? r.parentIds : [];
    const parentNames = parentIds
      .map((pid: string) => byId[pid]?.givenName ?? "")
      .filter(Boolean)
      .join(", ");

    sheet.addRow({
      id: r.id ?? "",
      type: r.type ?? "",
      person1Id: r.person1Id ?? "",
      person1Name,
      person2Id: r.person2Id ?? "",
      person2Name,
      childId: r.childId ?? "",
      childName,
      parentIds: parentIds.join(", "),
      parentNames,
      weddingDate: r.weddingDate ?? "",
      groomRegion: r.groomRegion ?? "",
      groomCongregation: r.groomCongregation ?? "",
      groomCity: r.groomCity ?? "",
      brideRegion: r.brideRegion ?? "",
      brideCongregation: r.brideCongregation ?? "",
      brideCity: r.brideCity ?? "",
    });
  });

  // Style header row
  sheet.getRow(1).font = { bold: true };

  // Save dialog
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: "Exportera relationer till Excel",
    defaultPath: "relationships.xlsx",
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
  });

  if (!canceled && filePath) {
    await workbook.xlsx.writeFile(filePath);
    return { success: true, path: filePath };
  }

  return { success: false };
}