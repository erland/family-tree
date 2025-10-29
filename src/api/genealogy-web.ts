// src/api/genealogy-web.ts
// Browser implementation of the GenealogyAPI interface

import {
  getIndividuals,
  addIndividual as addIndividualDB,
  updateIndividual as updateIndividualDB,
  deleteIndividual as deleteIndividualDB,
  getRelationships,
  addRelationship as addRelationshipDB,
  updateRelationship as updateRelationshipDB,
  deleteRelationship as deleteRelationshipDB,
  resetDatabase as resetDatabaseWeb,
} from "../storage";

import type { Individual, Relationship } from "@core/domain";

// Core import/export helpers (these must be re-exported from @core/index.ts)
import {
  buildGedcom,
  parseGedcomToData,
  buildIndividualsWorkbook,
  buildRelationshipsWorkbook,
  parseExcelData,
} from "@core/domain";

//
// Small DOM helpers
//

// Ask user for a text file (.ged etc) and return its text, or null if cancelled
async function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const text = await file.text();
      resolve(text);
    };
    input.click();
  });
}

// Ask user for a binary file (.xlsx) and return its ArrayBuffer, or null if cancelled
async function pickBinaryFile(accept: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const buf = await file.arrayBuffer();
      resolve(buf);
    };
    input.click();
  });
}

// Trigger a browser download for some data
function triggerDownload(
  data: BlobPart,
  mime: string,
  filename: string
): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// Merge imported data into the local web DB
async function bulkMergeImportedData(
  newIndividuals: Individual[],
  newRelationships: Relationship[]
) {
  // naive merge:
  // - if ID already exists, update
  // - otherwise add new
  // mirrors your Electron import behavior

  const existingInds = await getIndividuals();
  const byInd = new Map(existingInds.map((i) => [i.id, i]));

  for (const ind of newIndividuals) {
    if (byInd.has(ind.id)) {
      await updateIndividualDB(ind.id, ind);
    } else {
      await addIndividualDB(ind);
    }
  }

  const existingRels = await getRelationships();
  const byRel = new Map(existingRels.map((r) => [r.id, r]));

  for (const rel of newRelationships) {
    if (byRel.has(rel.id)) {
      await updateRelationshipDB(rel.id, rel);
    } else {
      await addRelationshipDB(rel);
    }
  }

  return {
    count: newIndividuals.length,
    relCount: newRelationships.length,
  };
}

export const genealogyWebAPI = {
  //
  // Individuals CRUD
  //
  async listIndividuals(): Promise<Individual[]> {
    return getIndividuals();
  },

  async addIndividual(ind: Individual): Promise<Individual> {
    await addIndividualDB(ind);
    return ind;
  },

  async updateIndividual(
    id: string,
    updates: Partial<Individual>
  ): Promise<Individual> {
    const updated = await updateIndividualDB(id, updates);
    return updated;
  },

  async deleteIndividual(id: string): Promise<{ success: boolean }> {
    await deleteIndividualDB(id);
    return { success: true };
  },

  //
  // Relationships CRUD
  //
  async listRelationships(): Promise<Relationship[]> {
    return getRelationships();
  },

  async addRelationship(rel: Relationship): Promise<Relationship> {
    await addRelationshipDB(rel);
    return rel;
  },

  async updateRelationship(
    id: string,
    updates: Partial<Relationship>
  ): Promise<Relationship> {
    const updated = await updateRelationshipDB(id, updates);
    return updated;
  },

  async deleteRelationship(id: string): Promise<{ success: boolean }> {
    await deleteRelationshipDB(id);
    return { success: true };
  },

  //
  // RESET DB
  //
  async resetDatabase(): Promise<void> {
    // your storage/index.ts already wipes both arrays
    await resetDatabaseWeb();
  },

  //
  // GEDCOM EXPORT (download .ged)
  //
  async exportGedcom(): Promise<{ success: boolean }> {
    const [individuals, relationships] = await Promise.all([
      getIndividuals(),
      getRelationships(),
    ]);

    const gedText = buildGedcom(individuals, relationships);

    triggerDownload(
      gedText,
      "text/plain;charset=utf-8",
      "AllIndividuals.ged"
    );

    return { success: true };
  },

  //
  // GEDCOM IMPORT (open picker, parse, merge)
  //
  async importGedcom(): Promise<{ count: number; relCount: number } | null> {
    // Let user choose a .ged file
    const text = await pickTextFile(
      ".ged,.GED,.gedcom,.GEDCOM,text/plain,application/octet-stream"
    );
    if (!text) return null; // user cancelled

    // Convert GEDCOM -> { individuals[], relationships[] }
    const { individuals, relationships } = parseGedcomToData(text);

    // Merge into local storage
    return bulkMergeImportedData(individuals, relationships);
  },

  //
  // EXCEL EXPORT ("Hela_släkten.xlsx")
  //
  async exportIndividualsExcel(): Promise<{ success: boolean }> {
    const [individuals, relationships] = await Promise.all([
      getIndividuals(),
      getRelationships(),
    ]);

    // In core/export/exportExcel.ts:
    //   buildIndividualsWorkbook(individuals, relationships)
    // returns an ExcelJS.Workbook
    const wbInd = buildIndividualsWorkbook(individuals, relationships);

    // ExcelJS workbooks in browser expose .xlsx.writeBuffer()
    const buffer = await wbInd.xlsx.writeBuffer();

    triggerDownload(
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "AllIndividuals.xlsx"
    );

    return { success: true };
  },

  //
  // RELATIONSHIPS EXPORT ("Relationer.xlsx")
  //
  async exportRelationshipsExcel(): Promise<{ success: boolean }> {
    const [individuals, relationships] = await Promise.all([
      getIndividuals(),
      getRelationships(),
    ]);

    // Your buildRelationshipsWorkbook expects (individuals, relationships)
    const wbRel = buildRelationshipsWorkbook(individuals, relationships);

    const buffer = await wbRel.xlsx.writeBuffer();

    triggerDownload(
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "relationships.xlsx"
    );

    return { success: true };
  },

  //
  // EXCEL IMPORT (open picker, parse, merge)
  //
  async importExcel(): Promise<{ count: number; relCount: number } | null> {
    // user picks .xlsx
    const arrayBuffer = await pickBinaryFile(
      ".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    if (!arrayBuffer) return null; // cancelled

    // Turn workbook bytes -> domain objects
    const { individuals, relationships } = await parseExcelData(arrayBuffer);

    // Merge into local storage
    return bulkMergeImportedData(individuals, relationships);
  },
};