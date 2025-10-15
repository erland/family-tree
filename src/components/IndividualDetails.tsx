import {
  Box,
  IconButton,
  Typography,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { Edit, Close } from "@mui/icons-material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useState } from "react";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";
import { fullName } from "../utils/nameUtils";
import { exportPersonPdf } from "../utils/exportPersonPdf";
import {
  getParentsOf,
  getSpousesOf,
  groupChildrenByOtherParent,
} from "../utils/peopleSelectors";
import { getAllLocationEvents } from "../utils/timelineUtils";
import { formatLocation } from "../utils/location"; // ✅ NEW import

import AddChildDialog from "./AddChildDialog";
import AddParentDialog from "./AddParentDialog";
import RelationshipEditor from "./RelationshipEditor";

type Props = {
  individualId: string;
  onClose?: () => void;
  onEdit?: (ind: Individual) => void;
};

export default function IndividualDetails({ individualId, onClose, onEdit }: Props) {
  const [openAddChild, setOpenAddChild] = useState(false);
  const [openAddParent, setOpenAddParent] = useState(false);
  const [editingRel, setEditingRel] = useState<Relationship | null>(null);

  const individuals = useAppSelector((s) => s.individuals.items);
  const relationships = useAppSelector((s) => s.relationships.items);
  const individual = individuals.find((i) => i.id === individualId);

  if (!individual) return null;

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

  // Centralized selectors
  const parents = getParentsOf(individual.id, relationships, individuals);
  const spouses = getSpousesOf(individual.id, relationships, individuals);
  const childrenByOtherParent = groupChildrenByOtherParent(
    individual.id,
    relationships,
    individuals
  );

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography
          variant="h6"
          noWrap
          sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
          title={fullName(individual)}
        >
          {fullName(individual)}
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
          <IconButton
            size="small"
            onClick={() => exportPersonPdf(individual, individuals, relationships)}
            aria-label="Exportera till PDF"
          >
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>

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

      {/* Birth / Death */}
      {hasBirth && (
        <Box>
          <Typography variant="body2" fontWeight={700}>
            Född: {individual.dateOfBirth ?? "-"}
          </Typography>
          {formatLocation({
            city: individual.birthCity,
            congregation: individual.birthCongregation,
            region: individual.birthRegion,
          }) && (
            <Typography variant="body2" color="text.secondary">
              {formatLocation({
                city: individual.birthCity,
                congregation: individual.birthCongregation,
                region: individual.birthRegion,
              })}
            </Typography>
          )}
        </Box>
      )}

      {hasDeath && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            Död: {individual.dateOfDeath ?? "-"}
          </Typography>
          {formatLocation({
            city: individual.deathCity,
            congregation: individual.deathCongregation,
            region: individual.deathRegion,
          }) && (
            <Typography variant="body2" color="text.secondary">
              {formatLocation({
                city: individual.deathCity,
                congregation: individual.deathCongregation,
                region: individual.deathRegion,
              })}
            </Typography>
          )}
        </Box>
      )}

      {/* Parents */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" fontWeight={700}>
          Föräldrar
        </Typography>
        {parents.length > 0 ? (
          <List dense>
            {parents.map((p) => (
              <ListItem key={p.id}>
                <ListItemText primary={fullName(p)} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Okända föräldrar
          </Typography>
        )}

        {parents.length < 2 && (
          <Box sx={{ mt: 1 }}>
            <Button variant="outlined" size="small" onClick={() => setOpenAddParent(true)}>
              Lägg till förälder
            </Button>
          </Box>
        )}
      </Box>

      {/* Spouses */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" fontWeight={700}>
          Make/maka
        </Typography>
        {spouses.length > 0 ? (
          <List dense>
            {spouses.map(({ partner, weddingDate, relationship }, idx) => (
              <ListItem
                key={relationship.id ?? idx}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => setEditingRel(relationship)}
                    aria-label="Redigera relation"
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={partner ? fullName(partner) : "Okänd"}
                  secondary={weddingDate ? `Vigsel: ${weddingDate}` : undefined}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Ingen make/maka registrerad
          </Typography>
        )}
      </Box>

      {/* Children */}
      <Box sx={{ mt: 1, pb: 1 }}>
        <Typography variant="body2" fontWeight={700}>
          Barn
        </Typography>

        {childrenByOtherParent.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Inga barn registrerade
          </Typography>
        ) : (
          childrenByOtherParent.map(({ partner, children }, i) => (
            <Box key={i} sx={{ mt: i === 0 ? 0 : 1 }}>
              <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                Andra förälder: {partner ? fullName(partner) : "Okänd"}
              </Typography>
              <List dense>
                {children.map((c) => (
                  <ListItem key={c.id}>
                    <ListItemText primary={fullName(c)} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))
        )}

        <Box sx={{ mt: 1 }}>
          <Button variant="outlined" size="small" onClick={() => setOpenAddChild(true)}>
            Lägg till barn
          </Button>
        </Box>
      </Box>

      {/* Locations / moves */}
      {(() => {
        const moves = getAllLocationEvents(individual);
        if (moves.length === 0) return null;

        return (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1">Platser</Typography>
            <List dense>
              {moves.map((mv) => (
                <ListItem key={mv.id} disableGutters>
                  <ListItemText
                    primary={mv.date ? `${mv.date}  ${mv.label}` : mv.label}
                    secondary={mv.note}
                  />
                </ListItem>
              ))}
            </List>
          </>
        );
      })()}

      {/* Dialogs */}
      <AddChildDialog
        open={openAddChild}
        onClose={() => setOpenAddChild(false)}
        parentId={individual.id}
      />

      <AddParentDialog
        open={openAddParent}
        onClose={() => setOpenAddParent(false)}
        childId={individual.id}
      />

      <RelationshipEditor
        open={!!editingRel}
        onClose={() => setEditingRel(null)}
        relationship={editingRel ?? undefined}
      />
    </Box>
  );
}