import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Individual } from "@core";

interface IndividualsState {
  items: Individual[];
  status: "idle" | "loading" | "failed";
}

const initialState: IndividualsState = {
  items: [],
  status: "idle",
};

// Async thunks via preload API
export const fetchIndividuals = createAsyncThunk("individuals/fetchAll", async () => {
  return await (window as any).api.listIndividuals();
});

export const addIndividual = createAsyncThunk(
  "individuals/add",
  async (ind: Omit<Individual, "id"> & { id?: string }) => {
    const finalInd: Individual = { id: ind.id ?? crypto.randomUUID(), ...ind };
    return await (window as any).api.addIndividual(finalInd);
  }
);

export const updateIndividual = createAsyncThunk(
  "individuals/update",
  async ({ id, updates }: { id: string; updates: Partial<Individual> }) => {
    return await (window as any).api.updateIndividual(id, updates);
  }
);

export const deleteIndividual = createAsyncThunk("individuals/delete", async (id: string) => {
  await (window as any).api.deleteIndividual(id);
  return id;
});

const individualsSlice = createSlice({
  name: "individuals",
  initialState,
  reducers: {
    clearIndividuals: (state) => {
      state.items = [];
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIndividuals.fulfilled, (state, action: PayloadAction<Individual[]>) => {
        state.items = action.payload;
        state.status = "idle";
      })
      .addCase(addIndividual.fulfilled, (state, action: PayloadAction<Individual>) => {
        state.items.push(action.payload);
      })
      .addCase(updateIndividual.fulfilled, (state, action: PayloadAction<Individual>) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      })
      .addCase(deleteIndividual.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
      });
  },
});

export default individualsSlice.reducer;
// Export the clear action for UI use (e.g. ResetDatabaseButton)
export const { clearIndividuals } = individualsSlice.actions;