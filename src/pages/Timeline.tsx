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
} from "@mui/material";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import SearchBar from "../components/SearchBar";

export default function Timeline() {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const [selected, setSelected] = useState<Individual | null>(null);

  const { lifeEvents, afterDeath, undated } = useMemo(() => {
    if (!selected) return { lifeEvents: [], afterDeath: [], undated: [] };

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

    // --- Birth
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

    // --- Spouses
    const spouseRels = relationships.filter(
      (r) =>
        r.type === "spouse" &&
        ((r as any).person1Id === selected.id || (r as any).person2Id === selected.id)
    );

    const spouses: Individual[] = [];

    spouseRels.forEach((rel) => {
      const otherId =
        (rel as any).person1Id === selected.id ? (rel as any).person2Id : (rel as any).person1Id;
      const spouse = individuals.find((i) => i.id === otherId);
      if (spouse) spouses.push(spouse);

      if (rel.weddingDate && spouse) {
        datedEvents.push({
          date: rel.weddingDate,
          text: `Gift med ${spouse.name}`,
          age: calcAge(rel.weddingDate),
        });
      } else if (spouse) {
        undatedEvents.push({ text: `Gift med ${spouse.name}` });
      }
    });

    // --- Children
    const childRels = relationships.filter(
      (r) => r.type === "parent-child" && r.parentIds.includes(selected.id)
    );

    const children: Individual[] = [];

    childRels.forEach((rel) => {
      const child = individuals.find((i) => i.id === rel.childId);
      if (!child) return;
      children.push(child);

      const otherParentId = rel.parentIds.find((pid) => pid !== selected.id);
      const spouse = individuals.find((i) => i.id === otherParentId);

      const birthText = `Nytt barn ${child.name}${
        spouse ? ` med ${spouse.name}` : ""
      }${formatLocation(child.birthRegion, child.birthCity, child.birthCongregation)}`;

      if (child.dateOfBirth) {
        datedEvents.push({
          date: child.dateOfBirth,
          text: birthText,
          age: calcAge(child.dateOfBirth),
        });
      } else {
        undatedEvents.push({ text: birthText });
      }

      // death of child
      const deathText = `Avlidet barn ${child.name}${formatLocation(
        child.deathRegion,
        child.deathCity,
        child.deathCongregation
      )}`;
      if (child.dateOfDeath) {
        datedEvents.push({
          date: child.dateOfDeath,
          text: deathText,
          age: calcAge(child.dateOfDeath),
        });
      } else if (child.deathRegion || child.deathCity || child.deathCongregation) {
        undatedEvents.push({ text: deathText });
      }
    });

    // --- Grandchildren
    const grandchildren: Individual[] = [];
    children.forEach((child) => {
      const grandChildRels = relationships.filter(
        (r) => r.type === "parent-child" && r.parentIds.includes(child.id)
      );

      grandChildRels.forEach((rel) => {
        const grandChild = individuals.find((i) => i.id === rel.childId);
        if (!grandChild) return;
        grandchildren.push(grandChild);

        const birthText = `Nytt barnbarn ${grandChild.name} från ${child.name}${formatLocation(
          grandChild.birthRegion,
          grandChild.birthCity,
          grandChild.birthCongregation
        )}`;

        if (grandChild.dateOfBirth) {
          datedEvents.push({
            date: grandChild.dateOfBirth,
            text: birthText,
            age: calcAge(grandChild.dateOfBirth),
          });
        } else {
          undatedEvents.push({ text: birthText });
        }

        // death of grandchild
        const deathText = `Avlidet barnbarn ${grandChild.name} från ${child.name}${formatLocation(
          grandChild.deathRegion,
          grandChild.deathCity,
          grandChild.deathCongregation
        )}`;
        if (grandChild.dateOfDeath) {
          datedEvents.push({
            date: grandChild.dateOfDeath,
            text: deathText,
            age: calcAge(grandChild.dateOfDeath),
          });
        } else if (
          grandChild.deathRegion ||
          grandChild.deathCity ||
          grandChild.deathCongregation
        ) {
          undatedEvents.push({ text: deathText });
        }
      });
    });

    // --- Great-grandchildren
    grandchildren.forEach((grandChild) => {
      const greatGrandChildRels = relationships.filter(
        (r) => r.type === "parent-child" && r.parentIds.includes(grandChild.id)
      );

      greatGrandChildRels.forEach((rel) => {
        const greatGrandChild = individuals.find((i) => i.id === rel.childId);
        if (!greatGrandChild) return;

        const birthText = `Nytt barnbarnsbarn ${greatGrandChild.name} från ${grandChild.name}${formatLocation(
          greatGrandChild.birthRegion,
          greatGrandChild.birthCity,
          greatGrandChild.birthCongregation
        )}`;

        if (greatGrandChild.dateOfBirth) {
          datedEvents.push({
            date: greatGrandChild.dateOfBirth,
            text: birthText,
            age: calcAge(greatGrandChild.dateOfBirth),
          });
        } else {
          undatedEvents.push({ text: birthText });
        }

        // death of great-grandchild
        const deathText = `Avlidet barnbarnsbarn ${greatGrandChild.name} från ${grandChild.name}${formatLocation(
          greatGrandChild.deathRegion,
          greatGrandChild.deathCity,
          greatGrandChild.deathCongregation
        )}`;
        if (greatGrandChild.dateOfDeath) {
          datedEvents.push({
            date: greatGrandChild.dateOfDeath,
            text: deathText,
            age: calcAge(greatGrandChild.dateOfDeath),
          });
        } else if (
          greatGrandChild.deathRegion ||
          greatGrandChild.deathCity ||
          greatGrandChild.deathCongregation
        ) {
          undatedEvents.push({ text: deathText });
        }
      });
    });

    // --- Siblings
    const parentRels = relationships.filter(
      (r) => r.type === "parent-child" && r.childId === selected.id
    );
    const parentIds = parentRels.flatMap((r) => r.parentIds);
    const siblingRels = relationships.filter(
      (r) =>
        r.type === "parent-child" &&
        r.parentIds.some((pid) => parentIds.includes(pid)) &&
        r.childId !== selected.id
    );

    siblingRels.forEach((rel) => {
      const sibling = individuals.find((i) => i.id === rel.childId);
      if (!sibling) return;

      const birthText = `Nytt syskon ${sibling.name}${formatLocation(
        sibling.birthRegion,
        sibling.birthCity,
        sibling.birthCongregation
      )}`;
      if (sibling.dateOfBirth) {
        datedEvents.push({
          date: sibling.dateOfBirth,
          text: birthText,
          age: calcAge(sibling.dateOfBirth),
        });
      } else {
        undatedEvents.push({ text: birthText });
      }

      const deathText = `Avlidet syskon ${sibling.name}${formatLocation(
        sibling.deathRegion,
        sibling.deathCity,
        sibling.deathCongregation
      )}`;
      if (sibling.dateOfDeath) {
        datedEvents.push({
          date: sibling.dateOfDeath,
          text: deathText,
          age: calcAge(sibling.dateOfDeath),
        });
      } else if (sibling.deathRegion || sibling.deathCity || sibling.deathCongregation) {
        undatedEvents.push({ text: deathText });
      }
    });

    // --- Death of spouses
    spouses.forEach((spouse) => {
      const deathText = `Avliden make/maka ${spouse.name}${formatLocation(
        spouse.deathRegion,
        spouse.deathCity,
        spouse.deathCongregation
      )}`;
      if (spouse.dateOfDeath) {
        datedEvents.push({
          date: spouse.dateOfDeath,
          text: deathText,
          age: calcAge(spouse.dateOfDeath),
        });
      } else if (spouse.deathRegion || spouse.deathCity || spouse.deathCongregation) {
        undatedEvents.push({ text: deathText });
      }
    });

    // --- Death of selected
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
    } else if (selected.deathRegion || selected.deathCity || selected.deathCongregation) {
      undatedEvents.push({
        text: `Avliden${formatLocation(
          selected.deathRegion,
          selected.deathCity,
          selected.deathCongregation
        )}`,
      });
    }

    // --- Split before/after death
    const deathDate = parseDate(selected.dateOfDeath);
    const sorted = datedEvents.sort((a, b) => a.date.localeCompare(b.date));

    const lifeEvents: typeof sorted = [];
    const afterDeath: typeof sorted = [];

    sorted.forEach((ev) => {
      const evDate = parseDate(ev.date);
      if (deathDate && evDate && evDate > deathDate) {
        afterDeath.push(ev);
      } else {
        lifeEvents.push(ev);
      }
    });

    return { lifeEvents, afterDeath, undated: undatedEvents };
  }, [selected, individuals, relationships]);

  return (
    <Box sx={{ p: 2, height: "calc(100vh - 120px)", overflowY: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Tidslinje
      </Typography>

      <Box sx={{ mb: 2 }}>
        <SearchBar
          onSelect={(id) => {
            const ind = individuals.find((i) => i.id === id) || null;
            setSelected(ind);
          }}
        />
      </Box>

      {selected && (
        <Box>
          <Typography variant="h6" gutterBottom>
            {selected.name}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Life events */}
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Händelser under livet
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Datum</TableCell>
                <TableCell>Ålder</TableCell>
                <TableCell>Händelse</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lifeEvents.map((ev, idx) => (
                <TableRow key={idx}>
                  <TableCell>{ev.date}</TableCell>
                  <TableCell>{ev.age}</TableCell>
                  <TableCell>{ev.text}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* After death */}
          {afterDeath.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                Händelser efter död
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Datum</TableCell>
                    <TableCell>Händelse</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {afterDeath.map((ev, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{ev.date}</TableCell>
                      <TableCell>{ev.text}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {/* Undated */}
          {undated.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6">Händelser utan datum</Typography>
              <ul>
                {undated.map((ev, idx) => (
                  <li key={idx}>
                    <Typography variant="body2">{ev.text}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}