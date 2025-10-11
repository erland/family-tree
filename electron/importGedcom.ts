// electron/importGedcom.ts
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Individual } from "../src/types/individual";
import { Relationship } from "../src/types/relationship";
import { parseGedcomDate } from "../src/utils/dateUtils.js";

export interface ImportResult {
  individuals: Individual[];
  relationships: Relationship[];
}

interface FamilyBlock {
  tag: string;
  husband?: string;
  wife?: string;
  children: string[];
  hasMarriage?: boolean;
}

export async function importGedcom(filePath: string): Promise<ImportResult> {
  const content = fs.readFileSync(filePath, "utf-8");
  return parseGedcomContent(content);
}

export function parseGedcomContent(content: string): ImportResult {
  const lines = content.split(/\r?\n/);

  const individuals: Individual[] = [];
  const relationships: Relationship[] = [];
  const idMap: Record<string, string> = {};

  let currentInd: Individual | null = null;
  let currentFam: FamilyBlock | null = null;
  const families: FamilyBlock[] = [];

  const getPlaceParts = (plac?: string) => {
    if (!plac) return {};
    const [city, region] = plac.split(",").map((s) => s.trim());
    return { city, region };
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line) continue;

    const [level, tag, ...rest] = line.split(" ");
    const data = rest.join(" ");

    if (level === "0" && tag.startsWith("@I")) {
      if (currentInd) individuals.push(currentInd);
      const id = uuidv4();
      idMap[tag] = id;
      currentInd = {
        id,
        givenName: "",
        familyName: "",
        gender: "unknown",
        story: "",
        moves: [], // 👈 new: track moves
      } as Individual;
      continue;
    }

    if (currentInd) {
      if (level === "1" && tag === "NAME") {
        const [given, famRaw] = data.split("/");
        currentInd.givenName = given.trim();
        currentInd.familyName = famRaw?.trim() ?? "";
      } else if (level === "1" && tag === "SEX") {
        currentInd.gender = data === "M" ? "male" : data === "F" ? "female" : "unknown";
      } else if (level === "1" && (tag === "BIRT" || tag === "DEAT")) {
        const isBirth = tag === "BIRT";
        let date: string | undefined;
        let plac: string | undefined;
        let congregation: string | undefined;
      
        for (let j = idx + 1; j < lines.length; j++) {
          const sub = lines[j].trim();
          if (sub.startsWith("1 ")) break;
          if (sub.includes("2 DATE")) date = sub.split("2 DATE")[1]?.trim();
          else if (sub.includes("2 PLAC")) plac = sub.split("2 PLAC")[1]?.trim();
          else if (sub.includes("2 NOTE")) {
            const text = sub.split("2 NOTE")[1]?.trim();
            if (text?.toLowerCase().startsWith("församling:")) {
              congregation = text.substring("Församling:".length).trim();
            }
          }
        }
      
        const { city, region } = getPlaceParts(plac);
        const parsedDate = parseGedcomDate(date);
      
        if (isBirth) {
          currentInd.dateOfBirth = parsedDate;
          currentInd.birthCity = city;
          currentInd.birthRegion = region;
          if (congregation) currentInd.birthCongregation = congregation;
        } else {
          currentInd.dateOfDeath = parsedDate;
          currentInd.deathCity = city;
          currentInd.deathRegion = region;
          if (congregation) currentInd.deathCongregation = congregation;
        }
      }

      // 👇 NEW: parse move events (GEDCOM tag RESI)
      else if (level === "1" && tag === "RESI") {
        let date: string | undefined;
        let plac: string | undefined;
        let congregation: string | undefined;
        let note: string | undefined;
      
        // Parse all sub-lines until next level-1 tag
        for (let j = idx + 1; j < lines.length; j++) {
          const sub = lines[j].trim();
          if (sub.startsWith("1 ")) break;
      
          if (sub.includes("2 DATE")) {
            date = sub.split("2 DATE")[1]?.trim();
          } else if (sub.includes("2 PLAC")) {
            plac = sub.split("2 PLAC")[1]?.trim();
          } else if (sub.includes("2 NOTE")) {
            const text = sub.split("2 NOTE")[1]?.trim();
            if (text?.toLowerCase().startsWith("församling:")) {
              congregation = text.substring("Församling:".length).trim();
            } else if (text) {
              note = text;
            }
          }
        }
      
        const { city, region } = getPlaceParts(plac);
        const parsedDate = parseGedcomDate(date);
      
        if (!currentInd.moves) currentInd.moves = [];
        currentInd.moves.push({
          id: uuidv4(),
          date: parsedDate,
          city,
          region,
          congregation,
          note,
        });
      }
      // 👇 Story / NOTE block
      else if (level === "1" && tag === "NOTE") {
        let noteText = data;
        // Capture possible continued lines
        for (let j = idx + 1; j < lines.length; j++) {
          const sub = lines[j].trim();
          if (sub.startsWith("1 ")) break; // next top-level tag
          if (sub.startsWith("2 CONT")) {
            noteText += "\n" + sub.substring(7).trim();
          }
        }
        currentInd.story = noteText.trim();
      }
    }

    if (level === "0" && tag.startsWith("@F")) {
      if (currentFam) families.push(currentFam);
      currentFam = { tag, children: [] };
      continue;
    }

    if (currentFam) {
      if (level === "1" && tag === "HUSB") currentFam.husband = data;
      else if (level === "1" && tag === "WIFE") currentFam.wife = data;
      else if (level === "1" && tag === "CHIL") currentFam.children.push(data);
      else if (level === "1" && tag === "MARR") currentFam.hasMarriage = true;
    }
  }

  if (currentInd) individuals.push(currentInd);
  if (currentFam) families.push(currentFam);

  // build relationships
  for (const fam of families) {
    const husbandId = fam.husband ? idMap[fam.husband] : undefined;
    const wifeId = fam.wife ? idMap[fam.wife] : undefined;

    if (fam.hasMarriage && husbandId && wifeId) {
      relationships.push({
        id: uuidv4(),
        type: "spouse",
        person1Id: husbandId,
        person2Id: wifeId,
      });
    }

    for (const childTag of fam.children) {
      const childId = idMap[childTag];
      const parentIds = [husbandId, wifeId].filter(Boolean) as string[];
      if (childId && parentIds.length) {
        relationships.push({
          id: uuidv4(),
          type: "parent-child",
          parentIds,
          childId,
        });
      }
    }
  }

  return { individuals, relationships };
}