// src/components/SearchBar.tsx
import React, { useRef, useState, useEffect } from "react";
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

  /**
   * When true (e.g. in Pedigree usage):
   * - after selecting a result we clear the query
   * - and we close the dropdown.
   *
   * Default false to preserve current navbar/global behavior.
   */
  clearOnSelect?: boolean;
}

export default function SearchBar({
  onSelect,
  onResults,
  onQueryChange,
  showDropdown = true,
  clearOnSelect = false,
}: SearchBarProps) {
  const individuals = useAppSelector(
    (s) => s.individuals.items
  ) as Individual[];

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const anchorRef = useRef<HTMLInputElement | null>(null);

  const { results } = useSearch(query, {
    limit: 10,
    debounceMs: 200,
    onResults,
  });

  // Keep dropdown open/closed in sync with current query/results.
  useEffect(() => {
    if (showDropdown && query.length > 0 && results.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [showDropdown, query, results]);

  const rect = anchorRef.current?.getBoundingClientRect();

  // Handle clicking one of the search results.
  const handleSelectClick = (id: string) => {
    // Notify parent first so pedigree/etc. can act on it.
    onSelect?.(id);

    if (clearOnSelect) {
      // Clear query and explicitly close dropdown.
      setQuery("");
      setIsOpen(false);
    }
  };

  return (
    <>
      <TextField
        inputRef={anchorRef}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          onQueryChange?.(v);
          // We don't force-open here; the effect above will
          // decide isOpen based on query+results.
        }}
        label="Sök (namn, datum, plats …)"
        fullWidth
        autoComplete="off"
      />

      {showDropdown && isOpen && rect && (
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
                const primary = person?.id
                  ? fullName(person)
                  : `${r.item.givenName ?? ""} ${
                      r.item.familyName ?? r.item.birthFamilyName ?? ""
                    }`.trim();

                const secondary =
                  person?.birthCity ||
                  person?.deathCity ||
                  r.item.weddingCity ||
                  undefined;

                return (
                  <ListItemButton
                    key={r.item.id}
                    onClick={() => handleSelectClick(r.item.id)}
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