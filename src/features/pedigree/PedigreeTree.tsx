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

import TreeTypeToggleFromRegistry from "./TreeTypeToggleFromRegistry";
import SchemaToolbar from "./SchemaToolbar";
import { LayoutOptionsProvider } from "./LayoutOptionsContext";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function PedigreeTree() {
  const vm = usePedigreeTreeViewModel();

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const [schemaValuesByType, setSchemaValuesByType] = React.useState<
    Record<string, Record<string, any>>
  >({});

  const currentTypeValues = schemaValuesByType[vm.layoutKind] ?? {};

  // Build initial values for SchemaToolbar so it shows the VM-shared values after a type switch.
  const initialValuesForToolbar = React.useMemo(() => {
    const merged: Record<string, any> = { ...currentTypeValues };
    merged.maxGenerations = clamp(vm.maxGenerations, 1, 11);
    // CHANGED: do NOT force merged.mode from vm.mode here.
    // If undefined, SchemaToolbar will use the schema default (ancestors) for orthogonal.
    return merged;
  }, [currentTypeValues, vm.maxGenerations /* , vm.mode removed */ , vm.layoutKind]);

  // NEW: On first switch to Orthogonal, if no mode stored yet, use schema default "ancestors"
  React.useEffect(() => {
    if (vm.layoutKind !== "orthogonal") return;
    const hasMode = currentTypeValues && typeof currentTypeValues.mode === "string";
    if (!hasMode) {
      // Prime VM so the actual tree renders as "Förfäder"
      if (vm.mode !== "ancestors") vm.setMode("ancestors");
      // Prime per-type values so the toolbar shows the same
      setSchemaValuesByType((prev) => ({
        ...prev,
        orthogonal: { ...(prev.orthogonal ?? {}), mode: "ancestors" },
      }));
    }
  }, [vm.layoutKind, currentTypeValues?.mode, vm.mode, vm.setMode]);

  const handleSchemaValuesChange = React.useCallback(
    (vals: Record<string, any>) => {
      setSchemaValuesByType((prev) => ({
        ...prev,
        [vm.layoutKind]: vals,
      }));

      if (typeof vals.maxGenerations === "number") {
        const g = clamp(vals.maxGenerations, 1, 11);
        if (g !== vm.maxGenerations) vm.setMaxGenerations(g);
      }

      if (
        vm.layoutKind === "orthogonal" &&
        (vals.mode === "descendants" || vals.mode === "ancestors") &&
        vals.mode !== vm.mode
      ) {
        vm.setMode(vals.mode as "descendants" | "ancestors");
      }
    },
    [vm.layoutKind, vm.maxGenerations, vm.mode, vm.setMaxGenerations, vm.setMode]
  );

  const effectiveCircularGenerations = clamp(vm.maxGenerations, 1, 11);
  const effectiveOrthMode = vm.mode;
  const effectiveOrthGenerations = clamp(vm.maxGenerations, 1, 11);

  const hasRoot = Boolean(vm.root?.id);

  const circularKey = `c-${vm.root?.id ?? "none"}-${effectiveCircularGenerations}`;
  const orthoKey = `o-${vm.rootId ?? "none"}-${effectiveOrthMode}-${effectiveOrthGenerations}`;

  const resolvedOptionsForContext = React.useMemo(() => {
    const o = { ...currentTypeValues, maxGenerations: effectiveCircularGenerations };
    if (vm.layoutKind === "orthogonal") o.mode = effectiveOrthMode;
    return o;
  }, [currentTypeValues, effectiveCircularGenerations, effectiveOrthMode, vm.layoutKind]);

  return (
    <Box sx={{ width: "100%", height: { xs: "100dvh", md: "calc(100dvh - 120px)" }, display: "flex", flexDirection: { xs: "column", md: "row" }, position: "relative", overflow: "hidden", minHeight: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Box sx={{ p: 1, background: "#f5f5f5", display: "flex", flexWrap: "wrap", rowGap: 1, columnGap: 1.5, alignItems: "center", position: "sticky", top: 0, zIndex: 5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ flexGrow: 1, minWidth: 200 }}>
            <SearchBar
              clearOnSelect
              onSelect={(id) => {
                vm.handlePickRoot(id);
                if (isSmall) vm.setSelected(null);
              }}
            />
          </Box>
          <TreeTypeToggleFromRegistry
            value={vm.layoutKind}
            onChange={(id) => {
              if (id === "circular" && !vm.root) return;
              vm.setLayoutKind(id);
            }}
            size="small"
          />
        </Box>

        <Box sx={{ p: 1, background: "#fff", display: "flex", alignItems: "center", gap: 1.5, borderBottom: "1px dashed", borderColor: "divider", position: "sticky", top: 48, zIndex: 4 }}>
          <SchemaToolbar
            treeTypeId={vm.layoutKind}
            size="small"
            onValuesChange={handleSchemaValuesChange}
            initialValues={initialValuesForToolbar}
          />
        </Box>

        {hasRoot && vm.root && (
          <Box sx={{ p: 1, background: "#f5f5f5", display: "flex", flexWrap: "wrap", rowGap: 1, columnGap: 1.5, alignItems: "center", position: "sticky", top: 96, zIndex: 3, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" sx={{ maxWidth: "100%", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              Rot: {vm.root.firstName} {vm.root.lastName}
            </Typography>
            <Button variant="outlined" size="small" onClick={() => vm.setRoot(null)}>Rensa</Button>
            <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
              <Button variant="outlined" size="small" onClick={vm.handleExportSvg}>SVG</Button>
              <Button variant="outlined" size="small" onClick={vm.handleExportPdf}>PDF</Button>
            </Box>
          </Box>
        )}

        <LayoutOptionsProvider treeTypeId={vm.layoutKind} values={resolvedOptionsForContext}>
          <Box sx={{ flexGrow: 1, minHeight: 0, height: 1, overflow: "hidden" }}>
            {!hasRoot ? (
              <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", px: 2, textAlign: "center", color: "text.secondary" }}>
                <Typography variant="body1">Sök och välj en person för att visa trädet.</Typography>
              </Box>
            ) : vm.layoutKind === "circular" ? (
              <CircularPedigree key={circularKey} rootId={vm.root!.id} generations={effectiveCircularGenerations} />
            ) : (
              <ReactFlowProvider>
                <PedigreeCanvas
                  key={orthoKey}
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

      {!isSmall && vm.selected && (
        <Box sx={{ width: 320, borderLeft: "1px solid #ddd", p: 2, bgcolor: "#fafafa", overflowY: "auto", flexShrink: 0 }}>
          <IndividualDetails individualId={vm.selected.id} onClose={() => vm.setSelected(null)} onEdit={(ind) => vm.setEditing(ind)} />
        </Box>
      )}

      {isSmall && (
        <Dialog fullScreen open={!!vm.selected} onClose={() => vm.setSelected(null)} PaperProps={{ sx: { bgcolor: "background.default", display: "flex", flexDirection: "column" } }}>
          <DialogContent sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {vm.selected && <IndividualDetails individualId={vm.selected.id} onClose={() => vm.setSelected(null)} onEdit={(ind) => vm.setEditing(ind)} />}
          </DialogContent>
        </Dialog>
      )}

      <IndividualFormDialog open={!!vm.editing} individual={vm.editing} onClose={() => vm.setEditing(null)} />
    </Box>
  );
}