import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Options = Record<string, any>;

interface State {
  // One bag of option values per tree type id (e.g., "circular", "orthogonal")
  optionsByType: Record<string, Options>;
}

const initialState: State = {
  optionsByType: {},
};

const slice = createSlice({
  name: "pedigreeOptions",
  initialState,
  reducers: {
    // Replace/merge the whole options bag for a tree type
    setOptionsForType(
      state,
      action: PayloadAction<{ treeTypeId: string; values: Options }>
    ) {
      const { treeTypeId, values } = action.payload;
      const prev = state.optionsByType[treeTypeId] ?? {};
      state.optionsByType[treeTypeId] = { ...prev, ...values };
    },

    // Update a single option key
    setOption(
      state,
      action: PayloadAction<{ treeTypeId: string; key: string; value: any }>
    ) {
      const { treeTypeId, key, value } = action.payload;
      const prev = state.optionsByType[treeTypeId] ?? {};
      state.optionsByType[treeTypeId] = { ...prev, [key]: value };
    },

    // Clear all options for a given tree type
    resetOptionsForType(state, action: PayloadAction<{ treeTypeId: string }>) {
      const { treeTypeId } = action.payload;
      delete state.optionsByType[treeTypeId];
    },
  },
});

export const { setOptionsForType, setOption, resetOptionsForType } = slice.actions;
export default slice.reducer;

// Helper selector (keeps typing optional)
export const selectOptionsForType = (state: any, treeTypeId: string) =>
  state?.pedigreeOptions?.optionsByType?.[treeTypeId] ?? {};