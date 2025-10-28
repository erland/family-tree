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
import { useAppSelector } from "../store";
import { Individual } from "@core/domain";
import { Relationship } from "@core/domain";
import { fullName } from "@core/domain";
import IndividualFormFields from "./IndividualFormFields";
import { useAddParentFlow } from "../hooks/useAddParentFlow";

type Props = {
  open: boolean;
  onClose: () => void;
  childId: string;
};

export default function AddParentDialog({ open, onClose, childId }: Props) {
  const { loading, error, linkExisting, createAndLink } = useAddParentFlow();

  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const child = useMemo(
    () => individuals.find((i) => i.id === childId) || null,
    [individuals, childId]
  );

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

  // optional: preselect a known parent to merge with when creating/linking another
  const [withOtherParentId, setWithOtherParentId] = useState<string | null>(
    existingParents[0]?.id ?? null
  );

  const [form, setForm] = useState<Partial<Individual>>({ gender: "unknown" });

  const reset = () => {
    setMode("new");
    setExistingParentId(null);
    setWithOtherParentId(existingParents[0]?.id ?? null);
    setForm({ gender: "unknown" });
  };

  const selectableExistingParents = useMemo(
    () => individuals.filter((i) => i.id !== childId),
    [individuals, childId]
  );

  const handleSave = async () => {
    try {
      if (mode === "existing") {
        if (!existingParentId) {
          alert("Välj en befintlig förälder.");
          return;
        }
        const parentIds = Array.from(
          new Set([existingParentId, withOtherParentId || undefined].filter(Boolean) as string[])
        );
        await linkExisting({ childId, parentIds });
      } else {
        await createAndLink({
          childId,
          withOtherParentId,
          form,
        });
      }
      reset();
      onClose();
    } catch (e: any) {
      if (e?.message) alert(e.message); // flow already validates and throws nice messages
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