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
} from "@mui/material";
import { Add, Delete, Edit, FileDownload } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchRelationships, deleteRelationship } from "../features/relationshipsSlice";
import RelationshipEditor from "../components/RelationshipEditor";
import { Relationship } from "../types/relationship";
import { fullName } from "../utils/nameUtils";
import SearchBar from "../components/SearchBar";

export default function RelationshipsPage() {
  const dispatch = useAppDispatch();
  const relationships = useAppSelector((s) => s.relationships.items);
  const individuals = useAppSelector((s) => s.individuals.items);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRel, setEditingRel] = useState<Relationship | undefined>();
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchRelationships());
  }, [dispatch]);

  const resolveName = (id: string) => fullName(individuals.find((i) => i.id === id));

  const visibleRelationships = useMemo(() => {
    if (!filteredIds.length) return relationships;

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
  }, [relationships, filteredIds]);

  return (
    <Box p={2} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Typography variant="h4" gutterBottom>Relationer</Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <SearchBar onResults={setFilteredIds} showDropdown={false} />
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
              const result = await window.genealogyAPI.exportRelationshipsExcel();
              if (result.success) {
                alert(`Excel-fil exporterad till ${result.path}`);
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
                    `${resolveName((r as any).person1Id)} & ${resolveName((r as any).person2Id)} — ${r.weddingDate || ""}`}
                  {r.type === "parent-child" &&
                    `${(r as any).parentIds.map(resolveName).join(" & ")} → ${resolveName((r as any).childId)}`}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => { setEditingRel(r); setEditorOpen(true); }}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => dispatch(deleteRelationship(r.id))}>
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
    </Box>
  );
}