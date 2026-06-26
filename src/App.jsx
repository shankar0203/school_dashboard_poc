import React, { useState } from "react";
import { AppContext } from "./context.js";
import { NAV } from "./roles/registry.js";
import Layout from "./components/Layout.jsx";

export default function App() {
  const [role, setRole] = useState("student");
  const [view, setView] = useState("dashboard");
  const [, setVersion] = useState(0);          // bump() to re-render after data mutations
  const bump = () => setVersion((v) => v + 1);

  // guard: if a role doesn't have the current view, fall back to its first nav item
  const safeView = NAV[role].find((n) => n.key === view) ? view : NAV[role][0].key;

  return (
    <AppContext.Provider value={{ role, setRole, view: safeView, setView, bump }}>
      <Layout />
    </AppContext.Provider>
  );
}
