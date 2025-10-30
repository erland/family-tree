// src/features/pedigree/TreeTypeToggleFromRegistry.tsx
import React from "react";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import { listTreeTypes } from "./tree";

type Props = {
  value: string;                         // your current selected tree type id
  onChange: (newId: string) => void;     // call your existing setter/dispatch
  size?: "small" | "medium" | "large";
};

export default function TreeTypeToggleFromRegistry({
  value,
  onChange,
  size = "small",
}: Props) {
  const types = listTreeTypes();         // ← comes from the registry

  return (
    <ToggleButtonGroup
      size={size}
      exclusive
      value={value}
      onChange={(_, v) => v && onChange(v)}
    >
      {types.map((tt) => (
        <ToggleButton key={tt.id} value={tt.id}>
          {tt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}