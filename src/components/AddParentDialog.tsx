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
  Chip,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch, useAppSelector } from "../store";
import { addIndividual } from "../features/individualsSlice";
import { addRelationship } from "../features/relationshipsSlice";
import { Individual, IndividualSchema } from "../types/individual";
import { Relationship } from "../types/relationship";
import { fullName } from "../utils/nameUtils";
import { canAddParentChild } from "../utils/relationshipUtils";
import IndividualFormFields from "./IndividualFormFields";

type Props = {
  open: boolean;
  onClose: () => void;
  childId: string;
};

export default function AddParentDialog({ open, onClose, childId }: Props) {
  const dispatch = useAppDispatch();
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const child = useMemo(() => individuals.find((i) => i.id === childId) || null, [individuals, childId]);

  const existingParents = useMemo(() => {
    const rels = relationships.filter(
      (r: Relationship) => r.type === "parent-child" && r.childId === childId
    );
    return Array.from(new Set(rels.flatMap((r) => r.parentIds)))
      .map((pid) => individuals.find((i) => i.id === pid))
      .filter(Boolean) as Individual[];
  }, [relationships, childId, individuals]);

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingParentId, setExistingParentId] = useState<string | null>(null);

  // Optional: if you want to create a combined relation with an already-known parent
  const [withOtherParentId, setWithOtherParentId] = useState<string | null>(
    existingParents[0]?.id ?? null
  );

  const [form, setForm] = useState<Partial<Individual>>({
    gender: "unknown",
  });

  const reset = () => {
    setMode("new");
    setExistingParentId(null);
    setWithOtherParentId(existingParents[0]?.id ?? null);
    setForm({ gender: "unknown" });
  };

  const handleSave = async () => {
    let parentId: string | null = null;

    if (mode === "existing") {
      if (!existingParentId) {
        alert("Välj en befintlig förälder.");
        return;
      }
      parentId = existingParentId;
    } else {
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
        alert("Kontrollera förälderns uppgifter.");
        return;
      }

      const created = await dispatch(addIndividual(parsed.data)).unwrap();
      parentId = (created as Individual).id;
    }

    const parentIds = Array.from(
      new Set([parentId!, withOtherParentId || undefined].filter(Boolean) as string[])
    );

    // Validate against cycles
    const valid = parentIds.every((pid) => canAddParentChild(relationships, pid, childId).ok);
    if (!valid) {
      alert("Det här skulle skapa en cykel i släktträdet eller är ogiltigt.");
      return;
    }

    await dispatch(
      addRelationship({
        type: "parent-child",
        parentIds,
        childId,
      })
    );

    reset();
    onClose();
  };

  const selectableExistingParents = useMemo(
    () => individuals.filter((i) => i.id !== childId),
    [individuals, childId]
  );

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} fullWidth maxWidth="sm">
      <DialogTitle>Lägg till förälder</DialogTitle>
      <DialogContent>
        {child && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            Barn: <strong>{fullName(child)}</strong>
          </Typography>
        )}

        {existingParents.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Nuvarande registrerade föräldrar:
            </Typography>
            {existingParents.map((p) => (
              <Chip key={p.id} label={fullName(p)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
            ))}
          </Box>
        )}

        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && setMode(v)}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="new">Skapa ny förälder</ToggleButton>
          <ToggleButton value="existing">Koppla befintlig förälder</ToggleButton>
        </ToggleButtonGroup>

        {mode === "existing" ? (
          <Autocomplete
            options={selectableExistingParents}
            value={individuals.find((i) => i.id === existingParentId) ?? null}
            onChange={(_, v) => setExistingParentId(v?.id ?? null)}
            getOptionLabel={(o) => fullName(o)}
            renderInput={(p) => <TextField {...p} label="Förälder (befintlig person)" />}
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
          options={selectableExistingParents}
          value={individuals.find((i) => i.id === withOtherParentId) ?? null}
          onChange={(_, v) => setWithOtherParentId(v?.id ?? null)}
          getOptionLabel={(o) => fullName(o)}
          renderInput={(p) => <TextField {...p} label="Andra förälder (valfritt)" />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Avbryt</Button>
        <Button variant="contained" onClick={handleSave}>Spara</Button>
      </DialogActions>
    </Dialog>
  );
}