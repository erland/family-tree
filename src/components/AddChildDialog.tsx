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
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch, useAppSelector } from "../store";
import { addIndividual } from "../features/individualsSlice";
import { addRelationship } from "../features/relationshipsSlice";
import { Individual, IndividualSchema } from "../types/individual";
import { fullName } from "../utils/nameUtils";
import { canAddParentChild } from "../utils/relationshipUtils";
import IndividualFormFields from "./IndividualFormFields";

type Props = {
  open: boolean;
  onClose: () => void;
  parentId: string;
};

export default function AddChildDialog({ open, onClose, parentId }: Props) {
  const dispatch = useAppDispatch();
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const parent = useMemo(() => individuals.find((i) => i.id === parentId) || null, [individuals, parentId]);

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingChildId, setExistingChildId] = useState<string | null>(null);
  const [otherParentId, setOtherParentId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Individual>>({
    gender: "unknown",
  });

  const reset = () => {
    setMode("new");
    setExistingChildId(null);
    setOtherParentId(null);
    setForm({ gender: "unknown" });
  };

  const handleSave = async () => {
    const finalParentIds = Array.from(
      new Set([parentId, otherParentId || undefined].filter(Boolean) as string[])
    );

    let childId: string | null = null;

    if (mode === "existing") {
      if (!existingChildId) {
        alert("Välj ett befintligt barn.");
        return;
      }
      childId = existingChildId;
    } else {
      // Create new child via schema (same pattern as IndividualFormDialog)
      const candidate: Individual = {
        id: uuidv4(),
        givenName: form.givenName ?? "",
        birthFamilyName: form.birthFamilyName ?? "",
        familyName: form.familyName ?? "",
        dateOfBirth: form.dateOfBirth ?? "",
        birthRegion: form.birthRegion ?? "",
        birthCongregation: form.birthCongregation ?? "",
        birthCity: form.birthCity ?? "",
        dateOfDeath: form.dateOfDeath ?? "",
        deathRegion: form.deathRegion ?? "",
        deathCongregation: form.deathCongregation ?? "",
        deathCity: form.deathCity ?? "",
        gender: (form.gender as any) ?? "unknown",
        story: form.story ?? "",
      };

      const parsed = IndividualSchema.safeParse(candidate);
      if (!parsed.success) {
        alert("Kontrollera barnets uppgifter.");
        return;
      }

      const created = await dispatch(addIndividual(parsed.data)).unwrap();
      childId = (created as Individual).id;
    }

    // Validate against cycles (for each parent)
    for (const pid of finalParentIds) {
      const ok = canAddParentChild(relationships, pid, childId!).ok;
      if (!ok) {
        alert("Det här skulle skapa en cykel i släktträdet eller är ogiltigt.");
        return;
      }
    }

    await dispatch(
      addRelationship({
        type: "parent-child",
        parentIds: finalParentIds,
        childId: childId!,
      })
    );

    reset();
    onClose();
  };

  const selectableOthers = useMemo(
    () => individuals.filter((i) => i.id !== parentId),
    [individuals, parentId]
  );

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} fullWidth maxWidth="sm">
      <DialogTitle>Lägg till barn</DialogTitle>
      <DialogContent>
        {parent && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Förälder: <strong>{fullName(parent)}</strong>
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
        <Button onClick={() => { reset(); onClose(); }}>Avbryt</Button>
        <Button variant="contained" onClick={handleSave}>Spara</Button>
      </DialogActions>
    </Dialog>
  );
}