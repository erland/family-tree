import React, { useEffect, useState } from "react";
import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchRelationships, addRelationship, deleteRelationship } from "../features/relationshipsSlice";
import RelationshipEditor from "../components/RelationshipEditor";
import { Relationship } from "../types/relationship";

export default function RelationshipsPage() {
  const dispatch = useAppDispatch();
  const relationships = useAppSelector((s) => s.relationships.items);
  const individuals = useAppSelector((s) => s.individuals.items);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchRelationships());
  }, [dispatch]);

  const resolveName = (id: string) => individuals.find((i) => i.id === id)?.name || id;

  const handleSave = (rel: Relationship) => {
    dispatch(addRelationship(rel));
  };

  const handleDelete = (id: string) => {
    dispatch(deleteRelationship(id));
  };

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>Relationer</Typography>
      <Button startIcon={<Add />} variant="contained" onClick={() => setOpen(true)}>
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
                <IconButton onClick={() => handleDelete(r.id)}>
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RelationshipEditor open={open} onClose={() => setOpen(false)} onSave={handleSave} />
    </Box>
  );
}