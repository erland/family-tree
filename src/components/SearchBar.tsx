import React, { useEffect, useMemo, useState } from "react";
import { TextField, Paper, List, ListItemButton, ListItemText } from "@mui/material";
import Fuse from "fuse.js";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";

type SearchResult = {
  item: Individual;
};

export default function SearchBar({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const individuals = useAppSelector((s) => s.individuals.items);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  const fuse = useMemo(
    () =>
      new Fuse(individuals, {
        keys: [
          "name",
          "story",
          "dateOfBirth",
          "birthRegion",
          "birthCongregation",
          "birthCity",
          "dateOfDeath",
          "deathRegion",
          "deathCongregation",
          "deathCity",
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 1,
        includeScore: true,
      }),
    [individuals]
  );

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      const res = fuse.search(query).slice(0, 10);
      setResults(res as SearchResult[]);
    }, 200); // debounce 200ms
    return () => clearTimeout(t);
  }, [query, fuse]);

  return (
    <div style={{ position: "relative", width: 300 }}>
      <TextField
        fullWidth
        size="small"
        label="Sök person eller plats"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
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
              const { dateOfBirth, birthCity, birthRegion } =
                r.item;
              const secondary = [
                dateOfBirth,
                birthCity,
                birthRegion,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <ListItemButton
                  key={r.item.id}
                  onClick={() => {
                    onSelect(r.item.id);
                    setQuery("");
                    setResults([]);
                  }}
                >
                  <ListItemText primary={r.item.name} secondary={secondary} />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
      )}
    </div>
  );
}