import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import IndividualPicker from "./IndividualPicker";
import {
  Relationship,
  RelationshipSchema,
} from "../types/relationship";
import { useAppSelector } from "../store";
import { wouldCreateCycle } from "../utils/relationshipUtils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (rel: Relationship) => void;
  editing?: Relationship | null;
}

export default function RelationshipEditor({
  open,
  onClose,
  onSave,
  editing,
}: Props) {
  const [form, setForm] = useState<Partial<Relationship>>(
    editing || { type: "spouse" }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const relationships = useAppSelector((s) => s.relationships.items);

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [field]: e.target.value });
    };

  const handleSave = () => {
    const candidate: Relationship = {
      ...(form as any),
      id: editing?.id || uuidv4(),
    };

    // Schema validation
    const result = RelationshipSchema.safeParse(candidate);
    if (!result.success) {
      const errMap: Record<string, string> = {};
      result.error.issues.forEach(
        (i) => (errMap[i.path[0] as string] = i.message)
      );
      setErrors(errMap);
      return;
    }

    // Parent–child specific validation
    if (candidate.type === "parent-child") {
      const pc = candidate as any;

      // Self reference check
      if (pc.parentIds.includes(pc.childId)) {
        setErrors({ childId: "Ett barn kan inte också vara förälder" });
        return;
      }

      // Cycle detection
      if (
        wouldCreateCycle(relationships, {
          parentIds: pc.parentIds,
          childId: pc.childId,
        })
      ) {
        setErrors({
          childId: "Det här skulle skapa en cykel i släktträdet",
        });
        return;
      }
    }

    onSave(result.data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {editing ? "Redigera relation" : "Ny relation"}
      </DialogTitle>
      <DialogContent>
        <TextField
          select
          label="Typ"
          value={form.type || "spouse"}
          onChange={handleChange("type")}
          fullWidth
          margin="normal"
        >
          <MenuItem value="spouse">Äktenskap</MenuItem>
          <MenuItem value="parent-child">Förälder–barn</MenuItem>
        </TextField>

        {form.type === "spouse" && (
          <>
            <IndividualPicker
              label="Make"
              value={(form as any).person1Id || null}
              onChange={(id) => setForm({ ...form, person1Id: id })}
            />
            <IndividualPicker
              label="Maka"
              value={(form as any).person2Id || null}
              onChange={(id) => setForm({ ...form, person2Id: id })}
            />
            <TextField
              label="Vigsel datum"
              value={(form as any).weddingDate || ""}
              onChange={handleChange("weddingDate")}
              fullWidth
              margin="normal"
            />
            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              Brudgum
            </Typography>
            <TextField
              label="Region"
              value={(form as any).groomRegion || ""}
              onChange={handleChange("groomRegion")}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Församling"
              value={(form as any).groomCongregation || ""}
              onChange={handleChange("groomCongregation")}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Stad"
              value={(form as any).groomCity || ""}
              onChange={handleChange("groomCity")}
              fullWidth
              margin="normal"
            />
            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              Brud
            </Typography>
            <TextField
              label="Region"
              value={(form as any).brideRegion || ""}
              onChange={handleChange("brideRegion")}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Församling"
              value={(form as any).brideCongregation || ""}
              onChange={handleChange("brideCongregation")}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Stad"
              value={(form as any).brideCity || ""}
              onChange={handleChange("brideCity")}
              fullWidth
              margin="normal"
            />
          </>
        )}

        {form.type === "parent-child" && (
          <>
            <IndividualPicker
              label="Föräldrar"
              value={(form as any).parentIds || []}
              onChange={(ids) => setForm({ ...form, parentIds: ids })}
              multiple
            />
            <IndividualPicker
              label="Barn"
              value={(form as any).childId || null}
              onChange={(id) => setForm({ ...form, childId: id })}
            />
            {errors.childId && (
              <Typography color="error" variant="body2">
                {errors.childId}
              </Typography>
            )}
          </>
        )}
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