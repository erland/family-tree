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
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

import { ReactFlowProvider } from "reactflow";

import SearchBar from "../../components/SearchBar";
import IndividualDetails from "../individuals/IndividualDetails";
import IndividualFormDialog from "../individuals/IndividualFormDialog";
import CircularPedigree from "./CircularPedigree";
import { PedigreeCanvas } from "./PedigreeCanvas";

import { usePedigreeTreeViewModel } from "./usePedigreeTreeViewModel";

export default function PedigreeTree() {
  const vm = usePedigreeTreeViewModel();

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        width: "100%",
        // Desktop: lock to viewport height (minus header)
        // Mobile: allow natural height so nothing gets crushed
        height: {
          xs: "100dvh",                 // mobile-safe viewport height
          md: "calc(100dvh - 120px)",   // keep your desktop offset
        },
        display: "flex",
        flexDirection: {
          xs: "column",
          md: "row",
        },
        position: "relative",
        overflow: "hidden",
        minHeight: 0,                   // allow children to shrink in flex
      }}
    >
      {/* LEFT: toolbar(s) + canvas */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0, // important so flex children can shrink without forcing overflow
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Toolbar row 1 */}
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
            <SearchBar
              clearOnSelect
              onSelect={(id) => {
                vm.handlePickRoot(id);
              }}
            />
          </Box>

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

          {/* Generations selector for circular */}
          {vm.layoutKind === "circular" && vm.root && (
            <Select
              size="small"
              value={vm.maxGenerations}
              onChange={(e) => vm.setMaxGenerations(Number(e.target.value))}
              sx={{
                background: "white",
                ".MuiSelect-select": {
                  py: 0.5,
                  px: 1,
                  fontSize: "0.75rem",
                },
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
              flexWrap: "wrap",
              rowGap: 1,
              columnGap: 1.5,
              alignItems: "center",
              position: "sticky",
              top: 48, // sits right under row 1 on mobile scroll
              zIndex: 4,
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

        {/* Canvas / Tree area */}
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            height: 1,        // 100% of the left column
            overflow: "hidden" // let React Flow handle pan/zoom instead of scroll
          }}
        >
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

      {/* RIGHT SIDE details (desktop / tablet only) */}
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
            sx: {
              bgcolor: "background.default",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >

          <DialogContent
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 2,
            }}
          >
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

      {/* Edit/create person dialog (shared for both desktop & mobile) */}
      <IndividualFormDialog
        open={!!vm.editing}
        individual={vm.editing}
        onClose={() => vm.setEditing(null)}
      />
    </Box>
  );
}