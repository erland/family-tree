// src/features/ages/AgeHistogram.tsx

import React from "react";
import { Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AgeBin } from "./useAgeStats";

export interface AgeHistogramProps {
  ageData: AgeBin[];
  genderFilter: "all" | "male" | "female";
  onSelectRange: (range: [number, number] | "unknown") => void;
}

export function AgeHistogram({
  ageData,
  genderFilter,
  onSelectRange,
}: AgeHistogramProps) {
  return (
    <Box sx={{ height: 300, mb: 2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={ageData}
          onClick={(e: any) => {
            if (!e?.activeLabel) return;
            if (e.activeLabel === "Okänd") {
              onSelectRange("unknown");
            } else {
              const bin = ageData.find((b) => b.range === e.activeLabel);
              if (bin) {
                onSelectRange([bin.min, bin.max]);
              }
            }
          }}
        >
          <XAxis dataKey="range" />
          <YAxis />
          <Tooltip />
          <Legend />

          {genderFilter !== "female" && (
            <Bar dataKey="male" stackId="a" fill="#42a5f5" name="Män" />
          )}
          {genderFilter !== "male" && (
            <Bar
              dataKey="female"
              stackId="a"
              fill="#f48fb1"
              name="Kvinnor"
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}