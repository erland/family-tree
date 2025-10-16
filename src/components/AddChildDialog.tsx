import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Autocomplete,
  Typography,
} from "@mui/material";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import { fullName } from "../utils/nameUtils";
import IndividualFormFields from "./IndividualFormFields";
import { useAddChildFlow } from "../hooks/useAddChildFlow";

type Props = {
  open: boolean;
  onClose: () => void;
  parentId: string;
};

export default function AddChildDialog({ open, onClose, parentId }: Props) {
  const { loading, error, linkExisting, createAndLink } = useAddChildFlow();

  const individuals = useAppSelector((s) => s.individuals.items);
  const parent = useMemo(
    () => individuals.find((i) => i.id === parentId) || null,
    [individuals, parentId]
  );

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingChildId, setExistingChildId] = useState<string | null>(null);
  const [otherParentId, setOtherParentId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Individual>>({ gender: "unknown" });

  const selectableOthers = useMemo(
    () => individuals.filter((i) => i.id !== parentId),
    [individuals, parentId]
  );

  const reset = () => {
    setMode("new");
    setExistingChildId(null);
    setOtherParentId(null);
    setForm({ gender: "unknown" });
  };

  const handleSave = async () => {
    try {
      if (mode === "existing") {
        if (!existingChildId) {
          alert("Välj ett befintligt barn.");
          return;
        }
        const parentIds = Array.from(
          new Set([parentId, otherParentId || undefined].filter(Boolean) as string[])
        );
        await linkExisting({ parentIds, childId: existingChildId });
      } else {
        await createAndLink({
          primaryParentId: parentId,
          otherParentId,
          form,
        });
      }
      reset();
      onClose();
    } catch (e: any) {
      // The flow hook already does validation and throws with a friendly message
      if (e?.message) alert(e.message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Lägg till barn</DialogTitle>
      <DialogContent>
        {parent && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Förälder: <strong>{fullName(parent)}</strong>
          </Typography>
        )}

        {error && (
          <Typography color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && setMode(v)}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="new">Skapa nytt barn</ToggleButton>
          <ToggleButton value="existing">Koppla befintligt barn</ToggleButton>
        </ToggleButtonGroup>

        {mode === "existing" ? (
          <Autocomplete
            options={individuals}
            value={individuals.find((i) => i.id === existingChildId) ?? null}
            onChange={(_, v) => setExistingChildId(v?.id ?? null)}
            getOptionLabel={(o) => fullName(o)}
            renderInput={(p) => <TextField {...p} label="Barn (befintlig person)" />}
            sx={{ mb: 2 }}
          />
        ) : (
          <Box sx={{ mb: 2 }}>
            <IndividualFormFields
              value={form}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
          </Box>
        )}

        <Autocomplete
          options={selectableOthers}
          value={individuals.find((i) => i.id === otherParentId) ?? null}
          onChange={(_, v) => setOtherParentId(v?.id ?? null)}
          getOptionLabel={(o) => fullName(o)}
          renderInput={(p) => <TextField {...p} label="Andra föräldern (valfritt)" />}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            reset();
            onClose();
          }}
          disabled={loading}
        >
          Avbryt
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {mode === "new" ? "Skapa & länka" : "Länka"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}