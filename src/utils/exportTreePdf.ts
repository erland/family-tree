// src/utils/exportTreePdf.ts
import jsPDF from "jspdf";
import { buildGraph } from "./treeLayout";
import FamilyNode from "../components/FamilyNode";
import MarriageNode from "../components/MarriageNode";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import {
  computeViewportBBox,
  renderOffscreenGraph,
  captureAsPng,
} from "./exportTreeBase";

/**
 * Export the full genealogy tree as a paginated PDF.
 * - Renders the React Flow graph off-screen at its natural size
 * - Captures a high-res PNG
 * - Tiles that image across multiple A4 pages (landscape) with margins
 *
 * If the whole image fits on one page, it will be centered and scaled down.
 */
export async function exportFullTreePDF(
  individuals: Individual[],
  relationships: Relationship[],
  rootId: string,
  mode: "descendants" | "ancestors",
  maxGenerations: number,
  fileName: string = "slakttrad.pdf",
  options?: {
    paginate?: boolean; // defaults to true (tile across pages as needed)
    marginPt?: number; // page margin in points, default 24
    orientation?: "landscape" | "portrait"; // default "landscape"
  }
): Promise<void> {
  const paginate = options?.paginate ?? true;
  const marginPt = options?.marginPt ?? 24;
  const orientation = options?.orientation ?? "landscape";

  // 1) Build positioned nodes/edges
  const { nodes, edges } = buildGraph(individuals, relationships, {
    rootId,
    mode,
    maxGenerations,
  });

  // 2) Compute a tight viewport; render off-screen at natural size
  const { width, height } = computeViewportBBox(nodes);
  const nodeTypes = { family: FamilyNode, marriage: MarriageNode };
  const { container, cleanup } = renderOffscreenGraph(
    { nodes, edges, nodeTypes },
    { width, height }
  );

  try {
    // 3) Capture to PNG data URL
    const dataUrl = await captureAsPng(container);
    const imageW = width; // px → we'll treat as pt for 1:1 (high-res)
    const imageH = height;

    // 4) Prepare PDF (A4 in points)
    const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const innerW = Math.max(1, pageW - marginPt * 2);
    const innerH = Math.max(1, pageH - marginPt * 2);

    const fitsOnOnePage =
      imageW <= innerW && imageH <= innerH;

    if (!paginate || fitsOnOnePage) {
      // Single page: scale down to fit and center
      const scale = Math.min(innerW / imageW, innerH / imageH, 1);
      const drawW = imageW * scale;
      const drawH = imageH * scale;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;
      pdf.addImage(dataUrl, "PNG", x, y, drawW, drawH);
    } else {
      // Multi-page tiling:
      // We draw the same full-sized image on each page, shifting with negative offsets.
      // jsPDF clips anything outside the page bounds, so each page shows a tile.
      const cols = Math.ceil(imageW / innerW);
      const rows = Math.ceil(imageH / innerH);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!(r === 0 && c === 0)) {
            pdf.addPage("a4", orientation);
          }
          const offsetX = marginPt - c * innerW;
          const offsetY = marginPt - r * innerH;

          // Draw the big image; only the "window" for this page will be visible.
          pdf.addImage(
            dataUrl,
            "PNG",
            offsetX,
            offsetY,
            imageW, // render at natural size for max quality
            imageH
          );
        }
      }
    }

    pdf.save(fileName);
  } finally {
    // 5) Clean up off-screen DOM
    cleanup();
  }
}