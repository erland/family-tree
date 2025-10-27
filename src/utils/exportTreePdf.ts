// src/utils/exportTreePdf.ts
import { buildGraph } from "@core";
import jsPDF from "jspdf";
import FamilyNode from "../components/FamilyNode";
import MarriageNode from "../components/MarriageNode";
import { Individual } from "@core";
import { Relationship } from "@core";
import { computeViewportBBox, renderOffscreenGraph, captureAsPng } from "./exportTreeBase";

const nodeTypes = { family: FamilyNode, marriage: MarriageNode };

export async function exportFullTreePDF(
  individuals: Individual[],
  relationships: Relationship[],
  rootId: string,
  mode: "descendants" | "ancestors",
  maxGenerations: number
): Promise<void> {
  const { nodes, edges } = buildGraph(individuals, relationships, { rootId, mode, maxGenerations });
  const { width, height } = computeViewportBBox(nodes);
  const { container, cleanup } = renderOffscreenGraph({ nodes, edges, nodeTypes }, { width, height });
  try {
    const png = await captureAsPng(container);

    // Create landscape A4 PDF and place the PNG centered & scaled
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = png;
    });

    const scale = Math.min(pageWidth / img.width, pageHeight / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const offsetX = (pageWidth - drawW) / 2;
    const offsetY = (pageHeight - drawH) / 2;

    pdf.addImage(png, "PNG", offsetX, offsetY, drawW, drawH);
    pdf.save("tree.pdf");
  } finally {
    cleanup();
  }
}
