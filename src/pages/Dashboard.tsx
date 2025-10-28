import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  Paper,
  Grid,
} from "@mui/material";

import UploadFileIcon from "@mui/icons-material/UploadFile";
import DescriptionIcon from "@mui/icons-material/Description";
import PeopleIcon from "@mui/icons-material/People";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";

import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../store";

import { Relationship } from "@core/domain";
import {
  clearIndividuals,
  fetchIndividuals,
} from "../features/individualsSlice";
import {
  clearRelationships,
  fetchRelationships,
} from "../features/relationshipsSlice";

export function ResetDatabaseButton() {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();

  const handleConfirm = async () => {
    // unified: both web + electron impls should have resetDatabase()
    await (window as any).api.resetDatabase?.();

    // clear redux
    dispatch(clearIndividuals());
    dispatch(clearRelationships());

    setOpen(false);

    // reload UI state after wipe
    window.location.reload();
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

export default function Dashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector(
    (s) => s.relationships.items
  ) as Relationship[];

  const individualCount = individuals.length;
  const marriageCount = relationships.filter((r) => r.type === "spouse").length;

  // Count unique parent-child "families"
  const familySet = new Set<string>();
  for (const r of relationships) {
    if (r.type === "parent-child") {
      const key =
        [...(r.parentIds || [])].sort().join(",") + "->" + (r as any).childId;
      familySet.add(key);
    }
  }
  const familyCount = familySet.size;

  // ─────────────────────────────────
  // Import Excel
  // In Electron:
  //   api.importExcel() should open dialog, parse file, persist to lowdb, return {count, relCount}
  //
  // In Web:
  //   api.importExcel() should open a hidden <input type="file">, read ArrayBuffer,
  //   call parseExcelData(...), persist to IndexedDB/localStorage, return {count, relCount}
  // ─────────────────────────────────
  const handleImportExcel = async () => {
      const result = await (window as any).api.importExcel();
      if (result) {
        alert(
          `Importerade ${result.count} personer och ${result.relCount} relationer.`
        );
        await dispatch(fetchIndividuals());
        await dispatch(fetchRelationships());
      }
  };

  // ─────────────────────────────────
  // Import GEDCOM
  // Same idea: api.importGedcom() abstracts file picking + parsing.
  // ─────────────────────────────────
  const handleImportGedcom = async () => {
    const result = await (window as any).api.importGedcom?.();
    if (result) {
      alert(
        `Importerade ${result.count} personer och ${result.relCount} relationer.`
      );
      await dispatch(fetchIndividuals());
      await dispatch(fetchRelationships());
    }
  };

  // ─────────────────────────────────
  // Export Excel
  // In Electron:
  //   api.exportIndividualsExcel() should show save dialog and write the file.
  //
  // In Web:
  //   api.exportIndividualsExcel() should build the workbook with
  //   buildIndividualsWorkbook/buildRelationshipsWorkbook,
  //   turn that into a Blob, and trigger download. It can just return { success: true }.
  // ─────────────────────────────────
  const handleExportExcel = async () => {
    const res = await (window as any).api.exportIndividualsExcel?.();
    if (res?.success) {
      alert("Excel-export klar!");
    }
  };

  // ─────────────────────────────────
  // Export GEDCOM
  // In Electron:
  //   api.exportGedcom() writes to disk via dialog/save.
  //
  // In Web:
  //   api.exportGedcom() should call buildGedcom(...),
  //   make a Blob, trigger .ged download, return {success:true}.
  // ─────────────────────────────────
  const handleExportGedcom = async () => {
    const res = await (window as any).api.exportGedcom?.();
    if (res?.success) {
      alert("GEDCOM-export klar!");
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h6">{t("dashboard")}</Typography>

      {/* Summary cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <PeopleIcon color="primary" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h6">Individer</Typography>
              <Typography variant="h5" fontWeight={600}>
                {individualCount}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <FavoriteIcon color="error" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h6">Äktenskap</Typography>
              <Typography variant="h5" fontWeight={600}>
                {marriageCount}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <FamilyRestroomIcon color="success" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h6">Familjer</Typography>
              <Typography variant="h5" fontWeight={600}>
                {familyCount}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Import/Export actions */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={handleImportExcel}
        >
          Importera Excel
        </Button>

        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={handleImportGedcom}
        >
          Importera GEDCOM
        </Button>

        <Button
          variant="outlined"
          startIcon={<DescriptionIcon />}
          onClick={handleExportExcel}
        >
          Exportera Excel
        </Button>

        <Button
          variant="outlined"
          startIcon={<DescriptionIcon />}
          onClick={handleExportGedcom}
        >
          Exportera GEDCOM
        </Button>

        <ResetDatabaseButton />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Databasen innehåller {individualCount} individer, {marriageCount}{" "}
          äktenskap och {familyCount} familjer.
        </Typography>
      </Box>
    </Box>
  );
}