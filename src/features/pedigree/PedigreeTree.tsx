// src/components/PedigreeTree.tsx
import React from "react";
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { ReactFlowProvider } from "reactflow";

import SearchBar from "../../components/SearchBar";
import IndividualDetails from "../../components/IndividualDetails";
import IndividualFormDialog from "../../components/IndividualFormDialog";
import CircularPedigree from "./CircularPedigree";
import { PedigreeCanvas } from "./PedigreeCanvas";

import { usePedigreeTreeViewModel } from "./usePedigreeTreeViewModel";

export default function PedigreeTree() {
  const vm = usePedigreeTreeViewModel();

  return (
    <Box sx={{ width: "100%", height: "calc(100vh - 120px)", display: "flex" }}>
      {/* LEFT: toolbars + tree */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Toolbar row 1 */}
        <Box
          sx={{
            p: 1,
            background: "#f5f5f5",
            display: "flex",
            gap: 2,
            alignItems: "center",
          }}
        >
          {/* Search selects root individual */}
          <SearchBar
            onSelect={(id) => {
              vm.handlePickRoot(id);
            }}
          />

          {/* descendants / ancestors toggle */}
          <ToggleButtonGroup
            value={vm.mode}
            exclusive
            onChange={(_e, val) => val && vm.setMode(val)}
            size="small"
          >
            <ToggleButton value="descendants">Efterkommande</ToggleButton>
            <ToggleButton value="ancestors">Förfäder</ToggleButton>
          </ToggleButtonGroup>

          {/* layout toggle */}
          <ToggleButtonGroup
            value={vm.layoutKind}
            exclusive
            onChange={(_e, val) => val && vm.setLayoutKind(val)}
            size="small"
          >
            <ToggleButton value="orthogonal">Ortogonal</ToggleButton>
            <ToggleButton value="circular" disabled={!vm.root}>
              Cirkulär
            </ToggleButton>
          </ToggleButtonGroup>

          {/* If circular layout is active, expose generations here
             (the PedigreeCanvas has its own dropdown in Controls for orthogonal) */}
          {vm.layoutKind === "circular" && (
            <Select
              size="small"
              value={vm.maxGenerations}
              onChange={(e) => vm.setMaxGenerations(Number(e.target.value))}
              sx={{
                ml: 1,
                background: "white",
                ".MuiSelect-select": { py: 0.5, px: 1, fontSize: "0.75rem" },
              }}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                <MenuItem key={g} value={g}>
                  {g}
                </MenuItem>
              ))}
            </Select>
          )}
        </Box>

        {/* Toolbar row 2: root info + export buttons (only if we have a root) */}
        {vm.root && (
          <Box
            sx={{
              p: 1,
              background: "#f5f5f5",
              display: "flex",
              gap: 2,
              alignItems: "center",
            }}
          >
            <Typography variant="body2">
              Rot: {vm.root.firstName} {vm.root.lastName}
            </Typography>

            <Button
              variant="outlined"
              size="small"
              onClick={() => vm.setRoot(null)}
            >
              Rensa
            </Button>

            <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={vm.handleExportSvg}
              >
                SVG
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={vm.handleExportPdf}
              >
                PDF
              </Button>
            </Box>
          </Box>
        )}

        {/* Tree area */}
        <Box sx={{ flexGrow: 1 }}>
          {vm.layoutKind === "circular" && vm.root ? (
            <CircularPedigree
              rootId={vm.root.id}
              generations={vm.maxGenerations}
            />
          ) : (
            <ReactFlowProvider>
              <PedigreeCanvas
                rootId={vm.rootId}
                mode={vm.mode}
                maxGenerations={vm.maxGenerations}
                setMaxGenerations={vm.setMaxGenerations}
                onSelectIndividual={vm.setSelected}
              />
            </ReactFlowProvider>
          )}
        </Box>
      </Box>

      {/* RIGHT SIDE: details / editing */}
      {vm.selected && (
        <Box
          sx={{
            width: 300,
            borderLeft: "1px solid #ddd",
            p: 2,
            bgcolor: "#fafafa",
            overflowY: "auto",
          }}
        >
          <IndividualDetails
            individualId={vm.selected.id}
            onClose={() => vm.setSelected(null)}
            onEdit={(ind) => vm.setEditing(ind)}
          />
        </Box>
      )}

      <IndividualFormDialog
        open={!!vm.editing}
        individual={vm.editing}
        onClose={() => vm.setEditing(null)}
      />
    </Box>
  );
}