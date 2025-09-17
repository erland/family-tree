import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Relationship } from "../types/genealogy";

export interface RelationshipsState {
  list: Relationship[];
  status: "idle" | "loading" | "failed";
  error?: string;
}

const initialState: RelationshipsState = {
  list: [],
  status: "idle",
};

// ─────────────── Async thunks ───────────────
export const fetchRelationships = createAsyncThunk(
  "relationships/fetchAll",
  async () => {
    return await window.genealogyAPI.listRelationships();
  }
);

export const createRelationship = createAsyncThunk(
  "relationships/create",
  async (relationship: Relationship, { rejectWithValue }) => {
    try {
      return await window.genealogyAPI.addRelationship(relationship);
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const editRelationship = createAsyncThunk(
  "relationships/update",
  async (
    { id, updates }: { id: string; updates: Partial<Relationship> },
    { rejectWithValue }
  ) => {
    try {
      return await window.genealogyAPI.updateRelationship(id, updates);
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const removeRelationship = createAsyncThunk(
  "relationships/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await window.genealogyAPI.deleteRelationship(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

// ─────────────── Slice ───────────────
const relationshipsSlice = createSlice({
  name: "relationships",
  initialState,
  reducers: {
    optimisticAdd: (state, action: PayloadAction<Relationship>) => {
      state.list.push(action.payload);
    },
    optimisticRemove: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter((r) => r.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchRelationships.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchRelationships.fulfilled, (state, action) => {
        state.status = "idle";
        state.list = action.payload;
      })
      .addCase(fetchRelationships.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })

      // create
      .addCase(createRelationship.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(createRelationship.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // update
      .addCase(editRelationship.fulfilled, (state, action) => {
        const idx = state.list.findIndex((r) => r.id === action.payload.id);
        if (idx >= 0) state.list[idx] = action.payload;
      })
      .addCase(editRelationship.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // delete
      .addCase(removeRelationship.fulfilled, (state, action) => {
        state.list = state.list.filter((r) => r.id !== action.payload);
      })
      .addCase(removeRelationship.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { optimisticAdd, optimisticRemove } = relationshipsSlice.actions;
export default relationshipsSlice.reducer;