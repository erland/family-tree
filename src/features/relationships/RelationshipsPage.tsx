import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogActions,
  DialogTitle,
} from "@mui/material";
import { Add, Delete, Edit, FileDownload } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchRelationships, deleteRelationship } from "../relationshipsSlice";
import RelationshipEditor from "./RelationshipEditor";
import { Relationship } from "@core/domain";
import { fullName } from "@core/domain";
import SearchBar from "../../components/SearchBar";

export default function RelationshipsPage() {
  const dispatch = useAppDispatch();
  const relationships = useAppSelector((s) => s.relationships.items);
  const individuals = useAppSelector((s) => s.individuals.items);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRel, setEditingRel] = useState<Relationship | undefined>();
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // 🔹 Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Relationship | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string>("");

  useEffect(() => {
    dispatch(fetchRelationships());
  }, [dispatch]);

  const resolveName = (id: string) => fullName(individuals.find((i) => i.id === id));

  const visibleRelationships = useMemo(() => {
    if (searchQuery.length === 0) return relationships;
    if (filteredIds.length === 0) return [];
    return relationships.filter((r) => {
      if (r.type === "spouse") {
        return (
          filteredIds.includes((r as any).person1Id) ||
          filteredIds.includes((r as any).person2Id)
        );
      }
      if (r.type === "parent-child") {
        return (
          (r as any).parentIds.some((pid: string) => filteredIds.includes(pid)) ||
          filteredIds.includes((r as any).childId)
        );
      }
      return false;
    });
  }, [relationships, filteredIds, searchQuery]);

  // 🔹 Ask before deleting
  const askDelete = (r: Relationship) => {
    let label = "";
    if (r.type === "spouse") {
      label = `${resolveName((r as any).person1Id)} & ${resolveName(
        (r as any).person2Id
      )}`;
    } else if (r.type === "parent-child") {
      label = `${(r as any).parentIds.map(resolveName).join(" & ")} → ${resolveName(
        (r as any).childId
      )}`;
    } else {
      label = r.type;
    }
    setPendingDelete(r);
    setPendingLabel(label);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDelete) dispatch(deleteRelationship(pendingDelete.id));
    setConfirmOpen(false);
    setPendingDelete(null);
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setPendingDelete(null);
  };

  return (
    <Box p={2} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <SearchBar
          onResults={setFilteredIds}
          onQueryChange={setSearchQuery}
          showDropdown={false}
        />
        <Button
          startIcon={<Add />}
          variant="contained"
          onClick={() => {
            setEditingRel(undefined);
            setEditorOpen(true);
          }}
        >
          Ny
        </Button>
        <Tooltip title="Exportera Excel">
          <IconButton
            onClick={async () => {
              const result = await (window as any).api.exportRelationshipsExcel();
              if (result.success) {
                alert(`Excel-fil exporterad`);
              }
            }}
          >
            <FileDownload />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Typ</TableCell>
              <TableCell>Detaljer</TableCell>
              <TableCell>Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRelationships.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.type}</TableCell>
                <TableCell>
                  {r.type === "spouse" &&
                    `${resolveName((r as any).person1Id)} & ${resolveName(
                      (r as any).person2Id
                    )} — ${r.weddingDate || ""}`}
                  {r.type === "parent-child" &&
                    `${(r as any).parentIds
                      .map(resolveName)
                      .join(" & ")} → ${resolveName((r as any).childId)}`}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => {
                      setEditingRel(r);
                      setEditorOpen(true);
                    }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    onClick={() => askDelete(r)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <RelationshipEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        relationship={editingRel}
      />

      {/* 🔹 Delete confirmation dialog */}
      <Dialog open={confirmOpen} onClose={handleCancelDelete}>
        <DialogTitle>
          {`Är du säker på att du vill ta bort relationen: ${pendingLabel}?`}
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