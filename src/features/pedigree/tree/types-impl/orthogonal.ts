import type { TreeType } from "../types";
import { registerTreeType } from "../registry";

// Orthogonal: only two options — generations + mode
const options: NonNullable<TreeType["options"]> = [
  {
    key: "maxGenerations",
    label: "Antal generationer",
    type: "number",
    default: 6,
    min: 1,
    max: 11,
    step: 1,
  },
  {
    key: "mode",
    label: "Visa",
    type: "radio",
    default: "ancestors",
    choices: [
      { value: "descendants", label: "Efterkommande" },
      { value: "ancestors", label: "Förfäder" },
    ],
    group: "layout",
  },
];

const orthogonal: TreeType = {
  id: "orthogonal",
  label: "Orthogonal",
  options,
};

registerTreeType(orthogonal);

export default orthogonal;