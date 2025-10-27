// src/core/export/excelExportCore.ts
import ExcelJS from "exceljs";
import type { Column } from "exceljs";
import { splitIsoDate } from "..//utils/dateUtils"; // adjust path
import { fullName } from "../utils/nameUtils";     // adjust path
import type { Individual } from "../types";           // adjust path
import type { Relationship } from "../types";

/**
 * Build quick relationship lookup and compute the ancestry "code" string
 * and gen index for each individual.
 */
function computeCodes(
  individuals: Individual[],
  relationships: Relationship[]
): Record<string, { code: string; gen: number }> {
  const idToInd: Record<string, Individual> = {};
  for (const ind of individuals) idToInd[ind.id] = ind;

  // Build child->parents, parent->children
  const childToParents: Record<string, string[]> = {};
  const parentToChildren: Record<string, string[]> = {};

  relationships
    .filter((r) => r.type === "parent-child")
    .forEach((r: any) => {
      const pids = r.parentIds || [];
      childToParents[r.childId] = (childToParents[r.childId] || []).concat(pids);
      pids.forEach((pid: string) => {
        parentToChildren[pid] = (parentToChildren[pid] || []).concat(r.childId);
      });
    });

  // Gen-1 start points: have parents but no children.
  // fallback: anyone who has parents.
  let gen1Candidates = individuals.filter(
    (ind) => !!childToParents[ind.id] && !parentToChildren[ind.id]
  );
  if (gen1Candidates.length === 0) {
    gen1Candidates = individuals.filter((ind) => !!childToParents[ind.id]);
  }

  // For each start, BFS upward and assign shortest code to each ancestor
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
      start.gender === "male"
        ? "f"
        : start.gender === "female"
        ? "m"
        : "";
    if (!startSuffix) continue;

    const queue: Array<{ id: string; code: string }> = [
      { id: start.id, code: startSuffix },
    ];

    while (queue.length) {
      const { id, code } = queue.shift()!;
      pushIfBetter(id, code);

      const parents = childToParents[id] || [];
      for (const pid of parents) {
        const p = idToInd[pid];
        if (!p) continue;

        const step =
          p.gender === "male" ? "f" : p.gender === "female" ? "m" : "";
        if (!step) continue;

        const nextCode = code + step;

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
 * Build an ExcelJS workbook for individuals in the "Hela_släkten" format.
 * Caller will decide how/where to persist or download it.
 */
export function buildIndividualsWorkbook(
  individuals: Individual[],
  relationships: Relationship[]
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hela_släkten");

  // Header row
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
  headerRow.font = { bold: true };

  const indToCodeGen = computeCodes(individuals, relationships);

  individuals.forEach((ind, index) => {
    const b = splitIsoDate(ind.dateOfBirth);
    const d = splitIsoDate(ind.dateOfDeath);

    const rawCode = indToCodeGen[ind.id]?.code ?? "";
    const gen = rawCode.length;
    const linjeId = rawCode ? computeLinjeId(rawCode) : 0;
    const code = formatSlaktskap(rawCode);
    const rad = index + 2; // row number in Excel if header is row 1

    sheet.addRow([
      linjeId,
      rad,
      gen,
      code,
      ind.givenName ?? "",
      ind.birthFamilyName ?? "",
      ind.familyName ?? "",
      b.day,
      b.monthName,
      b.year,
      ind.birthCity ?? "",
      ind.birthCongregation ?? "",
      ind.birthRegion ?? "",
      d.day,
      d.monthName,
      d.year,
      ind.deathCity ?? "",
      ind.deathCongregation ?? "",
      ind.deathRegion ?? "",
    ]);
  });

  // Autofit columns based on content
  sheet.columns.forEach((col) => {
    const column = col as Column;
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : "";
      if (val.length > maxLength) maxLength = val.length;
    });
    column.width = maxLength + 2;
  });

  return workbook;
}

/**
 * Build an ExcelJS workbook for relationships
 * with Swedish headers and human-readable names.
 */
export function buildRelationshipsWorkbook(
  individuals: Individual[],
  relationships: Relationship[]
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relationer");

  // header definitions
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
    { header: "Region", key: "weddingRegion", width: 20 },
    { header: "Församling", key: "weddingCongregation", width: 20 },
    { header: "Stad", key: "weddingCity", width: 20 },
  ];

  // index individuals by id for name lookup
  const byId: Record<string, Individual> = Object.fromEntries(
    individuals.map((ind) => [ind.id, ind])
  );

  relationships.forEach((r: any) => {
    const parentIds = Array.isArray(r.parentIds) ? r.parentIds : [];

    sheet.addRow({
      id: r.id ?? "",
      type: r.type ?? "",
      person1Id: r.person1Id ?? "",
      person1Name: fullName(byId[r.person1Id]),
      person2Id: r.person2Id ?? "",
      person2Name: fullName(byId[r.person2Id]),
      childId: r.childId ?? "",
      childName: fullName(byId[r.childId]),
      parentIds: parentIds.join(", "),
      parentNames: parentIds
        .map((pid: string) => fullName(byId[pid]))
        .filter(Boolean)
        .join(", "),
      weddingDate: r.weddingDate ?? "",
      weddingRegion: r.weddingRegion ?? "",
      weddingCongregation: r.weddingCongregation ?? "",
      weddingCity: r.weddingCity ?? "",
    });
  });

  sheet.getRow(1).font = { bold: true };

  return workbook;
}