// src/pages/PlacesPage.tsx
import React, { useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

import { useAppSelector } from "../../store";
import { Individual } from "@core/domain";
import IndividualDetails from "../individuals/IndividualDetails";
import IndividualFormDialog from "../individuals/IndividualFormDialog";

import { usePlacesViewModel } from "./usePlacesViewModel";
import { PlaceEventsList } from "./PlaceEventsList";

export default function PlacesPage() {
  const individuals = useAppSelector(
    (s) => s.individuals.items
  ) as Individual[];

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

  // 🔎 Build places view-model
  const { places, totalEvents, expandById } = usePlacesViewModel({
    sort: "alpha",
    query: query || null,
  });

  // Expand currently selected place, merged/expanded
  const expandedPlace = selectedPlaceId ? expandById(selectedPlaceId) : null;

  // 🔸 Responsive
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        // Desktop: two columns.
        // Mobile: stacked vertically.
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        height: {
          xs: "auto",
          md: "calc(100vh - 120px)",
        },
        gap: 2,
        p: 2,
        position: "relative",

        // 👇 Allow natural page scroll on mobile so sticky headers aren't clipped.
        overflow: { xs: "visible", md: "hidden" },
      }}
    >
      {/* LEFT COLUMN / TOP SECTION (places list + search) */}
      <Box
        sx={{
          // desktop: fixed-width sidebar
          width: { xs: "100%", md: 300 },
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: { xs: "none", md: "1px solid #ddd" },
          borderBottom: { xs: "1px solid #ddd", md: "none" },
          position: "relative",

          // 👇 On desktop/tablet, this column behaves like a scrollable sidebar.
          // On mobile we let it flow naturally (no maxHeight clamp).
          maxHeight: {
            xs: "none",
            md: "calc(100vh - 120px)",
          },
          overflowY: {
            xs: "visible",
            md: "auto",
          },
        }}
      >
        {/* Sticky search bar + summary */}
        <Box
          sx={{
            p: 1,
            backgroundColor: "#f5f5f5",
            position: "sticky",
            top: 0,
            zIndex: 5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <TextField
            placeholder="Sök plats..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            fullWidth
          />

          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.secondary", mt: 0.5 }}
          >
            {places.length} plats
            {places.length === 1 ? "" : "er"} • {totalEvents} händelse
            {totalEvents === 1 ? "" : "r"}
          </Typography>
        </Box>

        {/* Scrollable list of places */}
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: "auto",
            pr: { xs: 0, md: 1 },
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
                  secondary={
                    p.subtitle ?? `${p.events.length} händelser`
                  }
                  primaryTypographyProps={{
                    noWrap: true,
                  }}
                  secondaryTypographyProps={{
                    noWrap: true,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>

      {/* RIGHT COLUMN / BOTTOM SECTION (events + person details) */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          p: { xs: 0, md: 1 },
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            height: { xs: "auto", md: "100%" },
            overflowY: "auto",
            p: 2,
            pt: { xs: 2, md: 0 },
          }}
        >
          {expandedPlace ? (
            <>
              {/* Place title */}
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {expandedPlace.title}
              </Typography>

              {/* List of events/people for this place */}
              <PlaceEventsList
                places={[expandedPlace]}
                onPersonClick={(id) => setSelectedPersonId(id)}
                showPlaceTitle={false}
              />
            </>
          ) : (
            <>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Välj en plats för att visa personer.
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary" }}
              >
                {places.length} plats
                {places.length === 1 ? "" : "er"} • {totalEvents} händelse
                {totalEvents === 1 ? "" : "r"}
              </Typography>
            </>
          )}
        </Box>

        {/* DESKTOP/TABLET: side overlay for person details */}
        {!isSmall && selectedPersonId && (
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
              zIndex: 10,
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

      {/* MOBILE: full-screen dialog for selected person */}
      {isSmall && (
        <Dialog
          fullScreen
          open={!!selectedPersonId}
          onClose={() => setSelectedPersonId(null)}
          PaperProps={{
            sx: {
              bgcolor: "background.default",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >

          <DialogContent
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 2,
            }}
          >
            {selectedPersonId && (
              <IndividualDetails
                individualId={selectedPersonId}
                onClose={() => setSelectedPersonId(null)}
                onEdit={(ind) => handleOpen(ind)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Reusable Form Dialog for editing person */}
      <IndividualFormDialog
        open={formOpen}
        onClose={handleClose}
        individual={editing}
      />
    </Box>
  );
}