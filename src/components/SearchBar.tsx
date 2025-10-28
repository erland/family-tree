// src/components/SearchBar.tsx
import React, { useRef, useState } from "react";
import {
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Portal,
} from "@mui/material";
import { useAppSelector } from "../store";
import type { Individual } from "@core/domain";
import { fullName } from "@core/domain";
import { useSearch } from "../hooks/useSearch";

interface SearchBarProps {
  onSelect?: (id: string) => void;
  onResults?: (ids: string[]) => void;
  onQueryChange?: (value: string) => void;
  showDropdown?: boolean;
}

export default function SearchBar({
  onSelect,
  onResults,
  onQueryChange,
  showDropdown = true,
}: SearchBarProps) {
  const individuals = useAppSelector(
    (s) => s.individuals.items
  ) as Individual[];

  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLInputElement | null>(null);

  const { results } = useSearch(query, {
    limit: 10,
    debounceMs: 200,
    onResults,
  });

  const rect = anchorRef.current?.getBoundingClientRect();

  return (
    <>
      <TextField
        inputRef={anchorRef}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          onQueryChange?.(v);
        }}
        label="Sök (namn, datum, plats …)"
        fullWidth
        autoComplete="off"
      />

      {showDropdown && query.length > 0 && results.length > 0 && rect && (
        <Portal>
          <Paper
            elevation={6}
            sx={{
              position: "fixed",
              left: rect.left,
              top: rect.bottom + 4,
              width: rect.width,
              maxHeight: 360,
              overflow: "auto",
              zIndex: 1300,
            }}
          >
            <List dense>
              {results.map((r) => {
                // Prefer the live individual (for latest name formatting).
                const person = individuals.find((i) => i.id === r.item.id);

                // Fallback if the person isn't in store right now.
                const primary =
                  person?.id ? fullName(person) : `${r.item.givenName ?? ""} ${r.item.familyName ?? r.item.birthFamilyName ?? ""}`.trim();

                const secondary =
                  person?.birthCity ||
                  person?.deathCity ||
                  r.item.weddingCity ||
                  undefined;

                return (
                  <ListItemButton
                    key={r.item.id}
                    onClick={() => onSelect?.(r.item.id)}
                  >
                    <ListItemText primary={primary} secondary={secondary} />
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