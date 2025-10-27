// src/core/export/index.ts

export { buildGedcom } from "./exportGedcom";
export { parseGedcomToData } from "./importGedcom";

// We ALSO want to re-export the ImportResult type from importGedcom,
// but we'll rename it so it doesn't collide with the Excel one.
export type { ImportResult as GedcomImportResult } from "./importGedcom";

export {
  buildIndividualsWorkbook,
  buildRelationshipsWorkbook,
} from "./exportExcel";

export {
  parseExcelData,
} from "./importExcel";

// And here we rename the Excel ImportResult on export, too, so that it's unambiguous
export type { ImportResult as ExcelImportResult } from "./importExcel";