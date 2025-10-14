import React, { useMemo, useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  TextField,
} from "@mui/material";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import Fuse from "fuse.js";
import { fullName } from "../utils/nameUtils";
import { calculateAgeAtEvent } from "../utils/dateUtils";

type PlaceInfo = {
  name: string;
  individuals: { ind: Individual; event: string; date?: string }[];
};

export default function PlacesPage() {
  const individuals = useAppSelector((s) => s.individuals.items) as Individual[];
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);

  // 🧮 Build places map
  const places = useMemo(() => {
    const map = new Map<string, PlaceInfo>();

    const add = (name: string | undefined, ind: Individual, event: string, date?: string) => {
      if (!name) return;
      const key = name.trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, { name: key, individuals: [] });
      map.get(key)!.individuals.push({ ind, event, date });
    };

    for (const ind of individuals) {
      add(ind.birthCity, ind, "Födelse", ind.dateOfBirth);
      add(ind.deathCity, ind, "Död", ind.dateOfDeath);
      if ((ind as any).weddingCity)
        add((ind as any).weddingCity, ind, "Vigsel", (ind as any).weddingDate);
      if ((ind as any).moves) {
        for (const m of (ind as any).moves) {
          add(m.city, ind, "Flytt", m.date);
        }
      }
    }

    // Sort individuals chronologically
    for (const info of map.values()) {
      info.individuals.sort((a, b) =>
        (a.date || "").localeCompare(b.date || "")
      );
    }

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "sv")
    );
  }, [individuals]);

  // 🔎 Fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(places, {
        keys: ["name"],
        threshold: 0.3,
      }),
    [places]
  );

  const filtered = query
    ? fuse.search(query).map((r) => r.item)
    : places;

  return (
    <Box sx={{ display: "flex", height: "100%", gap: 2, p: 2 }}>
      {/* Left: place list */}
      <Box sx={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <TextField
          placeholder="Sök plats..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="small"
          sx={{ mb: 1 }}
        />
        <Divider />
        <List dense sx={{ overflowY: "auto", flex: 1 }}>
          {filtered.map((p) => (
            <ListItemButton
              key={p.name}
              selected={selectedPlace?.name === p.name}
              onClick={() => setSelectedPlace(p)}
            >
              <ListItemText
                primary={p.name}
                secondary={`${p.individuals.length} personer`}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* Right: selected place details */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
        {selectedPlace ? (() => {
          const baseName = selectedPlace.name;
          const isNumbered = /\d+$/.test(baseName);

          // If "Plats" (without number) → include "Plats 1", "Plats 2", etc.
          const relatedPlaces =
            !isNumbered
              ? places.filter(p => p.name === baseName || p.name.startsWith(baseName + " "))
              : [selectedPlace];

          // Merge all individuals from related places
          const combinedIndividuals = relatedPlaces.flatMap(p => p.individuals);

          // Sort by date
          combinedIndividuals.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

          return (
            <>
              <Typography variant="h6" gutterBottom>
                {baseName}
              </Typography>
              {combinedIndividuals.map(({ ind, event, date }, idx) => {
                const age = event === "Födelse" ? undefined : calculateAgeAtEvent(ind.dateOfBirth, date);
                return (
                  <Typography key={idx} sx={{ mb: 0.5 }}>
                    {date ? `${date}: ` : ""}
                    <strong>{fullName(ind)}</strong> ({event}
                    {age ? `, ${age}` : ""})
                  </Typography>
                );
              })}
            </>
          );
        })() : (
          <Typography variant="body1" color="text.secondary">
            Välj en plats för att visa personer.
          </Typography>
        )}
      </Box>
    </Box>
  );
}