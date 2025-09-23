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

import "./i18n";

import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#9c27b0" },
  },
});

const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "tree", element: <Tree /> },
      { path: "timeline", element: <Timeline /> },
      { path: "individuals", element: <IndividualsPage /> },
      { path: "relationships", element: <RelationshipsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </Provider>
);