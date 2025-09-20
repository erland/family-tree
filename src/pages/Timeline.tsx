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
import { fullName } from "../utils/nameUtils";

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
    
      // Total months difference
      const months =
        (event.getFullYear() - birth.getFullYear()) * 12 +
        (event.getMonth() - birth.getMonth()) -
        (event.getDate() < birth.getDate() ? 1 : 0);
    
      if (months < 24) {
        return `${months} mån`;
      }
    
      // Fall back to years
      let age = event.getFullYear() - birth.getFullYear();
      const beforeBirthday =
        event.getMonth() < birth.getMonth() ||
        (event.getMonth() === birth.getMonth() && event.getDate() < birth.getDate());
      if (beforeBirthday) age--;
    
      return `${age} år`;
    };

    const clickableName = (person: Individual | undefined, prefix?: string) => {
      if (!person) return prefix ? `${prefix} okänd` : "Okänd";
      return (
        <>
          {prefix ? `${prefix} ` : ""}
          <Link
            component="button"
            underline="hover"
            sx={{ cursor: "pointer", p: 0 }}
            onClick={() => setSelected(person)}
          >
            {fullName(person)}
          </Link>
        </>
      );
    };

    const datedEvents: { date: string; text: React.ReactNode; age: string }[] = [];
    const undatedEvents: { text: React.ReactNode }[] = [];

    const birthDate = parseDate(selected.dateOfBirth);

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
          text: <>Gift med {clickableName(spouse)}</>,
          age: calcAge(rel.weddingDate),
        });
      } else if (spouse) {
        undatedEvents.push({ text: <>Gift med {clickableName(spouse)}</> });
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

      const birthText = (
        <>
          Nytt barn {clickableName(child)}
          {spouse ? <> med {clickableName(spouse)}</> : ""}
          {formatLocation(child.birthRegion, child.birthCity, child.birthCongregation)}
        </>
      );

      if (child.dateOfBirth) {
        datedEvents.push({
          date: child.dateOfBirth,
          text: birthText,
          age: calcAge(child.dateOfBirth),
        });
      } else {
        undatedEvents.push({ text: birthText });
      }

      const deathText = (
        <>
          Avlidet barn {clickableName(child)}
          {formatLocation(child.deathRegion, child.deathCity, child.deathCongregation)}
        </>
      );
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

        const birthText = (
          <>
            Nytt barnbarn {clickableName(grandChild)} från {clickableName(child)}
            {formatLocation(grandChild.birthRegion, grandChild.birthCity, grandChild.birthCongregation)}
          </>
        );

        if (grandChild.dateOfBirth) {
          datedEvents.push({
            date: grandChild.dateOfBirth,
            text: birthText,
            age: calcAge(grandChild.dateOfBirth),
          });
        } else {
          undatedEvents.push({ text: birthText });
        }

        const deathText = (
          <>
            Avlidet barnbarn {clickableName(grandChild)} från {clickableName(child)}
            {formatLocation(grandChild.deathRegion, grandChild.deathCity, grandChild.deathCongregation)}
          </>
        );
        if (grandChild.dateOfDeath) {
          datedEvents.push({
            date: grandChild.dateOfDeath,
            text: deathText,
            age: calcAge(grandChild.dateOfDeath),
          });
        } else if (grandChild.deathRegion || grandChild.deathCity || grandChild.deathCongregation) {
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

        const birthText = (
          <>
            Nytt barnbarnsbarn {clickableName(greatGrandChild)} från {clickableName(grandChild)}
            {formatLocation(
              greatGrandChild.birthRegion,
              greatGrandChild.birthCity,
              greatGrandChild.birthCongregation
            )}
          </>
        );

        if (greatGrandChild.dateOfBirth) {
          datedEvents.push({
            date: greatGrandChild.dateOfBirth,
            text: birthText,
            age: calcAge(greatGrandChild.dateOfBirth),
          });
        } else {
          undatedEvents.push({ text: birthText });
        }

        const deathText = (
          <>
            Avlidet barnbarnsbarn {clickableName(greatGrandChild)} från {clickableName(grandChild)}
            {formatLocation(
              greatGrandChild.deathRegion,
              greatGrandChild.deathCity,
              greatGrandChild.deathCongregation
            )}
          </>
        );
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

    // --- Parents
    const parentRels = relationships.filter(
      (r) => r.type === "parent-child" && r.childId === selected.id
    );
    const parents = parentRels.flatMap((r) =>
      r.parentIds.map((pid) => individuals.find((i) => i.id === pid)).filter(Boolean)
    ) as Individual[];

    // Parent death events
    parents.forEach((p) => {
      const deathText = (
        <>
          Avliden förälder {clickableName(p)}
          {formatLocation(p.deathRegion, p.deathCity, p.deathCongregation)}
        </>
      );
      if (p.dateOfDeath) {
        const d = parseDate(p.dateOfDeath);
        if (!birthDate || (d && d > birthDate)) {
          datedEvents.push({
            date: p.dateOfDeath,
            text: deathText,
            age: calcAge(p.dateOfDeath),
          });
        }
      } else if (p.deathRegion || p.deathCity || p.deathCongregation) {
        undatedEvents.push({ text: deathText });
      }
    });

    // --- Grandparents
    const grandparents: Individual[] = [];
    parents.forEach((p) => {
      const gpRels = relationships.filter(
        (r) => r.type === "parent-child" && r.childId === p.id
      );
      gpRels.forEach((rel) => {
        rel.parentIds.forEach((pid) => {
          const gp = individuals.find((i) => i.id === pid);
          if (gp) grandparents.push(gp);
        });
      });
    });

    grandparents.forEach((gp) => {
      const deathText = (
        <>
          Avliden mor/farförälder {clickableName(gp)}
          {formatLocation(gp.deathRegion, gp.deathCity, gp.deathCongregation)}
        </>
      );
      if (gp.dateOfDeath) {
        const d = parseDate(gp.dateOfDeath);
        if (!birthDate || (d && d > birthDate)) {
          datedEvents.push({
            date: gp.dateOfDeath,
            text: deathText,
            age: calcAge(gp.dateOfDeath),
          });
        }
      } else if (gp.deathRegion || gp.deathCity || gp.deathCongregation) {
        undatedEvents.push({ text: deathText });
      }
    });

    // --- Great-grandparents
    const greatGrandparents: Individual[] = [];
    grandparents.forEach((gp) => {
      const ggpRels = relationships.filter(
        (r) => r.type === "parent-child" && r.childId === gp.id
      );
      ggpRels.forEach((rel) => {
        rel.parentIds.forEach((pid) => {
          const ggp = individuals.find((i) => i.id === pid);
          if (ggp) greatGrandparents.push(ggp);
        });
      });
    });

    greatGrandparents.forEach((ggp) => {
      const deathText = (
        <>
          Avliden gammelmor/farförälder {clickableName(ggp)}
          {formatLocation(ggp.deathRegion, ggp.deathCity, ggp.deathCongregation)}
        </>
      );
      if (ggp.dateOfDeath) {
        const d = parseDate(ggp.dateOfDeath);
        if (!birthDate || (d && d > birthDate)) {
          datedEvents.push({
            date: ggp.dateOfDeath,
            text: deathText,
            age: calcAge(ggp.dateOfDeath),
          });
        }
      } else if (ggp.deathRegion || ggp.deathCity || ggp.deathCongregation) {
        undatedEvents.push({ text: deathText });
      }
    });

    // --- Siblings
    const siblingRels = relationships.filter(
      (r) =>
        r.type === "parent-child" &&
        r.parentIds.some((pid) => parents.map((p) => p.id).includes(pid)) &&
        r.childId !== selected.id
    );

    siblingRels.forEach((rel) => {
      const sibling = individuals.find((i) => i.id === rel.childId);
      if (!sibling) return;

      const birthText = (
        <>
          Nytt syskon {clickableName(sibling)}
          {formatLocation(sibling.birthRegion, sibling.birthCity, sibling.birthCongregation)}
        </>
      );
      if (sibling.dateOfBirth) {
        datedEvents.push({
          date: sibling.dateOfBirth,
          text: birthText,
          age: calcAge(sibling.dateOfBirth),
        });
      } else {
        undatedEvents.push({ text: birthText });
      }

      const deathText = (
        <>
          Avlidet syskon {clickableName(sibling)}
          {formatLocation(sibling.deathRegion, sibling.deathCity, sibling.deathCongregation)}
        </>
      );
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
      const deathText = (
        <>
          Avliden make/maka {clickableName(spouse)}
          {formatLocation(spouse.deathRegion, spouse.deathCity, spouse.deathCongregation)}
        </>
      );
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
            {fullName(selected)}
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