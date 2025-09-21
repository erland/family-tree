import ExcelJS from "exceljs";
import { Individual } from "../src/types/individual";
import { Relationship } from "../src/types/relationship";
import { v4 as uuidv4 } from "uuid";

function buildDate(day: any, month: any, year: any): string | undefined {
  if (!year) return undefined;
  const months = [
    "jan","feb","mar","apr","maj","jun",
    "jul","aug","sep","okt","nov","dec"
  ];
  const mIdx = month
    ? months.findIndex((m) =>
        month.toString().toLowerCase().startsWith(m)
      ) + 1
    : 1;
  const d = day ? String(day).padStart(2, "0") : "01";
  const m = String(mIdx).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export interface ImportResult {
  individuals: Individual[];
  relationships: Relationship[];
}

export async function importExcel(filePath: string): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet("Hela_släkten");
  if (!sheet) throw new Error("No sheet named Hela_släkten");

  const headerRow = sheet.getRow(1).values as string[];
  const individuals: Individual[] = [];
  const relationships: Relationship[] = [];

  const slaktskapMap: Record<string, string> = {}; // Släktskap → IndividualId

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
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
      dateOfBirth: buildDate(get("Fdag"), get("Fmån"), get("Får")),
      birthCity: get("Födelseort") ?? "",
      birthCongregation: get("Födelseförsamling") ?? "",
      birthRegion: get("Födelselän") ?? "",
      dateOfDeath: buildDate(get("Ddag"), get("Dmån"), get("Dår")),
      deathCity: get("Dödsort") ?? "",
      deathCongregation: get("Dödsförsamling") ?? "",
      deathRegion: get("Dödslän") ?? "",
      gender:
        slaktskap.endsWith("f") ? "male" :
        slaktskap.endsWith("m") ? "female" :
        "unknown",
      story: "",
    };
    individuals.push(ind);

    if (slaktskap) {
      slaktskapMap[slaktskap] = id;
    }
  });

  // Build relationships
  for (const [code, parentId] of Object.entries(slaktskapMap)) {
    if (code.length === 0) continue;
  
    // Walk back through code until no parent left
    let childCode = code.slice(0, -1);
    while (childCode.length > 0) {
      const childId = slaktskapMap[childCode];
      if (childId) {
        relationships.push({
          id: uuidv4(),
          type: "parent-child",
          parentIds: [parentId],
          childId,
        });
        break; // found the immediate child, stop
      }
      childCode = childCode.slice(0, -1); // try one step shorter
    }
  }
  
  return { individuals, relationships };
}