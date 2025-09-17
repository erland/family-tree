import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Relationship } from "../types/relationship";

interface RelationshipsState {
  items: Relationship[];
  status: "idle" | "loading" | "failed";
}

const initialState: RelationshipsState = { items: [], status: "idle" };

export const fetchRelationships = createAsyncThunk("relationships/fetchAll", async () => {
  return await window.genealogyAPI.listRelationships();
});

export const addRelationship = createAsyncThunk("relationships/add", async (rel: Relationship) => {
  return await window.genealogyAPI.addRelationship(rel);
});

export const updateRelationship = createAsyncThunk(
  "relationships/update",
  async ({ id, updates }: { id: string; updates: Partial<Relationship> }) => {
    return await window.genealogyAPI.updateRelationship(id, updates);
  }
);

export const deleteRelationship = createAsyncThunk("relationships/delete", async (id: string) => {
  await window.genealogyAPI.deleteRelationship(id);
  return id;
});

const relationshipsSlice = createSlice({
  name: "relationships",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRelationships.fulfilled, (state, action: PayloadAction<Relationship[]>) => {
        state.items = action.payload;
      })
      .addCase(addRelationship.fulfilled, (state, action: PayloadAction<Relationship>) => {
        state.items.push(action.payload);
      })
      .addCase(updateRelationship.fulfilled, (state, action: PayloadAction<Relationship>) => {
        const idx = state.items.findIndex((r) => r.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      })
      .addCase(deleteRelationship.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((r) => r.id !== action.payload);
      });
  },
});

export default relationshipsSlice.reducer;