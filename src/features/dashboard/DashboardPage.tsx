// src/pages/Dashboard.tsx
import React from "react";
import {
  Box,
  Button,
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

import { useDashboardViewModel } from "./useDashboardViewModel";
import { ResetDatabaseButton } from "../../components/ResetDatabaseButton";

export default function DashboardPage() {
  const { t } = useTranslation();

  const {
    individualCount,
    marriageCount,
    familyCount,
    handleImportExcel,
    handleImportGedcom,
    handleExportExcel,
    handleExportGedcom,
    handleResetDatabase,
  } = useDashboardViewModel();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

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

        <ResetDatabaseButton onConfirm={handleResetDatabase} />
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