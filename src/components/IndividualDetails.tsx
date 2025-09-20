import { Box, IconButton, Typography, Divider } from "@mui/material";
import { Edit, Close } from "@mui/icons-material";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";

export default function IndividualDetails({
  individualId,
  onClose,
  onEdit,
}: {
  individualId: string;
  onClose?: () => void;
  onEdit?: (ind: Individual) => void;
}) {
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

  // 🔎 Parents of this individual
  const parentIds = relationships
    .filter((r) => r.type === "parent-child" && r.childId === individual.id)
    .flatMap((r) => r.parentIds);
  const parents = individuals.filter((i) => parentIds.includes(i.id));

  // 🔎 Spouses of this individual
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
    };
  });

  // 🔎 Children of this individual
  const childRels = relationships.filter(
    (r) => r.type === "parent-child" && r.parentIds.includes(individual.id)
  );

  // Group children by the *other parent* in the parent-child relation
  const groupedByPartner: Record<string, Individual[]> = {};
  const soloChildren: Individual[] = [];

  childRels.forEach((rel) => {
    const otherParents = rel.parentIds.filter((pid) => pid !== individual.id);
    const child = individuals.find((i) => i.id === rel.childId);
    if (!child) return;

    if (otherParents.length > 0) {
      const otherParentId = otherParents[0];
      if (!groupedByPartner[otherParentId]) {
        groupedByPartner[otherParentId] = [];
      }
      groupedByPartner[otherParentId].push(child);
    } else {
      soloChildren.push(child);
    }
  });

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography
          variant="h6"
          noWrap
          sx={{
            flexGrow: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {individual.name}
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
          {onEdit && (
            <IconButton
              size="small"
              onClick={() => onEdit(individual)}
              aria-label="Redigera"
            >
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
          <Box sx={{ pl: 2 }}>
            {individual.birthRegion && (
              <Typography variant="body2">
                Region: {individual.birthRegion}
              </Typography>
            )}
            {individual.birthCity && (
              <Typography variant="body2">Stad: {individual.birthCity}</Typography>
            )}
            {individual.birthCongregation && (
              <Typography variant="body2">
                Församling: {individual.birthCongregation}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {hasDeath && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            Död: {individual.dateOfDeath ?? "-"}
          </Typography>
          <Box sx={{ pl: 2 }}>
            {individual.deathRegion && (
              <Typography variant="body2">
                Region: {individual.deathRegion}
              </Typography>
            )}
            {individual.deathCity && (
              <Typography variant="body2">Stad: {individual.deathCity}</Typography>
            )}
            {individual.deathCongregation && (
              <Typography variant="body2">
                Församling: {individual.deathCongregation}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {parents.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            Föräldrar:
          </Typography>
          <Box sx={{ pl: 2 }}>
            {parents.map((parent) => (
              <Typography key={parent.id} variant="body2">
                {parent.name}{" "}
                {parent.dateOfBirth ? `(${parent.dateOfBirth})` : ""}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {spouses.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            Gift med:
          </Typography>
          <Box sx={{ pl: 2 }}>
            {spouses.map(({ partner, weddingDate }, idx) => (
              <Typography key={idx} variant="body2">
                {partner ? partner.name : "Okänd"}{" "}
                {weddingDate ? `(${weddingDate})` : ""}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {(Object.keys(groupedByPartner).length > 0 ||
        soloChildren.length > 0) && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            Barn:
          </Typography>
          <Box sx={{ pl: 2 }}>
            {Object.entries(groupedByPartner).map(([partnerId, children]) => {
              const partner = individuals.find((i) => i.id === partnerId);
              return (
                <Box key={partnerId} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Med {partner ? partner.name : "okänd partner"}:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {children.map((child) => (
                      <Typography key={child.id} variant="body2">
                        {child.name}{" "}
                        {child.dateOfBirth ? `(${child.dateOfBirth})` : ""}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              );
            })}

            {soloChildren.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  Utan känd partner:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {soloChildren.map((child) => (
                    <Typography key={child.id} variant="body2">
                      {child.name}{" "}
                      {child.dateOfBirth ? `(${child.dateOfBirth})` : ""}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {individual.story && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            Berättelse:
          </Typography>
          <Typography variant="body2">{individual.story}</Typography>
        </Box>
      )}
    </Box>
  );
}