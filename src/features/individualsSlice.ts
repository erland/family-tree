import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Individual } from "../types/genealogy";

export interface IndividualsState {
  list: Individual[];
  status: "idle" | "loading" | "failed";
  error?: string;
}

const initialState: IndividualsState = {
  list: [],
  status: "idle",
};

// ─────────────── Async thunks ───────────────
export const fetchIndividuals = createAsyncThunk(
  "individuals/fetchAll",
  async () => {
    return await window.genealogyAPI.listIndividuals();
  }
);

export const createIndividual = createAsyncThunk(
  "individuals/create",
  async (individual: Individual, { rejectWithValue }) => {
    try {
      return await window.genealogyAPI.addIndividual(individual);
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const editIndividual = createAsyncThunk(
  "individuals/update",
  async (
    { id, updates }: { id: string; updates: Partial<Individual> },
    { rejectWithValue }
  ) => {
    try {
      return await window.genealogyAPI.updateIndividual(id, updates);
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const removeIndividual = createAsyncThunk(
  "individuals/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await window.genealogyAPI.deleteIndividual(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

// ─────────────── Slice ───────────────
const individualsSlice = createSlice({
  name: "individuals",
  initialState,
  reducers: {
    // Optimistic update for create
    optimisticAdd: (state, action: PayloadAction<Individual>) => {
      state.list.push(action.payload);
    },
    // Optimistic update for delete
    optimisticRemove: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter((i) => i.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchIndividuals.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchIndividuals.fulfilled, (state, action) => {
        state.status = "idle";
        state.list = action.payload;
      })
      .addCase(fetchIndividuals.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })

      // create
      .addCase(createIndividual.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(createIndividual.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // update
      .addCase(editIndividual.fulfilled, (state, action) => {
        const idx = state.list.findIndex((i) => i.id === action.payload.id);
        if (idx >= 0) state.list[idx] = action.payload;
      })
      .addCase(editIndividual.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // delete
      .addCase(removeIndividual.fulfilled, (state, action) => {
        state.list = state.list.filter((i) => i.id !== action.payload);
      })
      .addCase(removeIndividual.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { optimisticAdd, optimisticRemove } = individualsSlice.actions;
export default individualsSlice.reducer;