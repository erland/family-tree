// src/components/CircularPedigree.tsx
import React, { useMemo } from "react";
import { useAppSelector } from "../store";
import { buildAncestorMatrix } from "../utils/ancestors";
import { Individual } from "../types/individual";
import { Relationship } from "../types/relationship";

type Props = {
  rootId: string;
  generations: number; // number of outer generations (e.g. 4 -> center + 4 rings)
};

const SIZE = 900;            // viewBox size
const MARGIN = 24;           // outer padding
const CENTER_R = 48;         // proband circle radius
const BASE_RING_GAP = 140;   // base thickness per ring before weighting

// ✅ First N gens (closest to center) are TANGENT; outer gens are RADIAL
const INNER_TANGENT_GENERATIONS = 4;

// ✅ Outermost ring thickness relative to innermost (e.g., 1.5 = 150%)
const OUTER_THICKNESS_FACTOR = 2;

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function annularSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  start: number,
  end: number
) {
  const large = end - start > Math.PI ? 1 : 0;
  const p1 = polar(cx, cy, rInner, start);
  const p2 = polar(cx, cy, rInner, end);
  const p3 = polar(cx, cy, rOuter, end);
  const p4 = polar(cx, cy, rOuter, start);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

function nameParts(p?: Individual | null): { given: string; family: string } {
  if (!p) return { given: "", family: "" };
  return { given: p.givenName ?? "", family: p.familyName ?? "" };
}

function fontSizeForGen(g: number) {
  const fs = 16 - g; // slightly smaller further out
  return Math.max(10, Math.min(14, fs));
}

export default function CircularPedigree({ rootId, generations }: Props) {
  const individuals = useAppSelector((s) => s.individuals.items) as Individual[];
  const relationships = useAppSelector((s) => s.relationships.items) as Relationship[];

  const matrix = useMemo(
    () => buildAncestorMatrix(rootId, individuals, relationships, generations),
    [rootId, individuals, relationships, generations]
  );

  const byId = useMemo(() => new Map(individuals.map((i) => [i.id, i])), [individuals]);

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const maxRadius = Math.min(cx, cy) - MARGIN;

  // ---- Ring radii with weighted thickness (outer rings wider) ----
  // weights grow linearly from 1 (innermost) to OUTER_THICKNESS_FACTOR (outermost)
  const weights: number[] = [0]; // index 0 unused for thickness
  for (let g = 1; g <= generations; g++) {
    const t =
      generations > 1
        ? 1 + (OUTER_THICKNESS_FACTOR - 1) * ((g - 1) / (generations - 1))
        : 1;
    weights[g] = t;
  }
  const sumWeights = weights.slice(1).reduce((a, b) => a + b, 0);
  const desiredTotalThickness = BASE_RING_GAP * sumWeights;

  // scale uniformly if the total would exceed canvas
  const available = Math.max(0, maxRadius - CENTER_R);
  const scale =
    desiredTotalThickness > 0 ? Math.min(1, available / desiredTotalThickness) : 1;

  const thicknesses: number[] = [0];
  for (let g = 1; g <= generations; g++) {
    thicknesses[g] = BASE_RING_GAP * weights[g] * scale;
  }

  const radii: number[] = [CENTER_R];
  for (let g = 1; g <= generations; g++) {
    radii[g] = radii[g - 1] + thicknesses[g];
  }
  // ---------------------------------------------------------------

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      height="100%"
      style={{ display: "block", background: "#fff" }}
      role="img"
      aria-label="Cirkulärt släktträd"
    >
      {/* Grid rings */}
      {Array.from({ length: generations }, (_, g) => g + 1).map((g) => (
        <circle key={`ring-${g}`} cx={cx} cy={cy} r={radii[g]} fill="none" stroke="#e0e0e0" />
      ))}

      {/* Center person */}
      <circle cx={cx} cy={cy} r={radii[0]} fill="#fafafa" stroke="#bdbdbd" />
      {(function () {
        const p = byId.get(rootId);
        const { given, family } = nameParts(p);
        return (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            style={{ pointerEvents: "none" }}
          >
            <tspan x={cx} dy="-0.2em" fontWeight={500}>
              {given}
            </tspan>
            <tspan x={cx} dy="1.1em" fontWeight={700}>
              {family}
            </tspan>
          </text>
        );
      })()}

      {/* Generation rings */}
      {matrix.slice(1).map((row, genIdx) => {
        const g = genIdx + 1; // 1..generations
        const inner = radii[g - 1];
        const outer = radii[g];
        const thickness = outer - inner;
        const slots = row.length;
        const step = (Math.PI * 2) / Math.max(1, slots);
        const startOffset = -Math.PI / 2; // 12 o'clock
        const fs = fontSizeForGen(g);

        return (
          <g key={`gen-${g}`}>
            {row.map((id, i) => {
              const start = startOffset + i * step;
              const end = start + step;
              const mid = start + step / 2;

              // Label anchor point
              const labelR =
                g <= INNER_TANGENT_GENERATIONS
                  ? inner + thickness * 0.56 // tangent: a bit outward
                  : inner + thickness * 0.50; // radial: center of ring
              const { x: lx, y: ly } = polar(cx, cy, labelR, mid);

              const angleDeg = (mid * 180) / Math.PI;

              // ✅ Compute final rotation first, then ensure upright
              let rotate = g <= INNER_TANGENT_GENERATIONS ? angleDeg + 90 : angleDeg;
              const normRot = ((rotate % 360) + 360) % 360;
              if (normRot > 90 && normRot < 270) rotate += 180;

              const person = id ? byId.get(id) : null;
              const { given, family } = nameParts(person);
              const hasLabel = Boolean(given || family);

              // Divider only across this ring (inner -> outer)
              const ix = cx + inner * Math.cos(start);
              const iy = cy + inner * Math.sin(start);
              const ox = cx + outer * Math.cos(start);
              const oy = cy + outer * Math.sin(start);

              return (
                <g key={`slot-${g}-${i}`}>
                  {/* wedge */}
                  <path
                    d={annularSectorPath(cx, cy, inner, outer, start, end)}
                    fill={id ? "#fcfcff" : "#fff"}
                    stroke="#cfd8dc"
                  />
                  {/* radial divider (limited to this generation) */}
                  <line
                    x1={ix}
                    y1={iy}
                    x2={ox}
                    y2={oy}
                    stroke="#eeeeee"
                    style={{ pointerEvents: "none" }}
                  />
                  {/* label */}
                  {hasLabel && (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${rotate}, ${lx}, ${ly})`}
                      fontSize={fs}
                      style={{ pointerEvents: "none" }}
                    >
                      <tspan x={lx} dy="-0.2em" fontWeight={500}>
                        {given}
                      </tspan>
                      <tspan x={lx} dy="1.1em" fontWeight={700}>
                        {family}
                      </tspan>
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}