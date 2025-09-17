import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Individual {
  id: string;
  name: string;
}

interface IndividualsState {
  list: Individual[];
}

const initialState: IndividualsState = {
  list: []
};

const individualsSlice = createSlice({
  name: "individuals",
  initialState,
  reducers: {
    addIndividual: (state, action: PayloadAction<Individual>) => {
      state.list.push(action.payload);
    }
  }
});

export const { addIndividual } = individualsSlice.actions;
export default individualsSlice.reducer;
