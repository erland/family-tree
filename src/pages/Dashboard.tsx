import React from "react";
import { Box, Button, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DescriptionIcon from "@mui/icons-material/Description";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">{t("dashboard")}</Typography>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
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
      </Box>
    </Box>
  );
}