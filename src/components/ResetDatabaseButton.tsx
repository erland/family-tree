// src/components/ResetDatabaseButton.tsx
import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type ResetDatabaseButtonProps = {
  onConfirm: () => Promise<void> | void;
};

export function ResetDatabaseButton({ onConfirm }: ResetDatabaseButtonProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  return (
    <>
      <Button variant="outlined" color="error" onClick={() => setOpen(true)}>
        Rensa databas
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Bekräfta radering</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort alla personer och relationer?
            Denna åtgärd kan inte ångras.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Avbryt</Button>
          <Button color="error" onClick={handleConfirm}>
            Radera allt
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}