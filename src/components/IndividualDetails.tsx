import { Box, Button, Divider, Typography } from "@mui/material";
import { Individual } from "../types/individual";

export default function IndividualDetails({
  individual,
  onClose,
}: {
  individual: Individual;
  onClose?: () => void;
}) {
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

  return (
    // ⬇️ no border here; parent draws it
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
      {/* Header: name + close aligned; name truncates so button never clips */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          variant="h6"
          noWrap
          sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {individual.name}
        </Typography>
        {onClose && (
          <Button size="small" variant="outlined" onClick={onClose}>
            STÄNG
          </Button>
        )}
      </Box>

      <Divider />

      {hasBirth && (
        <Box>
          <Typography variant="body2" fontWeight={700}>
            Född: {individual.dateOfBirth ?? "-"}
          </Typography>
          <Box sx={{ pl: 2 }}>
            {individual.birthRegion && <Typography variant="body2">Region: {individual.birthRegion}</Typography>}
            {individual.birthCity && <Typography variant="body2">Stad: {individual.birthCity}</Typography>}
            {individual.birthCongregation && (
              <Typography variant="body2">Församling: {individual.birthCongregation}</Typography>
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
            {individual.deathRegion && <Typography variant="body2">Region: {individual.deathRegion}</Typography>}
            {individual.deathCity && <Typography variant="body2">Stad: {individual.deathCity}</Typography>}
            {individual.deathCongregation && (
              <Typography variant="body2">Församling: {individual.deathCongregation}</Typography>
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