import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, ToggleButton, ToggleButtonGroup,
  Box, Typography
} from "@mui/material";
import { useAppSelector } from "../store";
import { fullName } from "../utils/nameUtils";
import SearchBar from "./SearchBar";

export default function AddChildDialog({ open, onClose, parentId, onAdd }) {
  const individuals = useAppSelector((s) => s.individuals.items);

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [otherParentId, setOtherParentId] = useState<string | null>(null);
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [birthFamilyName, setBirthFamilyName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "unknown">("unknown");
  const [birthDate, setBirthDate] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);

  const selectedOtherParent = otherParentId
    ? individuals.find((i) => i.id === otherParentId)
    : null;
  const selectedChild = existingId
    ? individuals.find((i) => i.id === existingId)
    : null;

  const handleSave = () => {
    if (mode === "new") {
      onAdd({
        mode: "new",
        data: {
          givenName,
          familyName,
          birthFamilyName,
          gender,
          dateOfBirth: birthDate,
        },
        parentId,
        otherParentId,
      });
    } else if (mode === "existing" && existingId) {
      onAdd({
        mode: "existing",
        childId: existingId,
        parentId,
        otherParentId,
      });
    } else if (mode === "existing") {
      alert("Välj en befintlig individ innan du sparar.");
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Lägg till barn</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(e, val) => val && setMode(val)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="new">Nytt barn</ToggleButton>
          <ToggleButton value="existing">Befintlig individ</ToggleButton>
        </ToggleButtonGroup>

        {/* Other parent (both modes) */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Annan förälder (valfritt)
          </Typography>
          <SearchBar onSelect={(id) => setOtherParentId(id)} />
          {selectedOtherParent && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Vald annan förälder: {fullName(selectedOtherParent)}
            </Typography>
          )}
        </Box>

        {mode === "new" ? (
          <>
            <TextField
              label="Förnamn"
              fullWidth
              margin="dense"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
            />
            <TextField
              label="Efternamn"
              fullWidth
              margin="dense"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
            <TextField
              label="Efternamn (vid födsel)"
              fullWidth
              margin="dense"
              value={birthFamilyName}
              onChange={(e) => setBirthFamilyName(e.target.value)}
            />
            <TextField
              select
              label="Kön"
              fullWidth
              margin="dense"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as "male" | "female" | "unknown")
              }
            >
              <MenuItem value="male">Man</MenuItem>
              <MenuItem value="female">Kvinna</MenuItem>
              <MenuItem value="unknown">Okänt</MenuItem>
            </TextField>
            <TextField
              label="Födelsedatum"
              type="date"
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true }}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Välj befintligt barn
            </Typography>
            <SearchBar onSelect={(id) => setExistingId(id)} />
            {selectedChild && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Vald individ: {fullName(selectedChild)}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button onClick={handleSave} variant="contained">
          Spara
        </Button>
      </DialogActions>
    </Dialog>
  );
}