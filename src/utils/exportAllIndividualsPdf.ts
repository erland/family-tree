// src/utils/exportAllIndividualsPdf.ts
import jsPDF from "jspdf";
import { Individual } from "@core/domain";
import { Relationship } from "@core/domain";
import { renderIndividualPage } from "./exportPersonPdf";

export function exportAllIndividualsPdf(
  individuals: Individual[],
  relationships: Relationship[]
) {
  const doc = new jsPDF();

  individuals.forEach((ind, index) => {
    if (index > 0) doc.addPage();
    renderIndividualPage(doc, ind, individuals, relationships);
  });

  doc.save("alla_personer.pdf");
}