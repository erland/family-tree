import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TextField,
} from "@mui/material";
import { Individual, IndividualSchema } from "../types/individual";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch } from "../store";
import { addIndividual, updateIndividual } from "../features/individualsSlice";
import IndividualFormFields, { PersonFormValues } from "./IndividualFormFields";

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

  const [form, setForm] = useState<PersonFormValues>(() => ({
    givenName: individual?.givenName ?? "",
    familyName: individual?.familyName ?? "",
    birthFamilyName: individual?.birthFamilyName ?? "",
    gender: individual?.gender ?? "",
    dateOfBirth: individual?.dateOfBirth ?? "",
    birthRegion: individual?.birthRegion ?? "",
    birthCity: individual?.birthCity ?? "",
    birthCongregation: individual?.birthCongregation ?? "",
    dateOfDeath: individual?.dateOfDeath ?? "",
    deathRegion: individual?.deathRegion ?? "",
    deathCity: individual?.deathCity ?? "",
    deathCongregation: individual?.deathCongregation ?? "",
  }));
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
      <IndividualFormFields
        value={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        fields={{ names: true, gender: true, birth: true, death: true }}
        required={{ givenName: true }}
        autoFocusFirst
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