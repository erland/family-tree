import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Portal,
} from "@mui/material";
import Fuse from "fuse.js";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { fullName } from "../utils/nameUtils";

type SearchEntry = {
  id: string;
  givenName: string;
  familyName?: string;
  story?: string;
  dateOfBirth?: string;
  birthRegion?: string;
  birthCongregation?: string;
  birthCity?: string;
  dateOfDeath?: string;
  deathRegion?: string;
  deathCongregation?: string;
  deathCity?: string;
  weddingRegion?: string;
  weddingCongregation?: string;
  weddingCity?: string;
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
  const anchorRef = useRef<HTMLInputElement | null>(null);

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
            weddingRegion: r.weddingRegion,
            weddingCongregation: r.weddingCongregation,
            weddingCity: r.weddingCity,
          });
        }
        if (person2) {
          res.push({
            ...person2,
            weddingRegion: r.weddingRegion,
            weddingCongregation: r.weddingCongregation,
            weddingCity: r.weddingCity,
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
          "weddingRegion",
          "weddingCongregation",
          "weddingCity",
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

  // Compute dropdown position
  const anchorEl = anchorRef.current;
  const rect = anchorEl?.getBoundingClientRect();

  return (
    <>
      <TextField
        fullWidth
        size="small"
        label="Sök person eller plats"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        inputRef={anchorRef}
      />
      {showDropdown && results.length > 0 && rect && (
        <Portal>
          <Paper
            style={{
              position: "absolute",
              top: rect.bottom + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              zIndex: 1300, // above MUI dialog
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
                    <ListItemText
                      primary={fullName(r.item as Individual)}
                      secondary={secondary}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        </Portal>
      )}
    </>
  );
}