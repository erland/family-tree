// src/features/individuals/index.ts

// Page
export { default as IndividualsPage } from "./IndividualsPage";
export { default } from "./IndividualsPage";

// Person UI / dialogs
export { default as IndividualDetails } from "./IndividualDetails";
export { default as IndividualFormDialog } from "./IndividualFormDialog";
export { default as IndividualPicker } from "./IndividualPicker";

// Parent/child link dialogs
export { default as AddChildDialog } from "./AddChildDialog";
export { default as AddParentDialog } from "./AddParentDialog";

// Flows/Hooks (if other features ever need them)
export { useAddChild } from "./useAddChild";
export { useAddChildFlow } from "./useAddChildFlow";
export { useAddParent } from "./useAddParent";
export { useAddParentFlow } from "./useAddParentFlow";