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

export const addRelationship = createAsyncThunk(
  "relationships/add",
  async (rel: Omit<Relationship, "id"> & { id?: string }) => {
    const finalRel: Relationship = { id: rel.id ?? crypto.randomUUID(), ...rel };
    return await window.genealogyAPI.addRelationship(finalRel);
  }
);

export const updateRelationship = createAsyncThunk(
  "relationships/update",
  async (rel: Relationship) => {
    return await window.genealogyAPI.updateRelationship(rel.id, rel);
  }
);

export const deleteRelationship = createAsyncThunk("relationships/delete", async (id: string) => {
  await window.genealogyAPI.deleteRelationship(id);
  return id;
});

const relationshipsSlice = createSlice({
  name: "relationships",
  initialState,
  reducers: {
    clearRelationships: (state) => { 
      state.items = []; 
      state.status = "idle";
    },
  },
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
export const { clearRelationships } = relationshipsSlice.actions;