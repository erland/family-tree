import React, { useEffect, useMemo, useState } from "react";
import { TextField, Paper, List, ListItemButton, ListItemText } from "@mui/material";
import Fuse from "fuse.js";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";

type SearchEntry = {
  id: string;             // always the individual id to return
  givenName: string;           // display
  familyName?: string;           // display
  story?: string;
  dateOfBirth?: string;
  birthRegion?: string;
  birthCongregation?: string;
  birthCity?: string;
  dateOfDeath?: string;
  deathRegion?: string;
  deathCongregation?: string;
  deathCity?: string;

  // spouse-specific fields (mapped back to an individual)
  groomRegion?: string;
  groomCongregation?: string;
  groomCity?: string;
  brideRegion?: string;
  brideCongregation?: string;
  brideCity?: string;
};

export default function SearchBar({
  onSelect,
  onResults,
  showDropdown = true,
}: {
  onSelect?: (id: string) => void;
  onResults?: (ids: string[]) => void;
  showDropdown?: boolean;
}) {
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Fuse.FuseResult<SearchEntry>[]>([]);

  // Build combined search index
  const entries: SearchEntry[] = useMemo(() => {
    const base = individuals.map((i) => ({ ...i }));

    const spouseExtras: SearchEntry[] = relationships
      .filter((r): r is Relationship & { type: "spouse" } => r.type === "spouse")
      .flatMap((r) => {
        const person1 = individuals.find((i) => i.id === r.person1Id);
        const person2 = individuals.find((i) => i.id === r.person2Id);
        const res: SearchEntry[] = [];
        if (person1) {
          res.push({
            ...person1,
            groomRegion: r.groomRegion,
            groomCongregation: r.groomCongregation,
            groomCity: r.groomCity,
          });
        }
        if (person2) {
          res.push({
            ...person2,
            brideRegion: r.brideRegion,
            brideCongregation: r.brideCongregation,
            brideCity: r.brideCity,
          });
        }
        return res;
      });

    return [...base, ...spouseExtras];
  }, [individuals, relationships]);

  const fuse = useMemo(
    () =>
      new Fuse(entries, {
        keys: [
          "givenName",
          "familyName",
          "story",
          "dateOfBirth",
          "birthRegion",
          "birthCongregation",
          "birthCity",
          "dateOfDeath",
          "deathRegion",
          "deathCongregation",
          "deathCity",
          "groomRegion",
          "groomCongregation",
          "groomCity",
          "brideRegion",
          "brideCongregation",
          "brideCity",
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 1,
        includeScore: true,
      }),
    [entries]
  );

  useEffect(() => {
    if (!query) {
      setResults([]);
      onResults?.([]);
      return;
    }
    const t = setTimeout(() => {
      const res = fuse.search(query).slice(0, 10);
      setResults(res);
      onResults?.(res.map((r) => r.item.id));
    }, 200);
    return () => clearTimeout(t);
  }, [query, fuse, onResults]);

  return (
    <div style={{ position: "relative", width: 300 }}>
      <TextField
        fullWidth
        size="small"
        label="Sök person eller plats"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showDropdown && results.length > 0 && (
        <Paper
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          <List dense>
            {results.map((r) => {
              const { dateOfBirth, birthCity, birthRegion } = r.item;
              const secondary = [dateOfBirth, birthCity, birthRegion]
                .filter(Boolean)
                .join(" • ");

              return (
                <ListItemButton
                  key={r.item.id}
                  onClick={() => {
                    onSelect?.(r.item.id);
                    setQuery("");
                    setResults([]);
                  }}
                >
                  <ListItemText primary={`${r.item.givenName ?? ""} ${r.item.familyName ?? ""}`.trim()} secondary={secondary} />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
      )}
    </div>
  );
}