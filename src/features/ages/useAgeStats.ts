// src/features/ages/useAgeStats.ts

import { useMemo } from "react";
import { Individual } from "@core/domain";
import { calculateAgeAtEvent } from "@core/domain";
import { isMale, isFemale } from "./genderUtils";

export type AgeBin = {
  range: string;   // "0-9", "10-19", ..., "Okänd"
  min: number;     // lower bound inclusive, or -1 for "Okänd"
  max: number;     // upper bound inclusive, or -1 for "Okänd"
  male: number;    // count of males in this bin
  female: number;  // count of females in this bin
};

export interface AgeStatsResult {
  ageData: AgeBin[];
  average: number | string; // you currently return number or "–"
  median: number | string;
}

/**
 * useAgeStats mirrors the logic you had in AgesPage:
 * - Walk all individuals
 * - Collect numeric ages-at-death for males / females
 * - Compute per-decade bins + "Okänd"
 * - Compute average and median, *respecting current genderFilter*
 */
export function useAgeStats(
  individuals: Individual[],
  genderFilter: "all" | "male" | "female"
): AgeStatsResult {
  return useMemo(() => {
    const males: number[] = [];
    const females: number[] = [];

    for (const ind of individuals) {
      const gender = (ind.gender || "").toLowerCase();

      // We only include in age arrays if they have both birth+death dates
      if (ind.dateOfBirth && ind.dateOfDeath) {
        const ageStr = calculateAgeAtEvent(ind.dateOfBirth, ind.dateOfDeath);
        const num = Number(ageStr?.replace(/[^\d]/g, ""));
        if (isNaN(num)) continue;

        if (isMale(gender)) {
          males.push(num);
        } else if (isFemale(gender)) {
          females.push(num);
        }
      }
    }

    // "selectedAges" drives average/median display
    const selectedAges =
      genderFilter === "male"
        ? males
        : genderFilter === "female"
        ? females
        : [...males, ...females];

    // Sort for median
    const sorted = [...selectedAges].sort((a, b) => a - b);

    const average =
      sorted.length > 0
        ? Math.round(
            sorted.reduce((a, b) => a + b, 0) / sorted.length
          )
        : "–";

    const median =
      sorted.length > 0
        ? sorted.length % 2 === 0
          ? Math.round(
              (sorted[sorted.length / 2 - 1] +
                sorted[sorted.length / 2]) / 2
            )
          : sorted[Math.floor(sorted.length / 2)]
        : "–";

    // Build decade bins [0-9], [10-19], ..., [100-109]
    const bins: AgeBin[] = [];
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

    // Count "unknown" per gender
    const unknownMales = individuals.filter(
      (ind) =>
        (!ind.dateOfBirth || !ind.dateOfDeath) && isMale(ind.gender || "")
    ).length;

    const unknownFemales = individuals.filter(
      (ind) =>
        (!ind.dateOfBirth || !ind.dateOfDeath) && isFemale(ind.gender || "")
    ).length;

    bins.push({
      range: "Okänd",
      min: -1,
      max: -1,
      male: unknownMales,
      female: unknownFemales,
    });

    return { ageData: bins, average, median };
  }, [individuals, genderFilter]);
}