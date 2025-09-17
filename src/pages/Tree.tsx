import React from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import PedigreeTree from "../components/PedigreeTree";

export default function Tree() {
  const [direction, setDirection] = React.useState<"TB" | "LR">("TB");

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Släktträd</Typography>
        <ToggleButtonGroup
          value={direction}
          exclusive
          onChange={(_e, val) => val && setDirection(val)}
          size="small"
        >
          <ToggleButton value="TB">Vertikal</ToggleButton>
          <ToggleButton value="LR">Horisontell</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <PedigreeTree direction={direction} />
    </Box>
  );
}