import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { Individual, IndividualSchema } from "../types/individual";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch } from "../store";
import { addIndividual, updateIndividual } from "../features/individualsSlice";

export default function IndividualFormDialog({
  open,
  onClose,
  individual,
}: {
  open: boolean;
  onClose: () => void;
  individual?: Individual | null;
}) {
  const dispatch = useAppDispatch();

  const [form, setForm] = useState<Partial<Individual>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(individual || {});
    setErrors({});
  }, [individual]);

  const handleChange =
    (field: keyof Individual) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [field]: e.target.value });
    };

  const handleSave = () => {
    const candidate = { ...form, id: individual?.id || uuidv4() };
    const result = IndividualSchema.safeParse(candidate);
    if (!result.success) {
      const errMap: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errMap[issue.path[0] as string] = issue.message;
      });
      setErrors(errMap);
      return;
    }

    if (individual) {
      dispatch(updateIndividual({ id: individual.id, updates: result.data }));
    } else {
      dispatch(addIndividual(result.data));
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{individual ? "Redigera person" : "Ny person"}</DialogTitle>
      <DialogContent>
        <TextField
          label="Namn"
          fullWidth
          margin="normal"
          value={form.name || ""}
          onChange={handleChange("name")}
          error={!!errors.name}
          helperText={errors.name}
        />
        <TextField
          label="Födelsedatum"
          fullWidth
          margin="normal"
          value={form.dateOfBirth || ""}
          onChange={handleChange("dateOfBirth")}
        />
        <TextField
          label="Region (födelse)"
          fullWidth
          margin="normal"
          value={form.birthRegion || ""}
          onChange={handleChange("birthRegion")}
        />
        <TextField
          label="Församling (födelse)"
          fullWidth
          margin="normal"
          value={form.birthCongregation || ""}
          onChange={handleChange("birthCongregation")}
        />
        <TextField
          label="Stad (födelse)"
          fullWidth
          margin="normal"
          value={form.birthCity || ""}
          onChange={handleChange("birthCity")}
        />
        <TextField
          label="Dödsdatum"
          fullWidth
          margin="normal"
          value={form.dateOfDeath || ""}
          onChange={handleChange("dateOfDeath")}
        />
        <TextField
          label="Region (död)"
          fullWidth
          margin="normal"
          value={form.deathRegion || ""}
          onChange={handleChange("deathRegion")}
        />
        <TextField
          label="Församling (död)"
          fullWidth
          margin="normal"
          value={form.deathCongregation || ""}
          onChange={handleChange("deathCongregation")}
        />
        <TextField
          label="Stad (död)"
          fullWidth
          margin="normal"
          value={form.deathCity || ""}
          onChange={handleChange("deathCity")}
        />
        <TextField
          label="Berättelse"
          fullWidth
          margin="normal"
          multiline
          minRows={3}
          value={form.story || ""}
          onChange={handleChange("story")}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button variant="contained" onClick={handleSave}>
          Spara
        </Button>
      </DialogActions>
    </Dialog>
  );
}