// src/pages/Timeline.tsx
import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  Link,
} from "@mui/material";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import SearchBar from "../components/SearchBar";
import { buildTimelineEvents, TimelineEvent } from "../utils/timelineUtils";
import { fullName } from "../utils/nameUtils";

export default function Timeline() {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const [selected, setSelected] = useState<Individual | null>(null);

  const { beforeBirth, lifeEvents, afterDeath, undated } = useMemo(() => {
    return selected
      ? buildTimelineEvents(selected, relationships, individuals)
      : { beforeBirth: [], lifeEvents: [], afterDeath: [], undated: [] };
  }, [selected, relationships, individuals]);

  const renderEvents = (
    title: string,
    events: TimelineEvent[],
    showAge: boolean = false
  ) => {
    if (events.length === 0) return null;
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Datum</TableCell>
              <TableCell>Händelse</TableCell>
              {showAge && <TableCell>Ålder</TableCell>}
              <TableCell>Relaterade</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev, idx) => (
              <TableRow key={idx}>
                <TableCell>{ev.date ?? "-"}</TableCell>
                <TableCell>{ev.label}</TableCell>
                {showAge && <TableCell>{ev.ageAtEvent ?? "-"}</TableCell>}
                <TableCell>
                  {ev.relatedIndividuals?.map((relInd) => (
                    <Link
                      key={relInd.id}
                      component="button"
                      onClick={() => setSelected(relInd)}
                      sx={{ mr: 1 }}
                    >
                      {fullName(relInd)}
                    </Link>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Tidslinje
      </Typography>
      <SearchBar onSelect={(id) => setSelected(individuals.find((i) => i.id === id) || null)} />
      <Divider sx={{ my: 2 }} />

      {selected ? (
        <>
          <Typography variant="h6">
            {fullName(selected)}
          </Typography>
          {renderEvents("Före födsel", beforeBirth)}
          {renderEvents("Under livet", lifeEvents, true)} {/* 👈 only here */}
          {renderEvents("Efter döden", afterDeath)}
          {renderEvents("Odaterade händelser", undated)}
        </>
      ) : (
        <Typography variant="body1">Välj en individ för att visa tidslinjen.</Typography>
      )}
    </Box>
  );
}