import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Drawer,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchIndividuals,
  addIndividual,
  updateIndividual,
  deleteIndividual,
} from "../features/individualsSlice";
import { Individual, IndividualSchema } from "../types/individual";
import SearchBar from "../components/SearchBar";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import IndividualDetails from "../components/IndividualDetails"; // 👈 new import

export default function IndividualsPage() {
  const dispatch = useAppDispatch();
  const individuals = useAppSelector((s) => s.individuals.items);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  const visibleIndividuals = filteredIds.length
    ? individuals.filter((i) => filteredIds.includes(i.id))
    : individuals;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Individual | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Partial<Individual>>({});
  const [selected, setSelected] = useState<Individual | null>(null); // 👈 for details panel

  useEffect(() => {
    dispatch(fetchIndividuals());
  }, [dispatch]);

  const handleOpen = (ind?: Individual) => {
    setEditing(ind || null);
    setForm(ind || {});
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleChange =
    (field: keyof Individual) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [field]: e.target.value });
    };

  const handleSave = () => {
    const candidate = { ...form, id: editing?.id || uuidv4() };
    const result = IndividualSchema.safeParse(candidate);
    if (!result.success) {
      const errMap: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errMap[issue.path[0] as string] = issue.message;
      });
      setErrors(errMap);
      return;
    }

    if (editing) {
      dispatch(updateIndividual({ id: editing.id, updates: result.data }));
    } else {
      dispatch(addIndividual(result.data));
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch(deleteIndividual(id));
  };

  return (
    <Box p={2} sx={{ display: "flex", height: "calc(100vh - 120px)" }}>
      {/* Main content */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Typography variant="h4" gutterBottom>
          Personer
        </Typography>

        <Box display="flex" mb={2} gap={2}>
          {/* 🔎 Shared fuzzy search bar */}
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
        </Box>

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
                sx={{ cursor: "pointer" }}
                onClick={() => setSelected(ind)} // 👈 open side panel
              >
                <TableCell>{ind.name}</TableCell>
                <TableCell>{ind.dateOfBirth || ""}</TableCell>
                <TableCell>{ind.dateOfDeath || ""}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent opening details
                      handleOpen(ind);
                    }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
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

      {/* Right side: Individual details drawer */}
      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <Box sx={{ width: 320, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {selected.name}
            </Typography>
            <IndividualDetails
              individual={selected}
              onClose={() => setSelected(null)}
            />
          </Box>
        )}
      </Drawer>

      {/* Form Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Redigera person" : "Ny person"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Namn"
            fullWidth
            margin="normal"
            value={form.name || ""}
            onChange={handleChange("name")}
            error={!!errors.name}
            helperText={errors.name}
          />
          <TextField
            label="Födelsedatum"
            fullWidth
            margin="normal"
            value={form.dateOfBirth || ""}
            onChange={handleChange("dateOfBirth")}
          />
          <TextField
            label="Region (födelse)"
            fullWidth
            margin="normal"
            value={form.birthRegion || ""}
            onChange={handleChange("birthRegion")}
          />
          <TextField
            label="Församling (födelse)"
            fullWidth
            margin="normal"
            value={form.birthCongregation || ""}
            onChange={handleChange("birthCongregation")}
          />
          <TextField
            label="Stad (födelse)"
            fullWidth
            margin="normal"
            value={form.birthCity || ""}
            onChange={handleChange("birthCity")}
          />
          <TextField
            label="Dödsdatum"
            fullWidth
            margin="normal"
            value={form.dateOfDeath || ""}
            onChange={handleChange("dateOfDeath")}
          />
          <TextField
            label="Region (död)"
            fullWidth
            margin="normal"
            value={form.deathRegion || ""}
            onChange={handleChange("deathRegion")}
          />
          <TextField
            label="Församling (död)"
            fullWidth
            margin="normal"
            value={form.deathCongregation || ""}
            onChange={handleChange("deathCongregation")}
          />
          <TextField
            label="Stad (död)"
            fullWidth
            margin="normal"
            value={form.deathCity || ""}
            onChange={handleChange("deathCity")}
          />
          <TextField
            label="Berättelse"
            fullWidth
            margin="normal"
            multiline
            minRows={3}
            value={form.story || ""}
            onChange={handleChange("story")}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Avbryt</Button>
          <Button variant="contained" onClick={handleSave}>
            Spara
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}