import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import { createHashRouter, RouterProvider } from "react-router-dom";

import AppLayout from "./AppLayout";
import Dashboard from "./pages/Dashboard";
import Tree from "./pages/Tree";
import Timeline from "./pages/Timeline";
import IndividualsPage from "./pages/Individuals";
import RelationshipsPage from "./pages/Relationships";
import PlacesPage from "./pages/PlacesPage";
import AgesPage from "./pages/AgesPage";

import "./i18n";

import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 🔁 NEW imports
import { initDB } from "./storage";            // your web storage module (localStorage-backed)
import { genealogyWebAPI } from "./api/genealogy-web"; // the browser impl of GenealogyAPI

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#9c27b0" },
  },
});

// Your existing route config stays the same
const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "tree", element: <Tree /> },
      { path: "timeline", element: <Timeline /> },
      { path: "places", element: <PlacesPage /> },
      { path: "ages", element: <AgesPage /> },
      { path: "individuals", element: <IndividualsPage /> },
      { path: "relationships", element: <RelationshipsPage /> },
    ],
  },
]);

// ⬇⬇⬇ BOOTSTRAP WRAPPER ⬇⬇⬇
(async function bootstrap() {
  // 1. Init browser DB (creates localStorage buckets if missing)
  await initDB();

  // 2. Expose a GenealogyAPI-compatible surface on window
  //    so slices/thunks can keep doing window.api.listIndividuals(), etc.
  (window as any).api = genealogyWebAPI;

  // 3. Now that storage + api are ready, render the actual app
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