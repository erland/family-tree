import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Typography,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch, useAppSelector } from "../store";
import { addRelationship, updateRelationship } from "../features/relationshipsSlice";
import { Relationship } from "../types/relationship";
import { wouldCreateCycle } from "../utils/relationshipUtils";
import { fullName } from "../utils/nameUtils";

type Props = {
  open: boolean;
  onClose: () => void;
  relationship?: Relationship; // edit mode if provided
};

export default function RelationshipEditor({ open, onClose, relationship }: Props) {
  const dispatch = useAppDispatch();
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const isEdit = !!relationship;
  const [type, setType] = useState<"spouse" | "parent-child">("spouse");

  // Spouse fields
  const [groom, setGroom] = useState("");
  const [bride, setBride] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [weddingRegion, setWeddingRegion] = useState("");
  const [weddingCity, setWeddingCity] = useState("");
  const [weddingCongregation, setWeddingCongregation] = useState("");

  // Parent-child fields
  const [parentIds, setParentIds] = useState<string[]>([]);
  const [childId, setChildId] = useState("");

  // Sync form state when opening or editing
  useEffect(() => {
    if (open && relationship) {
      if (relationship.type === "spouse") {
        setType("spouse");
        setGroom(relationship.person1Id);
        setBride(relationship.person2Id);
        setWeddingDate(relationship.weddingDate ?? "");
        setWeddingRegion(relationship.weddingRegion ?? "");
        setWeddingCongregation(relationship.weddingCongregation ?? "");
        setWeddingCity(relationship.weddingCity ?? "");
        setParentIds([]);
        setChildId("");
      } else {
        setType("parent-child");
        setParentIds(relationship.parentIds);
        setChildId(relationship.childId);
        setGroom("");
        setBride("");
        setWeddingDate("");
        setWeddingRegion("");
        setWeddingCongregation("");
        setWeddingCity("");
      }
    } else if (open && !relationship) {
      // reset for "new"
      setType("spouse");
      setGroom("");
      setBride("");
      setWeddingDate("");
      setWeddingRegion("");
      setWeddingCongregation("");
      setWeddingCity("");
      setParentIds([]);
      setChildId("");
    }
  }, [relationship, open]);

  const handleSave = () => {
    if (type === "spouse") {
      const newRel: Relationship = {
        id: isEdit ? relationship!.id : uuidv4(),
        type: "spouse",
        person1Id: groom,
        person2Id: bride,
        weddingDate,
        weddingRegion,
        weddingCongregation,
        weddingCity,
      };
      isEdit ? dispatch(updateRelationship(newRel)) : dispatch(addRelationship(newRel));
    } else {
      if (!childId) {
        alert("Välj ett barn.");
        return;
      }
      if (parentIds.length === 0) {
        alert("Välj minst en förälder.");
        return;
      }
      if (parentIds.includes(childId)) {
        alert("Ett barn kan inte också vara förälder.");
        return;
      }
      if (parentIds.some((pid) => wouldCreateCycle(relationships, pid, childId))) {
        alert("Det här skulle skapa en cykel i släktträdet.");
        return;
      }

      const newRel: Relationship = {
        id: isEdit ? relationship!.id : uuidv4(),
        type: "parent-child",
        parentIds,
        childId,
      };
      isEdit ? dispatch(updateRelationship(newRel)) : dispatch(addRelationship(newRel));
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? (
          <>
            Redigera relation{" "}
            <Typography component="span" variant="subtitle2" color="text.secondary">
              ({relationship!.type === "spouse" ? "Äktenskap" : "Förälder–Barn"})
            </Typography>
          </>
        ) : (
          "Ny relation"
        )}
      </DialogTitle>
      <DialogContent>
        {/* Only allow switching type for NEW relationships */}
        {!isEdit && (
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, val) => val && setType(val)}
            sx={{ mb: 2, mt: 1 }}
          >
            <ToggleButton value="spouse">Äktenskap</ToggleButton>
            <ToggleButton value="parent-child">Förälder–Barn</ToggleButton>
          </ToggleButtonGroup>
        )}

        {type === "spouse" && (
          <>
            <Autocomplete
              options={individuals}
              getOptionLabel={(o) => fullName(o)}
              value={individuals.find((i) => i.id === groom) ?? null}
              onChange={(_, v) => setGroom(v?.id ?? "")}
              renderInput={(p) => <TextField {...p} label="Man" sx={{ mt: 1 }} />}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              options={individuals}
              getOptionLabel={(o) => fullName(o)}
              value={individuals.find((i) => i.id === bride) ?? null}
              onChange={(_, v) => setBride(v?.id ?? "")}
              renderInput={(p) => <TextField {...p} label="Kvinna" sx={{ mt: 1 }} />}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Vigseldatum"
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />

            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={4}>
                <TextField label="Region" value={weddingRegion} onChange={(e) => setWeddingRegion(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Församling" value={weddingCongregation} onChange={(e) => setWeddingCongregation(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Stad" value={weddingCity} onChange={(e) => setWeddingCity(e.target.value)} fullWidth />
              </Grid>
            </Grid>
          </>
        )}

        {type === "parent-child" && (
          <>
            <Autocomplete
              multiple
              options={individuals}
              getOptionLabel={(o) => fullName(o)}
              value={individuals.filter((i) => parentIds.includes(i.id))}
              onChange={(_, vals) => setParentIds(vals.map((v) => v.id))}
              renderInput={(p) => <TextField {...p} label="Förälder/Föräldrar" sx={{ mt: 1 }} />}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              options={individuals}
              getOptionLabel={(o) => fullName(o)}
              value={individuals.find((i) => i.id === childId) ?? null}
              onChange={(_, v) => setChildId(v?.id ?? "")}
              renderInput={(p) => <TextField {...p} label="Barn" sx={{ mt: 1 }} />}
              sx={{ mb: 2 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button onClick={handleSave} variant="contained">
          {isEdit ? "Spara ändringar" : "Lägg till"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}