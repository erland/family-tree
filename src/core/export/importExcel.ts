// src/core/export/importExcelCore.ts
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";
import { buildPartialIsoDate } from "../utils/dateUtils"; // adjust relative path
import type { Individual, Relationship } from "../types";     // adjust: wherever Individual/Relationship live in core

export interface ImportResult {
  individuals: Individual[];
  relationships: Relationship[];
}

/**
 * Parse an Excel file (buffer/ArrayBuffer/Uint8Array) with sheet "Hela_släkten"
 * into { individuals, relationships }.
 *
 * This is environment-agnostic. Caller is responsible for reading the file into memory.
 */
export async function parseExcelData(
  fileData: ArrayBuffer | Uint8Array | Buffer
): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();

  // Normalize to something exceljs will accept.
  // exceljs in browser is happy with ArrayBuffer or Uint8Array.
  // exceljs in Node wants Buffer.
  let dataForExcel: ArrayBuffer | Uint8Array | Buffer = fileData;

  // If we only got ArrayBuffer, wrap it in Uint8Array (works in browser).
  if (fileData instanceof ArrayBuffer) {
    dataForExcel = new Uint8Array(fileData);
  }

  // If we're in Node and we have Uint8Array but not Buffer,
  // create a Buffer so TS stops yelling in Node builds.
  // We check typeof Buffer === "function" so this doesn't blow up in browser.
  if (
    typeof Buffer === "function" &&
    dataForExcel instanceof Uint8Array &&
    !(dataForExcel instanceof Buffer)
  ) {
    dataForExcel = Buffer.from(dataForExcel);
  }

  // Cast to any because exceljs types expect Buffer,
  // but at runtime they also accept Uint8Array/ArrayBuffer in browser.
  await workbook.xlsx.load(dataForExcel as any);

  const sheet = workbook.getWorksheet("Hela_släkten");
  if (!sheet) {
    throw new Error("No sheet named Hela_släkten");
  }

  const headerRow = sheet.getRow(1).values as string[];

  const individuals: Individual[] = [];
  const relationships: Relationship[] = [];
  const slaktskapMap: Record<string, string> = {};

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = row.values as any[];
    const get = (colName: string) => {
      const idx = headerRow.indexOf(colName);
      return idx >= 0 ? values[idx] : null;
    };

    const id = uuidv4();
    const slaktskap = get("Släktskap")?.toString().trim() ?? "";

    const ind: Individual = {
      id,
      givenName: get("Förnamn") ?? "",
      birthFamilyName: get("Efternamn 1") ?? "",
      familyName: get("Efternamn 2") ?? "",
      dateOfBirth: buildPartialIsoDate(get("Fdag"), get("Fmån"), get("Får")),
      birthCity: get("Födelseort") ?? "",
      birthCongregation: get("Födelseförsamling") ?? "",
      birthRegion: get("Födelselän") ?? "",
      dateOfDeath: buildPartialIsoDate(get("Ddag"), get("Dmån"), get("Dår")),
      deathCity: get("Dödsort") ?? "",
      deathCongregation: get("Dödsförsamling") ?? "",
      deathRegion: get("Dödslän") ?? "",
      gender:
        slaktskap.endsWith("f")
          ? "male"
          : slaktskap.endsWith("m")
          ? "female"
          : "unknown",
      story: "",
    };

    individuals.push(ind);

    if (slaktskap) {
      slaktskapMap[slaktskap] = id;
    }
  });

  // Build parent-child relationships
  const childToParents: Record<string, string[]> = {};

  for (const [code, parentId] of Object.entries(slaktskapMap)) {
    if (!code) continue;

    let childCode = code.slice(0, -1);
    while (childCode.length > 0) {
      const childId = slaktskapMap[childCode];
      if (childId) {
        if (!childToParents[childId]) {
          childToParents[childId] = [];
        }
        if (!childToParents[childId].includes(parentId)) {
          childToParents[childId].push(parentId);
        }
        break;
      }
      childCode = childCode.slice(0, -1);
    }
  }

  for (const [childId, parentIds] of Object.entries(childToParents)) {
    relationships.push({
      id: uuidv4(),
      type: "parent-child",
      parentIds,
      childId,
    } as Relationship);
  }

  return { individuals, relationships };
}