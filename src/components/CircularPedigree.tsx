// src/components/CircularPedigree.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useAppSelector } from "../store";
import { buildAncestorMatrix } from "@core/domain";
import { Individual } from "@core/domain";
import { Relationship } from "@core/domain";

type Props = {
  rootId: string;
  generations: number;
};

const SIZE = 900;
const MARGIN = 24;
const CENTER_R = 48;
const BASE_RING_GAP = 140;
const INNER_TANGENT_GENERATIONS = 4;
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
  const given = p.givenName ?? "";
  const family = p.birthFamilyName || p.familyName || "";
  return { given, family };
}

function fontSizeForGen(g: number) {
  const fs = 16 - g;
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

  // ───────────────────────────────────────────
  // Detect duplicates (matrix only)
  // ───────────────────────────────────────────
  const duplicateIds = useMemo(() => {
    const allIds: string[] = [];
    for (const row of matrix) for (const id of row) if (id) allIds.push(id);
    const counts = new Map<string, number>();
    for (const id of allIds) counts.set(id, (counts.get(id) || 0) + 1);
    const dups = new Set<string>();
    counts.forEach((cnt, id) => cnt > 1 && dups.add(id));
    return dups;
  }, [matrix]);

  // ───────────────────────────────────────────
  // Highlight state for click-link behaviour
  // ───────────────────────────────────────────
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightedId) return;
    const t = setTimeout(() => setHighlightedId(null), 1500);
    return () => clearTimeout(t);
  }, [highlightedId]);

  const handleClickDuplicate = (id: string) => {
    setHighlightedId(id);
  };

  // ───────────────────────────────────────────
  // Geometry setup
  // ───────────────────────────────────────────
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const maxRadius = Math.min(cx, cy) - MARGIN;

  const weights: number[] = [0];
  for (let g = 1; g <= generations; g++) {
    const t =
      generations > 1
        ? 1 + (OUTER_THICKNESS_FACTOR - 1) * ((g - 1) / (generations - 1))
        : 1;
    weights[g] = t;
  }
  const sumWeights = weights.slice(1).reduce((a, b) => a + b, 0);
  const desiredTotalThickness = BASE_RING_GAP * sumWeights;
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

  const isCenterDup = duplicateIds.has(rootId);
  const centerHighlighted = highlightedId === rootId;

  // ───────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────
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
      <circle
        cx={cx}
        cy={cy}
        r={radii[0]}
        fill="#fafafa"
        stroke={centerHighlighted ? "red" : "#bdbdbd"}
        strokeWidth={centerHighlighted ? 3 : 1}
        onClick={isCenterDup ? () => handleClickDuplicate(rootId) : undefined}
        style={{ cursor: isCenterDup ? "pointer" : "default" }}
      />
      {(function () {
        const p = byId.get(rootId);
        const { given, family } = nameParts(p);
        const isHighlighted = centerHighlighted;
        return (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            style={{ pointerEvents: "none" }}
            fill={isHighlighted ? "red" : undefined}
          >
            <tspan x={cx} dy="-0.2em" fontWeight={500}>
              {given}
              {isCenterDup && " 🔁"}
            </tspan>
            <tspan x={cx} dy="1.1em" fontWeight={700}>
              {family}
            </tspan>
          </text>
        );
      })()}

      {/* Generation rings */}
      {matrix.slice(1).map((row, genIdx) => {
        const g = genIdx + 1;
        const inner = radii[g - 1];
        const outer = radii[g];
        const thickness = outer - inner;
        const slots = row.length;
        const step = (Math.PI * 2) / Math.max(1, slots);
        const startOffset = -Math.PI / 2;
        const fs = fontSizeForGen(g);

        return (
          <g key={`gen-${g}`}>
            {row.map((id, i) => {
              const start = startOffset + i * step;
              const end = start + step;
              const mid = start + step / 2;

              const labelR =
                g <= INNER_TANGENT_GENERATIONS
                  ? inner + thickness * 0.56
                  : inner + thickness * 0.5;
              const { x: lx, y: ly } = polar(cx, cy, labelR, mid);

              const angleDeg = (mid * 180) / Math.PI;
              let rotate = g <= INNER_TANGENT_GENERATIONS ? angleDeg + 90 : angleDeg;
              const normRot = ((rotate % 360) + 360) % 360;
              if (normRot > 90 && normRot < 270) rotate += 180;

              const person = id ? byId.get(id) : null;
              const { given, family } = nameParts(person);
              const hasLabel = Boolean(given || family);

              const ix = cx + inner * Math.cos(start);
              const iy = cy + inner * Math.sin(start);
              const ox = cx + outer * Math.cos(start);
              const oy = cy + outer * Math.sin(start);

              const isDup = Boolean(id && duplicateIds.has(id));
              const isHighlighted = id && highlightedId === id;

              return (
                <g
                  key={`slot-${g}-${i}`}
                  onClick={isDup && id ? () => handleClickDuplicate(id) : undefined}
                  style={{ cursor: isDup ? "pointer" : "default" }}
                >
                  <path
                    d={annularSectorPath(cx, cy, inner, outer, start, end)}
                    fill={id ? "#fcfcff" : "#fff"}
                    stroke={isHighlighted ? "red" : "#cfd8dc"}
                    strokeWidth={isHighlighted ? 3 : 1}
                  />
                  <line
                    x1={ix}
                    y1={iy}
                    x2={ox}
                    y2={oy}
                    stroke="#eeeeee"
                    style={{ pointerEvents: "none" }}
                  />
                  {hasLabel && (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${rotate}, ${lx}, ${ly})`}
                      fontSize={fs}
                      style={{ pointerEvents: "none" }}
                      fill={isHighlighted ? "red" : undefined}
                    >
                      <tspan x={lx} dy="-0.2em" fontWeight={500}>
                        {given}
                        {isDup && " 🔁"}
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