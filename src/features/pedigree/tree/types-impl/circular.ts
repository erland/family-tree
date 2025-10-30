import type { TreeType } from "../types";
import { registerTreeType } from "../registry";

// Option schema for Circular.
// Now constrains Generations to 1–11 (step 1).
const options: NonNullable<TreeType["options"]> = [
  {
    key: "maxGenerations",
    label: "Generations",
    type: "number",
    default: 6,
    group: "layout",
    min: 1,
    max: 11,
    step: 1,
  },
];

const circular: TreeType = {
  id: "circular",
  label: "Circular",
  options,
};

registerTreeType(circular);

export default circular;