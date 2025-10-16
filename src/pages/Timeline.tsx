import React, { useMemo, useState } from "react";
import { Box, Typography, Divider, Link } from "@mui/material";
import SearchBar from "../components/SearchBar";
import { fullName } from "../utils/nameUtils";
import { formatLocation } from "../utils/location";
import { useTimelineViewModel } from "../hooks/useTimelineViewModel";
import { EventsTable, type EventRow } from "../components/presentational/EventsTable";

export default function Timeline() {
  // Keep selection as an id; the hook will resolve the Individual for us.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pull selected person and grouped events from the view-model (no JSX/logic here).
  const { selected, beforeBirth, lifeEvents, afterDeath, undated } =
    useTimelineViewModel(selectedId);

  // Helper: map domain events -> presentational rows (shared across sections)
  const mapEventsToRows = useMemo(
    () =>
      (events: Array<{
        date?: string | null;
        label: string;
        ageAtEvent?: string | null;
        location?: { city?: string; congregation?: string; region?: string } | null;
        relatedIndividuals?: Array<{ id: string } & Record<string, any>>;
      }>): EventRow[] =>
        events.map((ev) => {
          const loc = ev.location
            ? formatLocation({
                city: ev.location.city,
                congregation: ev.location.congregation,
                region: ev.location.region,
              })
            : "";

          const relatedNode = (
            <>
              {/* Location (if present) */}
              {loc && (
                <>
                  {loc}
                  <br />
                </>
              )}

              {/* Related individuals (click to select) */}
              {ev.relatedIndividuals?.map((relInd, i) => (
                <React.Fragment key={relInd.id}>
                  {i > 0 && <br />}
                  <Link component="button" onClick={() => setSelectedId(relInd.id)}>
                    {fullName(relInd)}
                  </Link>
                </React.Fragment>
              ))}
            </>
          );

          return {
            date: ev.date ?? null,
            label: ev.label,
            ageAtEvent: ev.ageAtEvent ?? null,
            related: relatedNode,
          };
        }),
    [setSelectedId]
  );

  // Build rows per group (only life events show age)
  const rowsBefore = useMemo(() => mapEventsToRows(beforeBirth), [beforeBirth, mapEventsToRows]);
  const rowsLife = useMemo(() => mapEventsToRows(lifeEvents), [lifeEvents, mapEventsToRows]);
  const rowsAfter = useMemo(() => mapEventsToRows(afterDeath), [afterDeath, mapEventsToRows]);
  const rowsUndated = useMemo(() => mapEventsToRows(undated), [undated, mapEventsToRows]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Tidslinje
      </Typography>

      <SearchBar onSelect={(id) => setSelectedId(id)} />
      <Divider sx={{ my: 2 }} />

      {selected ? (
        <>
          <Typography variant="h6">{fullName(selected)}</Typography>

          {/* Före födsel */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Före födsel
            </Typography>
            <EventsTable rows={rowsBefore} showAge={false} showRelated />
          </Box>

          {/* Under livet — age column visible here only */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Under livet
            </Typography>
            <EventsTable rows={rowsLife} showAge showRelated />
          </Box>

          {/* Efter döden */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Efter döden
            </Typography>
            <EventsTable rows={rowsAfter} showAge={false} showRelated />
          </Box>

          {/* Odaterade händelser (date cells will render “-”; if you prefer to hide the column,
              we can add a `showDate` prop to EventsTable in a tiny follow-up) */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Odaterade händelser
            </Typography>
            <EventsTable rows={rowsUndated} showAge={false} showRelated />
          </Box>
        </>
      ) : (
        <Typography variant="body1">Välj en individ för att visa tidslinjen.</Typography>
      )}
    </Box>
  );
}