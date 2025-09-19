import React from "react";
import { Box, Typography, Divider, Button } from "@mui/material";
import { Individual } from "../types/individual";

export default function IndividualDetails({
  individual,
  onClose,
}: {
  individual: Individual;
  onClose?: () => void;
}) {
  if (!individual) return null;

  return (
    <Box
      sx={{
        width: 320,
        borderLeft: "1px solid #ddd",
        p: 2,
        bgcolor: "#fafafa",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
      >
        <Typography variant="h6">{individual.name}</Typography>
        {onClose && (
          <Button size="small" variant="outlined" onClick={onClose}>
            Stäng
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Birth section */}
      {(individual.dateOfBirth ||
        individual.birthRegion ||
        individual.birthCity ||
        individual.birthCongregation) && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Född:</strong> {individual.dateOfBirth || ""}
          </Typography>
          {individual.birthRegion && (
            <Typography variant="body2" sx={{ pl: 2 }}>
              Region: {individual.birthRegion}
            </Typography>
          )}
          {individual.birthCity && (
            <Typography variant="body2" sx={{ pl: 2 }}>
              Stad: {individual.birthCity}
            </Typography>
          )}
          {individual.birthCongregation && (
            <Typography variant="body2" sx={{ pl: 2 }}>
              Församling: {individual.birthCongregation}
            </Typography>
          )}
        </Box>
      )}

      {/* Death section */}
      {(individual.dateOfDeath ||
        individual.deathRegion ||
        individual.deathCity ||
        individual.deathCongregation) && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Död:</strong> {individual.dateOfDeath || ""}
          </Typography>
          {individual.deathRegion && (
            <Typography variant="body2" sx={{ pl: 2 }}>
              Region: {individual.deathRegion}
            </Typography>
          )}
          {individual.deathCity && (
            <Typography variant="body2" sx={{ pl: 2 }}>
              Stad: {individual.deathCity}
            </Typography>
          )}
          {individual.deathCongregation && (
            <Typography variant="body2" sx={{ pl: 2 }}>
              Församling: {individual.deathCongregation}
            </Typography>
          )}
        </Box>
      )}

      {/* Story */}
      {individual.story && (
        <Typography variant="body2" sx={{ mt: 2, whiteSpace: "pre-line" }}>
          <strong>Berättelse:</strong> {individual.story}
        </Typography>
      )}
    </Box>
  );
}