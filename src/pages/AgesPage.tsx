import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { useAppSelector } from "../store";
import { Individual } from "../types/individual";
import { fullName } from "../utils/nameUtils";
import { calculateAgeAtEvent } from "../utils/dateUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import IndividualDetails from "../components/IndividualDetails";
import IndividualFormDialog from "../components/IndividualFormDialog";

export default function AgesPage() {
  const individuals = useAppSelector((s) => s.individuals.items) as Individual[];
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null);
  const [showUnknown, setShowUnknown] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Individual | null>(null);

  // 🧩 Form dialog state (for editing)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Individual | null>(null);

  const handleOpen = (ind?: Individual) => {
    setEditing(ind || null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditing(null);
  };

  // 🧮 Calculate age and gender distribution
  const { ageData, average, median } = useMemo(() => {
    const males: number[] = [];
    const females: number[] = [];
    let unknownCount = 0;

    for (const ind of individuals) {
      const gender = (ind.gender || "").toLowerCase();
      if (ind.dateOfBirth && ind.dateOfDeath) {
        const ageStr = calculateAgeAtEvent(ind.dateOfBirth, ind.dateOfDeath);
        const num = Number(ageStr?.replace(/[^\d]/g, ""));
        if (isNaN(num)) continue;
        if (gender === "m" || gender === "male" || gender === "man") males.push(num);
        else if (gender === "f" || gender === "female" || gender === "kvinna") females.push(num);
      } else {
        unknownCount++;
      }
    }

    const allAges = [...males, ...females].sort((a, b) => a - b);
    const avg =
    allAges.length > 0
      ? Math.round(allAges.reduce((a, b) => a + b, 0) / allAges.length)
      : "-";
  
  const med =
    allAges.length > 0
      ? Math.round(
          (allAges[Math.floor(allAges.length / 2)] +
            allAges[Math.ceil(allAges.length / 2) - 1]) / 2
        )
      : "-";

    const bins: {
      range: string;
      min: number;
      max: number;
      male: number;
      female: number;
    }[] = [];

    for (let i = 0; i < 110; i += 10) {
      const min = i;
      const max = i + 9;
      bins.push({
        range: `${min}-${max}`,
        min,
        max,
        male: males.filter((a) => a >= min && a <= max).length,
        female: females.filter((a) => a >= min && a <= max).length,
      });
    }

    // Add unknown group
    bins.push({
      range: "Okänd",
      min: -1,
      max: -1,
      male: 0,
      female: unknownCount,
    });

    return { ageData: bins, average: avg, median: med };
  }, [individuals]);

  // 🧮 People in selected range
  const peopleInRange = useMemo(() => {
    if (showUnknown) {
      return individuals.filter(
        (ind) => !ind.dateOfBirth || !ind.dateOfDeath
      );
    }
    if (!selectedRange) return [];
    const [min, max] = selectedRange;
    return individuals.filter((ind) => {
      if (!ind.dateOfBirth || !ind.dateOfDeath) return false;
      const age = calculateAgeAtEvent(ind.dateOfBirth, ind.dateOfDeath);
      const num = Number(age?.replace(/[^\d]/g, ""));
      return num >= min && num <= max;
    });
  }, [selectedRange, showUnknown, individuals]);

  return (
    <Box sx={{ display: "flex", height: "100%", p: 2, position: "relative" }}>
      {/* Left side: chart + list */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "margin-right 0.3s ease, width 0.3s ease",
          mr: selectedPerson ? "300px" : 0, // Shrink chart when details pane open
        }}
      >
        <Typography variant="h6" gutterBottom>
          Åldersfördelning
        </Typography>

        {/* Average / median stats */}
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>Medelålder:</strong> {average} år &nbsp;&nbsp;
          <strong>Medianålder:</strong> {median} år
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Chart */}
        <Box sx={{ height: 300, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ageData}
              onClick={(e: any) => {
                if (!e?.activeLabel) return;
                if (e.activeLabel === "Okänd") {
                  setShowUnknown(true);
                  setSelectedRange(null);
                } else {
                  const bin = ageData.find((b) => b.range === e.activeLabel);
                  if (bin) {
                    setSelectedRange([bin.min, bin.max]);
                    setShowUnknown(false);
                  }
                }
                setSelectedPerson(null);
              }}
            >
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              {/* 🧩 Gender-based stacked bars */}
              <Bar dataKey="male" stackId="a" fill="#42a5f5" name="Män" />
              <Bar dataKey="female" stackId="a" fill="#f48fb1" name="Kvinnor" />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Selected info */}
        <Box sx={{ mb: 1 }}>
          {showUnknown ? (
            <Typography variant="subtitle1" gutterBottom>
              Personer med okänd ålder ({peopleInRange.length})
            </Typography>
          ) : selectedRange ? (
            <Typography variant="subtitle1" gutterBottom>
              Personer mellan {selectedRange[0]}–{selectedRange[1]} år ({peopleInRange.length})
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Klicka på en stapel för att visa personer i det åldersintervallet.
            </Typography>
          )}
        </Box>

        {/* People list */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <List dense>
            {peopleInRange.map((ind) => (
              <ListItemButton
                key={ind.id}
                onClick={() => setSelectedPerson(ind)}
                selected={selectedPerson?.id === ind.id}
              >
                <ListItemText
                  primary={fullName(ind)}
                  secondary={
                    ind.dateOfBirth && ind.dateOfDeath
                      ? `${ind.dateOfBirth} – ${ind.dateOfDeath}`
                      : "Okända datum"
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>

      {/* Right-side details panel */}
      {selectedPerson && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 300,
            borderLeft: "1px solid #ddd",
            p: 2,
            bgcolor: "#fafafa",
            overflowY: "auto",
            zIndex: 2,
          }}
        >
          <IndividualDetails
            individualId={selectedPerson.id}
            onClose={() => setSelectedPerson(null)}
            onEdit={(ind) => handleOpen(ind)}
          />
        </Box>
      )}

      {/* Edit dialog */}
      <IndividualFormDialog
        open={formOpen}
        onClose={handleClose}
        individual={editing}
      />
    </Box>
  );
}