import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Typography,
} from "@mui/material";
import { useAppSelector } from "../store";
import { fullName } from "../utils/nameUtils";
import SearchBar from "./SearchBar";

export default function AddParentDialog({
  open,
  onClose,
  childId,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  childId: string;
  onAdd: (payload: any) => void;
}) {
  const individuals = useAppSelector((s) => s.individuals.items);

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [birthFamilyName, setBirthFamilyName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "unknown">("unknown");
  const [birthDate, setBirthDate] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);

  const selectedParent = existingId
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
        childId,
      });
    } else if (mode === "existing" && existingId) {
      onAdd({
        mode: "existing",
        parentId: existingId,
        childId,
      });
    } else if (mode === "existing") {
      alert("Välj en befintlig individ innan du sparar.");
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Lägg till förälder</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(e, val) => val && setMode(val)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="new">Ny förälder</ToggleButton>
          <ToggleButton value="existing">Befintlig individ</ToggleButton>
        </ToggleButtonGroup>

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
              Välj befintlig förälder
            </Typography>
            <SearchBar onSelect={(id) => setExistingId(id)} />
            {selectedParent && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Vald individ: {fullName(selectedParent)}
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