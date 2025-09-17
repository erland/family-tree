import React, { useEffect, useState } from "react";
import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchRelationships, addRelationship, deleteRelationship } from "../features/relationshipsSlice";
import RelationshipEditor from "../components/RelationshipEditor";
import { Relationship } from "../types/relationship";

export default function RelationshipsPage() {
  const dispatch = useAppDispatch();
  const relationships = useAppSelector((s) => s.relationships.items);
  const individuals = useAppSelector((s) => s.individuals.items);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRel, setEditingRel] = useState<Relationship | undefined>();


  useEffect(() => {
    dispatch(fetchRelationships());
  }, [dispatch]);

  const resolveName = (id: string) => individuals.find((i) => i.id === id)?.name || id;

  const handleNew = () => {
    setEditingRel(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (rel: Relationship) => {
    setEditingRel(rel);
    setEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch(deleteRelationship(id));
  };

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>Relationer</Typography>
      <Button startIcon={<Add />} variant="contained" onClick={() => handleNew()}>
        Ny relation
      </Button>

      <Table sx={{ mt: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Typ</TableCell>
            <TableCell>Detaljer</TableCell>
            <TableCell>Åtgärder</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {relationships.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.type}</TableCell>
              <TableCell>
                {r.type === "spouse" &&
                  `${resolveName((r as any).person1Id)} & ${resolveName((r as any).person2Id)} — ${r.weddingDate || ""}`}
                {r.type === "parent-child" &&
                  `${(r as any).parentIds.map(resolveName).join(" & ")} → ${resolveName((r as any).childId)}`}
              </TableCell>
              <TableCell>
                <IconButton onClick={() => handleEdit(r)}>
                  <Edit />
                </IconButton>
                <IconButton onClick={() => handleDelete(r.id)}>
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RelationshipEditor open={editorOpen} onClose={() => setEditorOpen(false)} relationship={editingRel} />
    </Box>
  );
}