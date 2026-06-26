import React from "react";
import { createRoot } from "react-dom/client";
import { applyTheme } from "./lib/theme.js";
import App from "./App.jsx";
import "./styles/global.css";

applyTheme(); // pushes config colours into CSS variables + sets the page title

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
