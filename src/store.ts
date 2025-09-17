import { configureStore } from "@reduxjs/toolkit";
import individualsReducer from "./features/individualsSlice";

export const store = configureStore({
  reducer: {
    individuals: individualsReducer,
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
