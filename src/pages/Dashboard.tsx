import React from "react";
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
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PeopleIcon from "@mui/icons-material/People";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "../store";
import { useState } from "react";
import { Relationship } from "../types/relationship";
import { clearIndividuals } from "../features/individualsSlice";
import { clearRelationships } from "../features/relationshipsSlice";

export function ResetDatabaseButton() {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();

  const handleConfirm = async () => {
    await window.genealogyAPI.resetDatabase();
    dispatch(clearIndividuals());
    dispatch(clearRelationships());
    setOpen(false);
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
          <Button color="error" onClick={handleConfirm}>Radera allt</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items) as Relationship[];

  // 🧮 Compute summary counts
  const individualCount = individuals.length;
  const marriageCount = relationships.filter((r) => r.type === "spouse").length;

  const familySet = new Set<string>();
  for (const r of relationships) {
    if (r.type === "parent-child") {
      const rel = r as any;
      const key = [...(rel.parentIds || [])].sort().join(",") + "->" + rel.childId;
      familySet.add(key);
    }
  }
  const familyCount = familySet.size;

  const handleImportExcel = async () => {
    const [filePath] = await window.electronAPI.showOpenDialog({
      title: "Importera från Excel",
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (filePath) {
      const result = await window.genealogyAPI.importExcel(filePath);
      alert(`Importerade ${result.count} personer och ${result.relCount} relationer.`);
    }
  };

  const handleImportGedcom = async () => {
    const [filePath] = await window.electronAPI.showOpenDialog({
      title: "Importera från GEDCOM",
      filters: [{ name: "GEDCOM", extensions: ["ged"] }],
    });
    if (filePath) {
      const result = await window.genealogyAPI.importGedcom(filePath);
      alert(`Importerade ${result.count} personer och ${result.relCount} relationer.`);
    }
  };

  const handleExportExcel = async () => {
    const res = await window.genealogyAPI.exportIndividualsExcel();
    if (res?.success) alert("Excel-export klar!");
  };

  const handleExportGedcom = async () => {
    const res = await window.genealogyAPI.exportGedcom();
    if (res?.success) alert("GEDCOM-export klar!");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h6">{t("dashboard")}</Typography>

      {/* ─────────────── Summary cards ─────────────── */}
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

      {/* ─────────────── Import/Export buttons ─────────────── */}
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
        <ResetDatabaseButton/>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Databasen innehåller {individualCount} individer, {marriageCount} äktenskap och{" "}
          {familyCount} familjer.
        </Typography>
      </Box>
    </Box>
  );
}