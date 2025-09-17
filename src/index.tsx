import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Provider, useDispatch } from "react-redux";
import { store } from "./store";
import App from "./App";
import { addIndividual } from "./features/individualsSlice";

function DemoLoader() {
  const dispatch = useDispatch();

  useEffect(() => {
    async function load() {
      // Example: call the preload API
      const people = await window.genealogyAPI.listIndividuals();
      console.log("Individuals from DB:", people);

      // Example: add a new person
      const newPerson = await window.genealogyAPI.addIndividual({
        id: crypto.randomUUID(),
        name: "John Doe",
      });

      // Sync with Redux store
      dispatch(addIndividual(newPerson));
    }

    load();
  }, [dispatch]);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Provider store={store}>
    <DemoLoader />
  </Provider>
);