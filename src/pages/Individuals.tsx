import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogTitle,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import {
  FileDownload,
  FileUpload,
  FilePresent,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchIndividuals,
  deleteIndividual,
} from "../features/individualsSlice";
import { Individual } from "../types/individual";
import SearchBar from "../components/SearchBar";
import IndividualDetails from "../components/IndividualDetails";
import IndividualFormDialog from "../components/IndividualFormDialog";
import { fullName } from "../utils/nameUtils";
import { dialog } from "@tauri-apps/api/dialog";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { exportAllIndividualsPdf } from "../utils/exportAllIndividualsPdf";

export default function IndividualsPage() {
  const dispatch = useAppDispatch();
  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const visibleIndividuals =
    searchQuery.length === 0
      ? individuals
      : filteredIds.length > 0
      ? individuals.filter((i) => filteredIds.includes(i.id))
      : [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Individual | null>(null);
  const [selected, setSelected] = useState<Individual | null>(null);

  // 🔹 Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Individual | null>(null);

  useEffect(() => {
    dispatch(fetchIndividuals());
  }, [dispatch]);

  const handleOpen = (ind?: Individual) => {
    setEditing(ind || null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditing(null);
  };

  // 🔹 Ask before deleting
  const askDelete = (ind: Individual) => {
    setPendingDelete(ind);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDelete) {
      dispatch(deleteIndividual(pendingDelete.id));
    }
    setConfirmOpen(false);
    setPendingDelete(null);
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setPendingDelete(null);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
        <SearchBar
          onResults={setFilteredIds}
          onQueryChange={setSearchQuery}
          showDropdown={false}
        />

        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
          Ny
        </Button>

        <Tooltip title="Exportera Excel">
          <IconButton
            onClick={async () => {
              const result = await window.genealogyAPI.exportIndividualsExcel();
              if (result.success) {
                alert(`Excel-fil exporterad till ${result.path}`);
              }
            }}
          >
            <FileDownload />
          </IconButton>
        </Tooltip>

        <Tooltip title="Importera Excel">
          <IconButton
            onClick={async () => {
              const filePath = await window.electronAPI.showOpenDialog({
                filters: [{ name: "Excel", extensions: ["xls", "xlsx", "xlsm"] }],
                properties: ["openFile"],
              });
              if (filePath) {
                const result = await window.genealogyAPI.importExcel(filePath[0]);
                alert(
                  `Imported ${result.count} individuals and ${result.relCount} relationships`
                );
              }
            }}
          >
            <FileUpload />
          </IconButton>
        </Tooltip>

        <Tooltip title="Exportera GEDCOM">
          <IconButton onClick={() => window.genealogyAPI.exportGedcom()}>
            <FilePresent />
          </IconButton>
        </Tooltip>

        <Tooltip title="Exportera alla till PDF">
          <IconButton
            onClick={() => exportAllIndividualsPdf(individuals, relationships)}
          >
            <PictureAsPdfIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Content area */}
      <Box sx={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <Box sx={{ height: "100%", overflow: "auto", p: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Namn</TableCell>
                <TableCell>Födelse</TableCell>
                <TableCell>Död</TableCell>
                <TableCell>Åtgärder</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleIndividuals.map((ind) => (
                <TableRow
                  key={ind.id}
                  hover
                  onClick={() => setSelected(ind)}
                  style={{ cursor: "pointer" }}
                >
                  <TableCell>{fullName(ind)}</TableCell>
                  <TableCell>{ind.dateOfBirth || ""}</TableCell>
                  <TableCell>{ind.dateOfDeath || ""}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen(ind);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        askDelete(ind);
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {/* Right-side Details panel */}
        {selected && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 300,
              borderLeft: "1px solid #ddd",
              p: 2,
              bgcolor: "#fafafa",
              overflowY: "auto",
              zIndex: 2,
            }}
          >
            <IndividualDetails
              individualId={selected.id}
              onClose={() => setSelected(null)}
              onEdit={(ind) => handleOpen(ind)}
            />
          </Box>
        )}
      </Box>

      {/* Reusable Form Dialog */}
      <IndividualFormDialog
        open={formOpen}
        onClose={handleClose}
        individual={editing}
      />

      {/* 🔹 Delete confirmation dialog */}
      <Dialog open={confirmOpen} onClose={handleCancelDelete}>
        <DialogTitle>
          {pendingDelete
            ? `Är du säker på att du vill ta bort ${fullName(pendingDelete)}?`
            : ""}
        </DialogTitle>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Avbryt</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}