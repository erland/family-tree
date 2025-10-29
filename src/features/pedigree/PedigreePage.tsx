import React from "react";
import { Box, Typography } from "@mui/material";
import PedigreeTree from "./PedigreeTree";

export default function PedigreePage() {
  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5">Släktträd</Typography>
      </Box>

      <PedigreeTree />
    </Box>
  );
}