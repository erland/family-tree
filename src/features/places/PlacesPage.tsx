// src/pages/PlacesPage.tsx
import React, { useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  TextField,
} from "@mui/material";
import { useAppSelector } from "../../store";
import { Individual } from "@core/domain";
import IndividualDetails from "../individuals/IndividualDetails";
import IndividualFormDialog from "../individuals/IndividualFormDialog";

import { usePlacesViewModel } from "./usePlacesViewModel";
import { PlaceEventsList } from "./PlaceEventsList";

export default function PlacesPage() {
  const individuals = useAppSelector((s) => s.individuals.items) as Individual[];

  const [query, setQuery] = useState<string>("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

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

  // 🔎 Build places view-model (no expansion here)
  const { places, totalEvents, expandById } = usePlacesViewModel({
    sort: "alpha",
    query: query || null,
  });

  // Expand the selected place (right panel) using your original merge rules
  const expandedPlace = selectedPlaceId ? expandById(selectedPlaceId) : null;

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

        <Box
          sx={{
            mt: 1,
            overflowY: "auto",
            maxHeight: "calc(100vh - 200px)",
            pr: 1,
          }}
        >
          <List dense>
            {places.map((p) => (
              <ListItemButton
                key={p.id}
                selected={selectedPlaceId === p.id}
                onClick={() => setSelectedPlaceId(p.id)}
              >
                <ListItemText
                  primary={p.title}
                  secondary={p.subtitle ?? `${p.events.length} händelser`}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>

      {/* Right column: events for the selected place (expanded/merged) */}
      <Box sx={{ flex: 1, overflow: "hidden", p: 1, position: "relative" }}>
        {expandedPlace ? (
          <>
            <Typography variant="h6" gutterBottom>
              {expandedPlace.title}
            </Typography>
            <PlaceEventsList
              places={[expandedPlace]}
              onPersonClick={(id) => setSelectedPersonId(id)}
              showPlaceTitle={false}
            />
          </>
        ) : (
          <>
            <Typography variant="body1" color="text.secondary">
              Välj en plats för att visa personer.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
              {places.length} plats{places.length === 1 ? "" : "er"} • {totalEvents} händelse
              {totalEvents === 1 ? "" : "r"}
            </Typography>
          </>
        )}

        {/* 🧩 Right-side details panel */}
        {selectedPersonId && (
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
              individualId={selectedPersonId}
              onClose={() => setSelectedPersonId(null)}
              onEdit={(ind) => handleOpen(ind)}
            />
          </Box>
        )}
      </Box>

      {/* 🧩 Reusable Form Dialog for editing */}
      <IndividualFormDialog open={formOpen} onClose={handleClose} individual={editing} />
    </Box>
  );
}