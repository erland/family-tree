import ExcelJS from "exceljs";
import { app, dialog } from "electron";
import { getIndividuals, getRelationships } from "./db.js";

/**
 * Export individuals to Excel with Swedish headers
 */
export async function exportIndividualsExcel() {
  const individuals = await getIndividuals();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Individer");

  // Define headers
  sheet.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "Kön", key: "gender", width: 10 },
    { header: "Förnamn", key: "givenName", width: 10 },
    { header: "Efternamn", key: "familyName", width: 15 },
    { header: "Efternamn (vid födsel)", key: "birthFamilyName", width: 15 },
    { header: "Födelsedatum", key: "dateOfBirth", width: 15 },
    { header: "Region (födelse)", key: "birthRegion", width: 20 },
    { header: "Församling (födelse)", key: "birthCongregation", width: 20 },
    { header: "Stad (födelse)", key: "birthCity", width: 20 },
    { header: "Dödsdatum", key: "dateOfDeath", width: 15 },
    { header: "Region (död)", key: "deathRegion", width: 20 },
    { header: "Församling (död)", key: "deathCongregation", width: 20 },
    { header: "Stad (död)", key: "deathCity", width: 20 },
    { header: "Berättelse", key: "story", width: 40 },
  ];

  // Add rows
  individuals.forEach((i: any) => {
    sheet.addRow({
      id: i.id ?? "",
      gender: i.gender ?? "",
      givenName: i.givenName ?? "",
      familyName: i.familyName ?? "",
      dateOfBirth: i.dateOfBirth ?? "",
      birthRegion: i.birthRegion ?? "",
      birthCongregation: i.birthCongregation ?? "",
      birthCity: i.birthCity ?? "",
      dateOfDeath: i.dateOfDeath ?? "",
      deathRegion: i.deathRegion ?? "",
      deathCongregation: i.deathCongregation ?? "",
      deathCity: i.deathCity ?? "",
      story: i.story ?? "",
    });
  });

  // Style header row
  sheet.getRow(1).font = { bold: true };

  // Save dialog
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: "Exportera individer till Excel",
    defaultPath: "individuals.xlsx",
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
  });

  if (!canceled && filePath) {
    await workbook.xlsx.writeFile(filePath);
    return { success: true, path: filePath };
  }

  return { success: false };
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