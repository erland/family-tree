import { Box, IconButton, Typography, Divider, Button, List, ListItem, ListItemText } from "@mui/material";
import { Edit, Close } from "@mui/icons-material";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { fullName } from "../utils/nameUtils";
import { addIndividual } from "../features/individualsSlice";
import { addRelationship, fetchRelationships } from "../features/relationshipsSlice";
import AddChildDialog from "./AddChildDialog";
import AddParentDialog from "./AddParentDialog";
import RelationshipEditor from "./RelationshipEditor";

export default function IndividualDetails({
  individualId,
  onClose,
  onEdit,
}: {
  individualId: string;
  onClose?: () => void;
  onEdit?: (ind: Individual) => void;
}) {
  const dispatch = useDispatch();
  const [openAddChild, setOpenAddChild] = useState(false);
  const [openAddParent, setOpenAddParent] = useState(false);
  const [editingRel, setEditingRel] = useState<Relationship | null>(null);

  // Always grab the freshest version from the store
  const individual = useAppSelector((s) =>
    s.individuals.items.find((i) => i.id === individualId)
  );

  if (!individual) return null; // safety

  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);

  const hasBirth =
    individual.dateOfBirth ||
    individual.birthRegion ||
    individual.birthCity ||
    individual.birthCongregation;

  const hasDeath =
    individual.dateOfDeath ||
    individual.deathRegion ||
    individual.deathCity ||
    individual.deathCongregation;

  // 🔎 Parents
  const parentRels = relationships.filter(
    (r) => r.type === "parent-child" && r.childId === individual.id
  );
  const parentIds = parentRels.flatMap((r) => r.parentIds);
  const parents = individuals.filter((i) => parentIds.includes(i.id));

  // 🔎 Spouses
  const spouseRels = relationships.filter(
    (r) =>
      r.type === "spouse" &&
      ((r as any).person1Id === individual.id || (r as any).person2Id === individual.id)
  );
  const spouses = spouseRels.map((r) => {
    const otherId =
      (r as any).person1Id === individual.id
        ? (r as any).person2Id
        : (r as any).person1Id;
    return {
      partner: individuals.find((i) => i.id === otherId),
      weddingDate: (r as any).weddingDate ?? null,
      rel: r,
    };
  });

  // 🔎 Children
  const childRels = relationships.filter(
    (r) => r.type === "parent-child" && r.parentIds.includes(individual.id)
  );

  const groupedByPartner: Record<string, { child: Individual; rel: Relationship }[]> = {};
  const soloChildren: { child: Individual; rel: Relationship }[] = [];

  childRels.forEach((rel) => {
    const child = individuals.find((i) => i.id === rel.childId);
    if (!child) return;

    let otherParentIds = rel.parentIds.filter((pid) => pid !== individual.id);
    if (otherParentIds.length === 0) {
      const allParentIdsForChild = relationships
        .filter((r) => r.type === "parent-child" && r.childId === rel.childId)
        .flatMap((r) => r.parentIds as string[]);
      otherParentIds = Array.from(
        new Set(allParentIdsForChild.filter((pid) => pid !== individual.id))
      );
    }

    if (otherParentIds.length > 0) {
      otherParentIds.forEach((partnerId) => {
        if (!groupedByPartner[partnerId]) groupedByPartner[partnerId] = [];
        groupedByPartner[partnerId].push({ child, rel });
      });
    } else {
      soloChildren.push({ child, rel });
    }
  });

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography
          variant="h6"
          noWrap
          sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {fullName(individual)}
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
          {onEdit && (
            <IconButton size="small" onClick={() => onEdit(individual)} aria-label="Redigera">
              <Edit fontSize="small" />
            </IconButton>
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose} aria-label="Stäng">
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      <Divider />

      {hasBirth && (
        <Box>
          <Typography variant="body2" fontWeight={700}>
            Född: {individual.dateOfBirth ?? "-"}
          </Typography>
        </Box>
      )}

      {hasDeath && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            Död: {individual.dateOfDeath ?? "-"}
          </Typography>
        </Box>
      )}

      {parents.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>Föräldrar:</Typography>
          <List dense>
            {parents.map((parent) => {
              const rel = parentRels.find((r) => r.parentIds.includes(parent.id));
              return (
                <ListItem
                  key={parent.id}
                  secondaryAction={
                    rel && (
                      <IconButton edge="end" onClick={() => setEditingRel(rel)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText primary={fullName(parent)} />
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}

      {parents.length < 2 && (
        <Box sx={{ mt: 1 }}>
          <Button variant="outlined" onClick={() => setOpenAddParent(true)}>
            Lägg till förälder
          </Button>
        </Box>
      )}

      {spouses.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>Gift med:</Typography>
          <List dense>
            {spouses.map(({ partner, weddingDate, rel }, idx) => (
              <ListItem
                key={idx}
                secondaryAction={
                  <IconButton edge="end" onClick={() => setEditingRel(rel)}>
                    <Edit fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={partner ? fullName(partner) : "Okänd"}
                  secondary={weddingDate ? `(${weddingDate})` : ""}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {(Object.keys(groupedByPartner).length > 0 || soloChildren.length > 0) && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>Barn:</Typography>
          {Object.entries(groupedByPartner).map(([partnerId, children]) => {
            const partner = individuals.find((i) => i.id === partnerId);
            return (
              <Box key={partnerId} sx={{ mt: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  Med {partner ? fullName(partner) : "okänd partner"}:
                </Typography>
                <List dense>
                  {children.map(({ child, rel }) => (
                    <ListItem
                      key={child.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => setEditingRel(rel)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText primary={fullName(child)} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            );
          })}

          {soloChildren.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>Utan känd partner:</Typography>
              <List dense>
                {soloChildren.map(({ child, rel }) => (
                  <ListItem
                    key={child.id}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => setEditingRel(rel)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={fullName(child)} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      )}

      {/* Add child button */}
      <Box sx={{ mt: 1 }}>
        <Button variant="outlined" onClick={() => setOpenAddChild(true)}>
          Lägg till barn
        </Button>
      </Box>

      {individual.story && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>Berättelse:</Typography>
          <Typography variant="body2">{individual.story}</Typography>
        </Box>
      )}

      {/* Add dialogs */}
      <AddChildDialog
        open={openAddChild}
        onClose={() => setOpenAddChild(false)}
        parentId={individual.id}
        onAdd={async (payload) => {
          try {
            if (payload.mode === "new") {
              const newId = crypto.randomUUID();
              const { parentId, ...childData } = payload.data;
              const newChild = { id: newId, ...childData };
              await dispatch(addIndividual(newChild)).unwrap();

              const rel = {
                id: crypto.randomUUID(),
                type: "parent-child" as const,
                parentIds: [individual.id].concat(payload.otherParentId ? [payload.otherParentId] : []),
                childId: newId,
              };
              await dispatch(addRelationship(rel)).unwrap();
            } else {
              const rel = {
                id: crypto.randomUUID(),
                type: "parent-child" as const,
                parentIds: [individual.id].concat(payload.otherParentId ? [payload.otherParentId] : []),
                childId: payload.childId,
              };
              await dispatch(addRelationship(rel)).unwrap();
            }
            await dispatch(fetchRelationships()).unwrap();
          } catch (e) {
            console.error("Failed to add child/relationship:", e);
            alert("Kunde inte spara barnet eller relationen.");
          }
        }}
      />

      <AddParentDialog
        open={openAddParent}
        onClose={() => setOpenAddParent(false)}
        childId={individual.id}
        onAdd={async (payload) => {
          try {
            if (payload.mode === "new") {
              const newId = crypto.randomUUID();
              const { data } = payload;
              const newParent = { id: newId, ...data };
              await dispatch(addIndividual(newParent)).unwrap();

              const rel = {
                id: crypto.randomUUID(),
                type: "parent-child" as const,
                parentIds: [newId],
                childId: individual.id,
              };
              await dispatch(addRelationship(rel)).unwrap();
            } else {
              const rel = {
                id: crypto.randomUUID(),
                type: "parent-child" as const,
                parentIds: [payload.parentId],
                childId: individual.id,
              };
              await dispatch(addRelationship(rel)).unwrap();
            }
            await dispatch(fetchRelationships()).unwrap();
          } catch (e) {
            console.error("Failed to add parent/relationship:", e);
            alert("Kunde inte spara föräldern eller relationen.");
          }
        }}
      />

      <RelationshipEditor
        open={!!editingRel}
        relationship={editingRel || undefined}
        onClose={() => setEditingRel(null)}
      />
    </Box>
  );
}