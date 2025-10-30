import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";

import individualsReducer from "./features/individualsSlice";
import relationshipsReducer from "./features/relationshipsSlice";
import pedigreeOptionsReducer from "./features/pedigree/state/pedigreeOptionsSlice";

export const store = configureStore({
  reducer: {
    individuals: individualsReducer,
    relationships: relationshipsReducer,
    pedigreeOptions: pedigreeOptionsReducer,
  },
});

// Infer types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;