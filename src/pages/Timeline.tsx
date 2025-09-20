import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import SearchBar from "../components/SearchBar";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";

export default function Timeline() {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const [selected, setSelected] = useState<Individual | null>(null);

  const { dated, undated } = useMemo(() => {
    if (!selected) return { dated: [], undated: [] };

    const formatLocation = (region?: string, city?: string, congregation?: string) => {
      const parts = [region, city, congregation].filter(Boolean);
      return parts.length > 0 ? ` i ${parts.join(", ")}` : "";
    };

    const parseDate = (d?: string) => {
      if (!d) return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const calcAge = (eventDate: string): string => {
      if (!selected.dateOfBirth) return "-";
      const birth = parseDate(selected.dateOfBirth);
      const event = parseDate(eventDate);
      if (!birth || !event) return "-";
      if (event < birth) return "-";
      let age = event.getFullYear() - birth.getFullYear();
      const beforeBirthday =
        event.getMonth() < birth.getMonth() ||
        (event.getMonth() === birth.getMonth() && event.getDate() < birth.getDate());
      if (beforeBirthday) age--;
      return `${age} år`;
    };

    const datedEvents: { date: string; text: string; age: string }[] = [];
    const undatedEvents: { text: string }[] = [];

    // Birth
    if (selected.dateOfBirth) {
      datedEvents.push({
        date: selected.dateOfBirth,
        text: `Född${formatLocation(
          selected.birthRegion,
          selected.birthCity,
          selected.birthCongregation
        )}`,
        age: "0 år",
      });
    } else {
      undatedEvents.push({
        text: `Född${formatLocation(
          selected.birthRegion,
          selected.birthCity,
          selected.birthCongregation
        )}`,
      });
    }

    // Spouses
    const spouseRels = relationships.filter(
      (r) =>
        r.type === "spouse" &&
        ((r as any).person1Id === selected.id || (r as any).person2Id === selected.id)
    );

    spouseRels.forEach((rel) => {
      const otherId =
        (rel as any).person1Id === selected.id ? (rel as any).person2Id : (rel as any).person1Id;
      const spouse = individuals.find((i) => i.id === otherId);
      if (rel.weddingDate && spouse) {
        datedEvents.push({
          date: rel.weddingDate,
          text: `Gift med ${spouse.name}`,
          age: calcAge(rel.weddingDate),
        });
      } else if (spouse) {
        undatedEvents.push({
          text: `Gift med ${spouse.name}`,
        });
      }
    });

    // Children
    const childRels = relationships.filter(
      (r) => r.type === "parent-child" && r.parentIds.includes(selected.id)
    );

    childRels.forEach((rel) => {
      const child = individuals.find((i) => i.id === rel.childId);
      if (!child) return;

      const otherParentId = rel.parentIds.find((pid) => pid !== selected.id);
      const spouse = individuals.find((i) => i.id === otherParentId);

      const text = `Nytt barn ${child.name}${
        spouse ? ` med ${spouse.name}` : ""
      }${formatLocation(child.birthRegion, child.birthCity, child.birthCongregation)}`;

      if (child.dateOfBirth) {
        datedEvents.push({
          date: child.dateOfBirth,
          text,
          age: calcAge(child.dateOfBirth),
        });
      } else {
        undatedEvents.push({ text });
      }
    });

    // Siblings
    const parentRels = relationships.filter(
      (r) => r.type === "parent-child" && r.childId === selected.id
    );
    const parentIds = parentRels.flatMap((r) => r.parentIds);

    const siblingIds = relationships
      .filter((r) => r.type === "parent-child" && r.parentIds.some((pid) => parentIds.includes(pid)))
      .map((r) => r.childId)
      .filter((cid) => cid !== selected.id);

    const siblings = individuals.filter((i) => siblingIds.includes(i.id));

    siblings.forEach((sibling) => {
      if (sibling.dateOfBirth) {
        datedEvents.push({
          date: sibling.dateOfBirth,
          text: `Nytt syskon ${sibling.name}${formatLocation(
            sibling.birthRegion,
            sibling.birthCity,
            sibling.birthCongregation
          )}`,
          age: calcAge(sibling.dateOfBirth),
        });
      } else {
        undatedEvents.push({
          text: `Nytt syskon ${sibling.name}${formatLocation(
            sibling.birthRegion,
            sibling.birthCity,
            sibling.birthCongregation
          )}`,
        });
      }

      if (sibling.dateOfDeath) {
        datedEvents.push({
          date: sibling.dateOfDeath,
          text: `Avlidet syskon ${sibling.name}${formatLocation(
            sibling.deathRegion,
            sibling.deathCity,
            sibling.deathCongregation
          )}`,
          age: calcAge(sibling.dateOfDeath),
        });
      } else if (
        sibling.deathRegion ||
        sibling.deathCity ||
        sibling.deathCongregation
      ) {
        undatedEvents.push({
          text: `Avlidet syskon ${sibling.name}${formatLocation(
            sibling.deathRegion,
            sibling.deathCity,
            sibling.deathCongregation
          )}`,
        });
      }
    });

    // Death
    if (selected.dateOfDeath) {
      datedEvents.push({
        date: selected.dateOfDeath,
        text: `Avliden${formatLocation(
          selected.deathRegion,
          selected.deathCity,
          selected.deathCongregation
        )}`,
        age: calcAge(selected.dateOfDeath),
      });
    } else if (
      selected.deathRegion ||
      selected.deathCity ||
      selected.deathCongregation
    ) {
      undatedEvents.push({
        text: `Avliden${formatLocation(
          selected.deathRegion,
          selected.deathCity,
          selected.deathCongregation
        )}`,
      });
    }

    return {
      dated: datedEvents.sort((a, b) => a.date.localeCompare(b.date)),
      undated: undatedEvents,
    };
  }, [selected, individuals, relationships]);

  return (
    <Box
      sx={{
        width: "100%",
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <Box sx={{ p: 2 }}>
        <SearchBar
          onSelect={(id) => setSelected(individuals.find((i) => i.id === id) || null)}
        />
      </Box>

      <Divider />

      {/* Timeline */}
      <Box sx={{ flex: 1, p: 2, overflowY: "auto" }}>
        {selected ? (
          <>
            <Typography variant="h6" gutterBottom>
              Tidslinje för {selected.name}
            </Typography>

            {dated.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: "150px" }}>Datum</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: "100px" }}>Ålder</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Händelse</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dated.map((ev, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{ev.date}</TableCell>
                      <TableCell>{ev.age}</TableCell>
                      <TableCell>{ev.text}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Inga daterade händelser hittades.
              </Typography>
            )}

            {undated.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Händelser utan datum
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Händelse</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {undated.map((ev, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{ev.text}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Välj en person för att visa tidslinjen.
          </Typography>
        )}
      </Box>
    </Box>
  );
}