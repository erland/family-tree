// src/utils/exportPersonPdf.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { fullName } from "./nameUtils";
import { buildTimelineEvents, TimelineEvent } from "./timelineUtils";
import { calculateAgeAtEvent } from "./dateUtils";
import { getParentsOf, getSpousesOf, groupChildrenByOtherParent } from "./peopleSelectors";

/**
 * Render one individual onto a jsPDF instance (on the current page).
 * Returns the Y cursor after writing.
 */
export function renderIndividualPage(
  doc: jsPDF,
  individual: Individual,
  individuals: Individual[],
  relationships: Relationship[]
): number {

  // === Header ===
  doc.setFontSize(18);
  doc.text(`${fullName(individual)} ${individual.familyName && individual.birthFamilyName && individual.familyName!=individual.birthFamilyName?" (ursprungligen "+individual.birthFamilyName + ")": ""}`, 14, 20);

  doc.setFontSize(12);
  doc.text(
    `Född: ${individual.dateOfBirth || "-"} ${[individual.birthCity, individual.birthCongregation, individual.birthRegion].filter(Boolean).join(", ")}`,
    14,
    30
  );
  if (individual.dateOfDeath) {
    doc.text(
      `Död: ${individual.dateOfDeath} ${[individual.deathCity, individual.deathCongregation, individual.deathRegion].filter(Boolean).join(", ")}`,
      14,
      38
    );
    doc.text(`Ålder: ${calculateAgeAtEvent(individual.dateOfBirth, individual.dateOfDeath)}`, 14, 46);
  }

  let cursorY = 55;

  // === Parents ===
  const parents = getParentsOf(individual.id, relationships, individuals);

  if (parents.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [["Föräldrar", "Född", "Död", "Ålder"]],
      body: parents.map((p) => [
        fullName(p),
        p.dateOfBirth || "",
        p.dateOfDeath || "",
        calculateAgeAtEvent(p.dateOfBirth, p.dateOfDeath),
      ]),
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  }

  // === Spouses ===
  const spouses = getSpousesOf(individual.id, relationships, individuals);

  if (spouses.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [["Make/maka", "Född", "Död", "Ålder"]],
      body: spouses.map((partner) =>
        partner
          ? [
              fullName(partner),
              partner.dateOfBirth || "",
              partner.dateOfDeath || "",
              calculateAgeAtEvent(partner.dateOfBirth, partner.dateOfDeath),
            ]
          : ["Okänd", "", "", ""]
      ),
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  }

  // === Children (grouped by other parent when available) ===
  const grouped = groupChildrenByOtherParent(individual.id, relationships, individuals);
  const flatChildren = grouped.flatMap(({ partner, children }) =>
    children.map((child) => ({ child, otherParent: partner }))
  );
  if (flatChildren.length > 0) {
      autoTable(doc, {
      startY: cursorY,
      head: [["Barn", "Född", "Död", "Ålder", "Andra föräldern"]],
      body: flatChildren.map(({ child, otherParent }) =>
        child
          ? [
              fullName(child),
              child.dateOfBirth || "",
              child.dateOfDeath || "",
              calculateAgeAtEvent(child.dateOfBirth, child.dateOfDeath),
              otherParent ? fullName(otherParent) : "-",
            ]
          : ["", "", "", "", ""]
      ),
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  }

  // === Timeline ===
  const { lifeEvents } = buildTimelineEvents(individual, relationships, individuals);

  if (lifeEvents.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [["Datum", "Händelse", "Ålder", "Plats"]],
      body: lifeEvents.map((ev) => [
        ev.date ?? "",
        ev.label,
        ev.ageAtEvent,
        [ev.location?.city, ev.location?.congregation, ev.location?.region]
          .filter(Boolean)
          .join(", "),
      ]),
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  }

  // === Story ===
  if (individual.story) {
    doc.setFontSize(14);
    doc.text("Berättelse", 14, cursorY);
    doc.setFontSize(11);
    doc.text(individual.story, 14, cursorY + 8, { maxWidth: 180 });
  }
  
  return cursorY;
}

/**
 * Export one person = single PDF with one page.
 */
export function exportPersonPdf(
  individual: Individual,
  individuals: Individual[],
  relationships: Relationship[]
) {
  const doc = new jsPDF();
  renderIndividualPage(doc, individual, individuals, relationships);
  doc.save(`${fullName(individual)}.pdf`);
}