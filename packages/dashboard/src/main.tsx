import "./styles/index.css";

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

// Vite entry point that mounts the React dashboard application.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
