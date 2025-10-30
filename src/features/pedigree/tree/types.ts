// Minimal tree-type contract + option schema

export type TreeKind = "circular" | "orthogonal" | (string & {});

export type OptionType = "toggle" | "select" | "number" | "range" | "radio";

export interface OptionDefinition<T = any> {
  key: string;
  label: string;
  type: OptionType;
  default: T;
  choices?: Array<{ value: any; label: string }>;
  // Optional grouping for when we render a schema-driven toolbar later
  group?: "layout" | "nodes" | "edges" | "advanced";
  // Optional numeric bounds for number/range controls
  min?: number;
  max?: number;
  step?: number;
}

export interface TreeType {
  id: TreeKind;
  label: string;
  // Schema listing the options relevant for this tree type
  options?: OptionDefinition[];
}