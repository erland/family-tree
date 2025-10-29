// src/features/ages/AgeStatsSummary.tsx

import React from "react";
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

export interface AgeStatsSummaryProps {
  genderFilter: "all" | "male" | "female";
  onChangeGender: (val: "all" | "male" | "female") => void;
  average: number | string;
  median: number | string;
}

export function AgeStatsSummary({
  genderFilter,
  onChangeGender,
  average,
  median,
}: AgeStatsSummaryProps) {
  return (
    <Box sx={{ mb: 2 }}>
      {/* Gender filter toggle */}
      <ToggleButtonGroup
        value={genderFilter}
        exclusive
        onChange={(e, val) => val && onChangeGender(val)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="all">Alla</ToggleButton>
        <ToggleButton value="male">Män</ToggleButton>
        <ToggleButton value="female">Kvinnor</ToggleButton>
      </ToggleButtonGroup>

      {/* Average / median */}
      <Typography variant="body1" sx={{ mb: 1 }}>
        <strong>Medelålder:</strong> {average} år &nbsp;&nbsp;
        <strong>Medianålder:</strong> {median} år
      </Typography>
    </Box>
  );
}