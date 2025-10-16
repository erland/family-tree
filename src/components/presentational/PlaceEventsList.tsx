import * as React from "react";
import { Box, Typography, Link, Divider } from "@mui/material";
import { EventsTable, type EventRow } from "./EventsTable";
import type { PlaceVM } from "../../hooks/usePlacesViewModel";

/**
 * A dumb renderer for places + their events.
 * - No store access
 * - No routing
 * - No domain logic
 */
export function PlaceEventsList({
  places,
  onPersonClick,
  showPlaceTitle = true,
}: {
  places: PlaceVM[];
  onPersonClick?: (individualId: string) => void;
  showPlaceTitle?: boolean;
}) {
  if (!places.length) {
    return <Typography variant="body2">Inga platser att visa.</Typography>;
  }

  return (
    <Box>
      {places.map((place, idx) => {
        // Map PlaceEventVM -> EventRow for the reusable table
        const rows: EventRow[] = place.events.map((ev, i) => ({
          key: ev.id ?? `${i}-${ev.individualId ?? ""}-${ev.date ?? ""}`,
          date: ev.date ?? null,
          label: ev.label,
          related: ev.individualId ? (
            <Link
              component="button"
              onClick={() => onPersonClick?.(ev.individualId!)}
            >
              {ev.individualName ?? ev.individualId}
            </Link>
          ) : null,
          // Age not shown for place lists
          ageAtEvent: null,
        }));

        return (
          <Box key={place.id}>
            {idx > 0 && <Divider sx={{ my: 2 }} />}
            {showPlaceTitle && <Typography variant="h6">{place.title}</Typography>}
            {place.subtitle && (
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                {place.subtitle}
              </Typography>
            )}
            <EventsTable rows={rows} showAge={false} showRelated />
          </Box>
        );
      })}
    </Box>
  );
}