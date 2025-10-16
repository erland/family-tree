import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

/**
 * Minimal, reusable table for timeline-like event rows.
 * Presentation-only: no store access, no routing, no domain logic.
 */
export type EventRow = {
  date?: string | null;          // e.g., "1901-05-03" (already formatted upstream)
  label: string;                 // e.g., "Född i Uppsala"
  ageAtEvent?: string | null;    // e.g., "3 år", or undefined to hide
  related?: React.ReactNode;     // optional cell (names/links/etc.)
  key?: React.Key;               // stable key if available
};

export function EventsTable({
  rows,
  showAge = true,
  showRelated = true,
  emptyHint = null,
}: {
  rows: EventRow[];
  showAge?: boolean;
  showRelated?: boolean;
  emptyHint?: React.ReactNode;
}) {
  if (!rows?.length) return emptyHint ? <>{emptyHint}</> : null;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Datum</TableCell>
          <TableCell>Händelse</TableCell>
          {showAge && <TableCell>Ålder</TableCell>}
          {showRelated && <TableCell>Relaterade</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.key ?? i}>
            <TableCell>{r.date ?? "-"}</TableCell>
            <TableCell>{r.label}</TableCell>
            {showAge && <TableCell>{r.ageAtEvent ?? "-"}</TableCell>}
            {showRelated && <TableCell>{r.related ?? null}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
