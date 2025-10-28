import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from "@mui/material";
import { useAppSelector } from "../store";
import { Relationship } from "@core/domain";
import RelationshipEditorSpouseForm from "./RelationshipEditorSpouseForm";
import RelationshipEditorParentChildForm from "./RelationshipEditorParentChildForm";
import { useRelationshipEditor } from "../hooks/useRelationshipEditor";

type Props = {
  open: boolean;
  onClose: () => void;
  relationship?: Relationship; // edit mode if provided
};

export default function RelationshipEditor({ open, onClose, relationship }: Props) {
  const individuals = useAppSelector((s) => s.individuals.items);

  const vm = useRelationshipEditor(relationship);
  const { reset } = vm;

  // Mirror old behavior: whenever dialog opens (and/or relationship changes), reset the form
  useEffect(() => {
    if (!open) return;
    reset(relationship);
  }, [open, relationship, reset]);

  const handleSave = () => {
    const ok = vm.save();
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {vm.isEdit ? (
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
        {/* Only allow type switch when creating new */}
        {!vm.isEdit && (
          <ToggleButtonGroup
            value={vm.type}
            exclusive
            onChange={(_, val) => val && vm.setType(val)}
            sx={{ mb: 2, mt: 1 }}
          >
            <ToggleButton value="spouse">Äktenskap</ToggleButton>
            <ToggleButton value="parent-child">Förälder–Barn</ToggleButton>
          </ToggleButtonGroup>
        )}

        {vm.error && (
          <Typography color="error" sx={{ mb: 1 }}>
            {vm.error}
          </Typography>
        )}

        {vm.type === "spouse" ? (
          <RelationshipEditorSpouseForm
            individuals={individuals}
            groom={vm.groom}
            bride={vm.bride}
            weddingDate={vm.weddingDate}
            weddingRegion={vm.weddingRegion}
            weddingCity={vm.weddingCity}
            weddingCongregation={vm.weddingCongregation}
            onChange={{
              setGroom: vm.setGroom,
              setBride: vm.setBride,
              setWeddingDate: vm.setWeddingDate,
              setWeddingRegion: vm.setWeddingRegion,
              setWeddingCity: vm.setWeddingCity,
              setWeddingCongregation: vm.setWeddingCongregation,
            }}
          />
        ) : (
          <RelationshipEditorParentChildForm
            individuals={individuals}
            parentIds={vm.parentIds}
            childId={vm.childId}
            onChange={{
              setParentIds: vm.setParentIds,
              setChildId: vm.setChildId,
            }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button onClick={handleSave} variant="contained">
          {vm.isEdit ? "Spara ändringar" : "Lägg till"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}