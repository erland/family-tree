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
  DialogContent,
  useMediaQuery,
  useTheme,
  Tooltip,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  fetchIndividuals,
  deleteIndividual,
} from "../individualsSlice";
import { Individual } from "@core/domain";
import SearchBar from "../../components/SearchBar";
import IndividualDetails from "./IndividualDetails";
import IndividualFormDialog from "./IndividualFormDialog";
import { fullName } from "@core/domain";
import { exportAllIndividualsPdf } from "../../utils/exportAllIndividualsPdf";

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

  // 🔹 Responsive breakpoint
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

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

        // On desktop: fixed-height app pane like before.
        // On mobile: let it be natural height so nothing is squashed away.
        height: {
          xs: "auto",
          md: "calc(100vh - 120px)",
        },

        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          gap: 1,
          alignItems: "center",
          flexWrap: "wrap",

          // Make sure it stays visible when the list scrolls under it on mobile.
          position: "sticky",
          top: 0,
          zIndex: 5,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 220 }}>
          <SearchBar
            onResults={setFilteredIds}
            onQueryChange={setSearchQuery}
            showDropdown={false}
          />
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          size={isSmall ? "small" : "medium"}
        >
          Ny
        </Button>

        <Tooltip title="Exportera alla till PDF">
          <IconButton
            onClick={() =>
              exportAllIndividualsPdf(individuals, relationships)
            }
            size={isSmall ? "small" : "medium"}
          >
            <PictureAsPdfIcon fontSize={isSmall ? "small" : "medium"} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Content area */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          overflow: "hidden",

          // On mobile we still want scrolling for the table,
          // but not to hide the toolbar.
        }}
      >
        <Box
          sx={{
            height: { xs: "auto", md: "100%" },
            overflow: "auto",
            p: 2,
            pt: 0, // we already have padding in the sticky header
          }}
        >
          <Table size={isSmall ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell>Namn</TableCell>
                {!isSmall && <TableCell>Födelse</TableCell>}
                {!isSmall && <TableCell>Död</TableCell>}
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
                  <TableCell
                    sx={{
                      maxWidth: 200,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {fullName(ind)}
                    {isSmall && (
                      <Typography
                        variant="caption"
                        component="div"
                        sx={{ color: "text.secondary" }}
                      >
                        {ind.dateOfBirth || ""} – {ind.dateOfDeath || ""}
                      </Typography>
                    )}
                  </TableCell>

                  {!isSmall && (
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {ind.dateOfBirth || ""}
                    </TableCell>
                  )}

                  {!isSmall && (
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {ind.dateOfDeath || ""}
                    </TableCell>
                  )}

                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <IconButton
                      size={isSmall ? "small" : "medium"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen(ind);
                      }}
                    >
                      <Edit fontSize={isSmall ? "small" : "medium"} />
                    </IconButton>
                    <IconButton
                      size={isSmall ? "small" : "medium"}
                      onClick={(e) => {
                        e.stopPropagation();
                        askDelete(ind);
                      }}
                    >
                      <Delete fontSize={isSmall ? "small" : "medium"} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {/* Desktop / tablet side panel */}
        {!isSmall && selected && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 320,
              borderLeft: "1px solid #ddd",
              p: 2,
              bgcolor: "#fafafa",
              overflowY: "auto",
              zIndex: 10,
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

      {/* Mobile full-screen details dialog */}
      {isSmall && (
        <Dialog
          fullScreen
          open={!!selected}
          onClose={() => setSelected(null)}
          PaperProps={{
            sx: {
              bgcolor: "background.default",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >

          <DialogContent
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 2,
            }}
          >
            {selected && (
              <IndividualDetails
                individualId={selected.id}
                onClose={() => setSelected(null)}
                onEdit={(ind) => handleOpen(ind)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

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
            ? `Är du säker på att du vill ta bort ${fullName(
                pendingDelete
              )}?`
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