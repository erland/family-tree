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
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchIndividuals,
  deleteIndividual,
} from "../features/individualsSlice";
import { Individual } from "../types/individual";
import SearchBar from "../components/SearchBar";
import IndividualDetails from "../components/IndividualDetails";
import IndividualFormDialog from "../components/IndividualFormDialog";
import { fullName } from "../utils/nameUtils"; // at top
import { dialog } from "@tauri-apps/api/dialog";

export default function IndividualsPage() {
  const dispatch = useAppDispatch();
  const individuals = useAppSelector((s) => s.individuals.items);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  const visibleIndividuals = filteredIds.length
    ? individuals.filter((i) => filteredIds.includes(i.id))
    : individuals;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Individual | null>(null);
  const [selected, setSelected] = useState<Individual | null>(null);

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

  const handleDelete = (id: string) => {
    dispatch(deleteIndividual(id));
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
      <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center" }}>
        <SearchBar onResults={setFilteredIds} showDropdown={false} />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
        >
          Ny person
        </Button>
        <Button
          variant="outlined"
          onClick={async () => {
            const result = await window.genealogyAPI.exportIndividualsExcel();
            if (result.success) {
              alert(`Excel-fil exporterad till ${result.path}`);
            }
          }}
        >
          Exportera Excel
        </Button>
        <Button
          variant="contained"
          onClick={async () => {
            // open file picker
            const filePath = await window.electronAPI.showOpenDialog({
              filters: [{ name: "Excel", extensions: ["xls", "xlsx", "xlsm"] }],
              properties: ["openFile"],
            });
            if (filePath) {
              const result = await window.genealogyAPI.importExcel(filePath[0]);
              alert(`Imported ${result.count} individuals and ${result.relCount} relationships`);
            }
          }}
        >
          Import Excel
        </Button>
      </Box>

      {/* Content area: table + overlay details */}
      <Box sx={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Table */}
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
                        handleDelete(ind.id);
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

        {/* Overlay Details */}
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
    </Box>
  );
}