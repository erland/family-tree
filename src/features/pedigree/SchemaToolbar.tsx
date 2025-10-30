import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  Switch,
  Slider,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { getTreeType } from "./tree";
import type { OptionDefinition } from "./tree/types";

type Props = {
  treeTypeId: string;
  size?: "small" | "medium";
  onValuesChange?: (values: Record<string, any>) => void;
  initialValues?: Record<string, any>;
};

function buildInitial(defs: OptionDefinition[], initial?: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const d of defs) {
    out[d.key] = initial?.[d.key] ?? d.default;
  }
  return out;
}

export default function SchemaToolbar({
  treeTypeId,
  size = "small",
  onValuesChange,
  initialValues,
}: Props) {
  const defs = useMemo(() => {
    const tt = getTreeType(treeTypeId);
    return (tt?.options ?? []) as OptionDefinition[];
  }, [treeTypeId]);

  const [values, setValues] = useState<Record<string, any>>(
    buildInitial(defs, initialValues)
  );

  // keep local state in sync if defs change (switching tree type)
  React.useEffect(() => {
    setValues(buildInitial(defs, initialValues));
  }, [defs, initialValues]);

  const handleChange = (key: string, value: any) => {
    const next = { ...values, [key]: value };
    setValues(next);
    onValuesChange?.(next);
  };

  if (!defs.length) return null;

  const groups: Array<NonNullable<OptionDefinition["group"]> | "layout"> = [
    "layout",
    "nodes",
    "edges",
    "advanced",
  ];

  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
      {groups.map((group, idx) => {
        const items = defs.filter((d) => (d.group ?? "layout") === group);
        if (!items.length) return null;

        return (
          <Box key={group} sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
            {idx > 0 && <Divider orientation="vertical" flexItem />}
            {items.map((d) => {
              const v = values[d.key];

              if (d.type === "toggle") {
                return (
                  <Box key={d.key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="body2">{d.label}</Typography>
                    <Switch size={size} checked={!!v} onChange={(e) => handleChange(d.key, e.target.checked)} />
                  </Box>
                );
              }

              if (d.type === "number" || d.type === "range") {
                const min = d.min ?? 0;
                const max = d.max ?? 400;
                const step = d.step ?? 1;
                return (
                  <Box key={d.key} sx={{ width: 220 }}>
                    <Typography variant="body2">{d.label}</Typography>
                    <Slider
                      size={size}
                      value={Number(v)}
                      onChange={(_, nv) => handleChange(d.key, nv as number)}
                      min={min}
                      max={max}
                      step={step}
                      marks
                    />
                  </Box>
                );
              }

              if (d.type === "select") {
                return (
                  <Box key={d.key} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Typography variant="body2">{d.label}</Typography>
                    <Select
                      size={size}
                      value={v}
                      onChange={(e) => handleChange(d.key, e.target.value)}
                    >
                      {d.choices?.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                );
              }

              if (d.type === "radio") {
                return (
                  <Box key={d.key} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Typography variant="body2">{d.label}</Typography>
                    <ToggleButtonGroup
                      exclusive
                      size={size}
                      value={v}
                      onChange={(_, nv) => nv && handleChange(d.key, nv)}
                    >
                      {d.choices?.map((c) => (
                        <ToggleButton key={c.value} value={c.value}>
                          {c.label}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                );
              }

              return null;
            })}
          </Box>
        );
      })}
    </Box>
  );
}