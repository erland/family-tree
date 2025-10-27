import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { Individual, IndividualSchema } from "@core";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch } from "../store";
import { addIndividual, updateIndividual } from "../features/individualsSlice";
import IndividualFormFields, { PersonFormValues } from "./IndividualFormFields";
import MoveListEditor from "./MoveListEditor";

// 🧩 Central default form values
const defaultFormValues: PersonFormValues = {
  givenName: "",
  familyName: "",
  birthFamilyName: "",
  gender: "",
  dateOfBirth: "",
  birthRegion: "",
  birthCity: "",
  birthCongregation: "",
  dateOfDeath: "",
  deathRegion: "",
  deathCity: "",
  deathCongregation: "",
  moves: [],
};

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

  const [form, setForm] = useState<PersonFormValues>(defaultFormValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🧩 Reset form every time the dialog opens or a new person is selected
  useEffect(() => {
    if (open) {
      if (individual) {
        // Existing person → merge with defaults
        setForm({ ...defaultFormValues, ...individual });
      } else {
        // New person → fresh blank form
        setForm(defaultFormValues);
      }
      setErrors({});
    }
  }, [individual, open]);

  const handleChange =
    (field: keyof Individual) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
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
    <Dialog
      key={individual?.id || "new"} // 🧩 Forces remount between persons
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{individual ? "Redigera person" : "Ny person"}</DialogTitle>
      <DialogContent>
        <IndividualFormFields
          value={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          fields={{ names: true, gender: true, birth: true, death: true }}
          required={{ givenName: true }}
          autoFocusFirst
        />
        <MoveListEditor
          value={form.moves}
          onChange={(moves) => setForm((f) => ({ ...f, moves }))}
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