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
import { Relationship } from "../types/relationship";
import Fuse from "fuse.js";
import { fullName } from "../utils/nameUtils";
import { calculateAgeAtEvent } from "../utils/dateUtils";
import IndividualDetails from "../components/IndividualDetails";
import IndividualFormDialog from "../components/IndividualFormDialog"; // 👈 for editing
import {
  buildPlacesIndex,
  expandRelatedPlaces,
  PlaceInfo,
} from "../utils/places";

export default function PlacesPage() {
  const individuals = useAppSelector((s) => s.individuals.items) as Individual[];
  const relationships = useAppSelector((s) => s.relationships.items) as Relationship[];

  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Individual | null>(null);

  // 🧩 Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Individual | null>(null);

  const handleOpen = (ind?: Individual) => {
    setEditing(ind || null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditing(null);
  };

  // 🧮 Build places index (birth/death/moves + weddings from relationships)
  const places = useMemo(
    () => buildPlacesIndex(individuals, relationships),
    [individuals, relationships]
  );

  // 🔎 Fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(places, {
        keys: ["name"],
        threshold: 0.3,
      }),
    [places]
  );

  const filtered = query ? fuse.search(query).map((r) => r.item) : places;

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

          // 🧠 Determine related places for event display (exact + '?' + numbered siblings)
          const relatedPlaces = expandRelatedPlaces(places, baseName);

          // Merge all individuals from related places and sort by date
          const combinedIndividuals = relatedPlaces
            .flatMap((p) => p.individuals)
            .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

          return (
            <>
              <Typography variant="h6" gutterBottom>
                {baseName}
              </Typography>
              {combinedIndividuals.map(({ ind, event, date }, idx) => {
                const age =
                  event === "Födelse" ? undefined : calculateAgeAtEvent(ind.dateOfBirth, date);
                return (
                  <Typography key={idx} sx={{ mb: 0.5 }}>
                    {date ? `${date}: ` : ""}
                    <Typography
                      component="span"
                      onClick={() => setSelectedPerson(ind)}
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
              onEdit={(ind) => handleOpen(ind)} // 👈 triggers edit dialog
            />
          </Box>
        )}
      </Box>

      {/* 🧩 Reusable Form Dialog for editing */}
      <IndividualFormDialog
        open={formOpen}
        onClose={handleClose}
        individual={editing}
      />
    </Box>
  );
}