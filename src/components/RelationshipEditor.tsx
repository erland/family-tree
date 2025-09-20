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

  // Spouse fields (person1/person2 + wedding + per-spouse location)
  const [groom, setGroom] = useState("");
  const [bride, setBride] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [groomRegion, setGroomRegion] = useState("");
  const [groomCongregation, setGroomCongregation] = useState("");
  const [groomCity, setGroomCity] = useState("");
  const [brideRegion, setBrideRegion] = useState("");
  const [brideCongregation, setBrideCongregation] = useState("");
  const [brideCity, setBrideCity] = useState("");

  // Parent-child fields (note: parentIds is an array)
  const [parentIds, setParentIds] = useState<string[]>([]);
  const [childId, setChildId] = useState("");

  // Sync when opening / when relationship changes
  useEffect(() => {
    if (open && relationship) {
      if (relationship.type === "spouse") {
        setType("spouse");
        setGroom(relationship.person1Id);
        setBride(relationship.person2Id);
        setWeddingDate(relationship.weddingDate ?? "");
        setGroomRegion(relationship.groomRegion ?? "");
        setGroomCongregation(relationship.groomCongregation ?? "");
        setGroomCity(relationship.groomCity ?? "");
        setBrideRegion(relationship.brideRegion ?? "");
        setBrideCongregation(relationship.brideCongregation ?? "");
        setBrideCity(relationship.brideCity ?? "");
        setParentIds([]);
        setChildId("");
      } else {
        setType("parent-child");
        setParentIds(relationship.parentIds);
        setChildId(relationship.childId);
        setGroom("");
        setBride("");
        setWeddingDate("");
        setGroomRegion("");
        setGroomCongregation("");
        setGroomCity("");
        setBrideRegion("");
        setBrideCongregation("");
        setBrideCity("");
      }
    } else if(open && !relationship) {
      // reset for "new"
      setType("spouse");
      setGroom("");
      setBride("");
      setWeddingDate("");
      setGroomRegion("");
      setGroomCongregation("");
      setGroomCity("");
      setBrideRegion("");
      setBrideCongregation("");
      setBrideCity("");
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
        groomRegion,
        groomCongregation,
        groomCity,
        brideRegion,
        brideCongregation,
        brideCity,
      };
      isEdit ? dispatch(updateRelationship(newRel)) : dispatch(addRelationship(newRel));
    } else {
      // Basic validation
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
      // Cycle detection: if any parent would create a cycle
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
      <DialogTitle>{isEdit ? "Redigera relation" : "Ny relation"}</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          value={type}
          exclusive
          onChange={(_, val) => val && setType(val)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="spouse">Äktenskap</ToggleButton>
          <ToggleButton value="parent-child">Förälder–Barn</ToggleButton>
        </ToggleButtonGroup>

        {type === "spouse" && (
          <>
            <Autocomplete
              options={individuals}
              getOptionLabel={(o) => fullName(o)}
              value={individuals.find((i) => i.id === groom) ?? null}
              onChange={(_, v) => setGroom(v?.id ?? "")}
              renderInput={(p) => <TextField {...p} label="Man" />}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              options={individuals}
              getOptionLabel={(o) => o.name}
              value={individuals.find((i) => i.id === bride) ?? null}
              onChange={(_, v) => setBride(v?.id ?? "")}
              renderInput={(p) => <TextField {...p} label="Kvinna" />}
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
                <TextField label="Region (man)" value={groomRegion} onChange={(e) => setGroomRegion(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Församling (man)" value={groomCongregation} onChange={(e) => setGroomCongregation(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Stad (man)" value={groomCity} onChange={(e) => setGroomCity(e.target.value)} fullWidth />
              </Grid>
            </Grid>

            <Grid container spacing={1}>
              <Grid item xs={12} sm={4}>
                <TextField label="Region (kvinna)" value={brideRegion} onChange={(e) => setBrideRegion(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Församling (kvinna)" value={brideCongregation} onChange={(e) => setBrideCongregation(e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Stad (kvinna)" value={brideCity} onChange={(e) => setBrideCity(e.target.value)} fullWidth />
              </Grid>
            </Grid>
          </>
        )}

        {type === "parent-child" && (
          <>
            <Autocomplete
              multiple
              options={individuals}
              getOptionLabel={(o) => o.name}
              value={individuals.filter((i) => parentIds.includes(i.id))}
              onChange={(_, vals) => setParentIds(vals.map((v) => v.id))}
              renderInput={(p) => <TextField {...p} label="Förälder/Föräldrar" />}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              options={individuals}
              getOptionLabel={(o) => o.name}
              value={individuals.find((i) => i.id === childId) ?? null}
              onChange={(_, v) => setChildId(v?.id ?? "")}
              renderInput={(p) => <TextField {...p} label="Barn" />}
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