// src/components/PedigreeTree.tsx
import React from "react";
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import { ReactFlowProvider } from "reactflow";

import SearchBar from "../../components/SearchBar";
import IndividualDetails from "../individuals/IndividualDetails";
import IndividualFormDialog from "../individuals/IndividualFormDialog";
import CircularPedigree from "./CircularPedigree";
import { PedigreeCanvas } from "./PedigreeCanvas";

import { usePedigreeTreeViewModel } from "./usePedigreeTreeViewModel";

// registry-backed type toggle
import TreeTypeToggleFromRegistry from "./TreeTypeToggleFromRegistry";
// schema-driven toolbar (now primary)
import SchemaToolbar from "./SchemaToolbar";
import { LayoutOptionsProvider } from "./LayoutOptionsContext";

// helper to clamp a number between min/max
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function PedigreeTree() {
  const vm = usePedigreeTreeViewModel();

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  // schema option values per tree type (local)
  const [schemaValuesByType, setSchemaValuesByType] = React.useState<
    Record<string, Record<string, any>>
  >({});

  const currentSchemaValues = schemaValuesByType[vm.layoutKind] ?? {};

  const handleSchemaValuesChange = React.useCallback(
    (vals: Record<string, any>) => {
      setSchemaValuesByType((prev) => ({
        ...prev,
        [vm.layoutKind]: vals,
      }));
      // eslint-disable-next-line no-console
      console.debug("[schema]", vm.layoutKind, vals);
    },
    [vm.layoutKind]
  );

  // Circular: schema override for generations; clamp to 1..11
  const rawCircularGenerations =
    vm.layoutKind === "circular" && typeof currentSchemaValues.maxGenerations === "number"
      ? currentSchemaValues.maxGenerations
      : vm.maxGenerations;
  const effectiveCircularGenerations = clamp(rawCircularGenerations, 1, 11);

  // Orthogonal: schema override for mode + generations
  const effectiveOrthMode =
    vm.layoutKind === "orthogonal" && typeof currentSchemaValues.mode === "string"
      ? (currentSchemaValues.mode as "descendants" | "ancestors")
      : vm.mode;

  const rawOrthGenerations =
    vm.layoutKind === "orthogonal" && typeof currentSchemaValues.maxGenerations === "number"
      ? currentSchemaValues.maxGenerations
      : vm.maxGenerations;
  const effectiveOrthGenerations = clamp(rawOrthGenerations, 1, 11);

  return (
    <Box
      sx={{
        width: "100%",
        height: { xs: "100dvh", md: "calc(100dvh - 120px)" },
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        position: "relative",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* LEFT: toolbars + canvas */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Toolbar row 1: search + type toggle */}
        <Box
          sx={{
            p: 1,
            background: "#f5f5f5",
            display: "flex",
            flexWrap: "wrap",
            rowGap: 1,
            columnGap: 1.5,
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {/* Search selects root individual */}
          <Box sx={{ flexGrow: 1, minWidth: 200 }}>
            <SearchBar clearOnSelect onSelect={(id) => vm.handlePickRoot(id)} />
          </Box>

          {/* Tree type toggle (registry) */}
          <TreeTypeToggleFromRegistry
            value={vm.layoutKind}
            onChange={(id) => {
              if (id === "circular" && !vm.root) return; // keep your rule
              vm.setLayoutKind(id);
            }}
            size="small"
          />
        </Box>

        {/* Toolbar row 2: per-tree options (schema-driven) */}
        <Box
          sx={{
            p: 1,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderBottom: "1px dashed",
            borderColor: "divider",
            position: "sticky",
            top: 48,
            zIndex: 4,
          }}
        >
          <SchemaToolbar
            treeTypeId={vm.layoutKind}
            size="small"
            onValuesChange={handleSchemaValuesChange}
            initialValues={currentSchemaValues}
          />
        </Box>

        {/* Toolbar row 3: root info + export buttons (only if we have a root) */}
        {vm.root && (
          <Box
            sx={{
              p: 1,
              background: "#f5f5f5",
              display: "flex",
              flexWrap: "wrap",
              rowGap: 1,
              columnGap: 1.5,
              alignItems: "center",
              position: "sticky",
              top: 96,
              zIndex: 3,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                maxWidth: "100%",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              Rot: {vm.root.firstName} {vm.root.lastName}
            </Typography>

            <Button variant="outlined" size="small" onClick={() => vm.setRoot(null)}>
              Rensa
            </Button>

            <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
              <Button variant="outlined" size="small" onClick={vm.handleExportSvg}>
                SVG
              </Button>
              <Button variant="outlined" size="small" onClick={vm.handleExportPdf}>
                PDF
              </Button>
            </Box>
          </Box>
        )}

        {/* Canvas / Tree area */}
        <LayoutOptionsProvider treeTypeId={vm.layoutKind} values={currentSchemaValues}>
          <Box sx={{ flexGrow: 1, minHeight: 0, height: 1, overflow: "hidden" }}>
            {vm.layoutKind === "circular" && vm.root ? (
              <CircularPedigree
                rootId={vm.root.id}
                generations={effectiveCircularGenerations}
              />
            ) : (
              <ReactFlowProvider>
                <PedigreeCanvas
                  rootId={vm.rootId}
                  mode={effectiveOrthMode}
                  maxGenerations={effectiveOrthGenerations}
                  setMaxGenerations={vm.setMaxGenerations}
                  onSelectIndividual={vm.setSelected}
                />
              </ReactFlowProvider>
            )}
          </Box>
        </LayoutOptionsProvider>
      </Box>

      {/* RIGHT: details (desktop / tablet only) */}
      {!isSmall && vm.selected && (
        <Box
          sx={{
            width: 320,
            borderLeft: "1px solid #ddd",
            p: 2,
            bgcolor: "#fafafa",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <IndividualDetails
            individualId={vm.selected.id}
            onClose={() => vm.setSelected(null)}
            onEdit={(ind) => vm.setEditing(ind)}
          />
        </Box>
      )}

      {/* Mobile full-screen details dialog */}
      {isSmall && (
        <Dialog
          fullScreen
          open={!!vm.selected}
          onClose={() => vm.setSelected(null)}
          PaperProps={{
            sx: { bgcolor: "background.default", display: "flex", flexDirection: "column" },
          }}
        >
          <DialogContent sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {vm.selected && (
              <IndividualDetails
                individualId={vm.selected.id}
                onClose={() => vm.setSelected(null)}
                onEdit={(ind) => vm.setEditing(ind)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Edit/create person dialog */}
      <IndividualFormDialog open={!!vm.editing} individual={vm.editing} onClose={() => vm.setEditing(null)} />
    </Box>
  );
}