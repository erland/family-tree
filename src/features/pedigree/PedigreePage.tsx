import React from "react";
import { Box, Typography } from "@mui/material";
import PedigreeTree from "./PedigreeTree";

export default function PedigreePage() {
  return (
    <Box p={2} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        display="flex"
        gap={2}
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >

      <PedigreeTree />
      </Box>
    </Box>
  );
}