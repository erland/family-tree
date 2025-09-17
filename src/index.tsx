import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import {
  createHashRouter,
  RouterProvider,
} from "react-router-dom";

import AppLayout from "./App";
import Dashboard from "./pages/Dashboard";
import Tree from "./pages/Tree";
import Profile from "./pages/Profile";
import Timeline from "./pages/Timeline";
import Reports from "./pages/Reports";

import "./i18n";

// Router config with HashRouter
const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "tree", element: <Tree /> },
      { path: "profile", element: <Profile /> },
      { path: "timeline", element: <Timeline /> },
      { path: "reports", element: <Reports /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);