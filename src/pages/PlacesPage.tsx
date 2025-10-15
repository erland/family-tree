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
import IndividualDetails from "../components/IndividualDetails"; // 👈 same as IndividualsPage

type PlaceInfo = {
  name: string;
  individuals: { ind: Individual; event: string; date?: string }[];
};

export default function PlacesPage() {
  const individuals = useAppSelector((s) => s.individuals.items) as Individual[];
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Individual | null>(null); // 👈 new

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
    <Box sx={{ display: "flex", height: "100%", gap: 2, p: 2, position: "relative" }}>
      {/* Left column: search + scrollable places list */}
      <Box
        sx={{
          width: 300,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #ddd",
        }}
      >
        <TextField
          placeholder="Sök plats..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 1 }}
        />
        <Divider />

        {/* Scrollable list (fills window height below search) */}
        <Box
          sx={{
            mt: 1,
            overflowY: "auto",
            maxHeight: "calc(100vh - 200px)",
            pr: 1,
          }}
        >
          <List dense>
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
      </Box>

      {/* Right column: events */}
      <Box sx={{ flex: 1, overflow: "hidden", p: 1, position: "relative" }}>
        {selectedPlace ? (() => {
          const baseName = selectedPlace.name;
          const isNumbered = /\d+$/.test(baseName);

          const relatedPlaces =
            !isNumbered
              ? places.filter(
                  (p) => p.name === baseName || p.name.startsWith(baseName + " ")
                )
              : [selectedPlace];

          const combinedIndividuals = relatedPlaces.flatMap(
            (p) => p.individuals
          );

          combinedIndividuals.sort((a, b) =>
            (a.date || "").localeCompare(b.date || "")
          );

          return (
            <>
              <Typography variant="h6" gutterBottom>
                {baseName}
              </Typography>
              {combinedIndividuals.map(({ ind, event, date }, idx) => {
                const age =
                  event === "Födelse"
                    ? undefined
                    : calculateAgeAtEvent(ind.dateOfBirth, date);
                return (
                  <Typography key={idx} sx={{ mb: 0.5 }}>
                    {date ? `${date}: ` : ""}
                    <Typography
                      component="span"
                      onClick={() => setSelectedPerson(ind)} // 👈 opens the drawer
                      sx={{
                        fontWeight: "bold",
                        color: "primary.main",
                        cursor: "pointer",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {fullName(ind)}
                    </Typography>{" "}
                    ({event}
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

        {/* 🧩 Right-side details panel (same as in IndividualsPage) */}
        {selectedPerson && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 300,
              borderLeft: "1px solid #ddd",
              p: 2,
              bgcolor: "#fafafa",
              overflowY: "auto",
              zIndex: 2,
            }}
          >
            <IndividualDetails
              individualId={selectedPerson.id}
              onClose={() => setSelectedPerson(null)}
              onEdit={(ind) => {
                // optional edit logic if you want inline editing
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}