import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import { createHashRouter, RouterProvider } from "react-router-dom";

import AppLayout from "./AppLayout";
import Dashboard from "./features/dashboard";
import PedigreePage from "./features/pedigree";
import TimelinePage from "./features/timeline";
import IndividualsPage from "./features/individuals";
import RelationshipsPage from "./features/relationships";
import PlacesPage from "./features/places";
import AgesPage from "./features/ages";

import "./i18n";

import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import { initDB } from "./storage"; // localStorage-backed init + migrations
import { genealogyWebAPI } from "./api/genealogy-web"; // browser impl of the API surface

// ⬇ NEW: vite-plugin-pwa registration helper.
// This will register the generated service worker so we get offline caching and installability.
import { registerSW } from "virtual:pwa-register";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#9c27b0" },
  },
});

// Route config stays the same (hash-based routing works well for offline PWAs)
const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "tree", element: <PedigreePage /> },
      { path: "timeline", element: <TimelinePage /> },
      { path: "places", element: <PlacesPage /> },
      { path: "ages", element: <AgesPage /> },
      { path: "individuals", element: <IndividualsPage /> },
      { path: "relationships", element: <RelationshipsPage /> },
    ],
  },
]);

// ⬇⬇⬇ BOOTSTRAP WRAPPER ⬇⬇⬇
(async function bootstrap() {
  // 1. Init browser DB (creates localStorage buckets if missing, runs migrations)
  await initDB();

  // 2. Expose a GenealogyAPI-compatible surface on window
  //    so slices/thunks can continue to call window.api.*
  (window as any).api = genealogyWebAPI;

  // 3. Register PWA service worker for offline/app-shell caching.
  //    immediate: true = register right now
  //    onOfflineReady = hook for telling the user "ready to use offline"
  registerSW({
    immediate: true,
    onOfflineReady() {
      // You can replace this with a Snackbar/Toast later
      console.log("App is ready to work offline.");
    },
  });

  // 4. Now that storage + api + SW are ready, render the actual app
  const rootEl = document.getElementById("root") as HTMLElement;
  const root = ReactDOM.createRoot(rootEl);

  root.render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  );
})();