import React, { useState, useEffect } from "react";
import { AppContext } from "./context.js";
import { NAV } from "./roles/registry.js";
import Layout from "./components/Layout.jsx";
import Login from "./components/Login.jsx";
import { getCurrentUser, signOut as cognitoSignOut } from "./lib/auth.js";

export default function App() {
  const [auth, setAuth] = useState({ status: "loading", user: null });
  const [view, setView] = useState("dashboard");
  const [, setVersion] = useState(0);           // bump() re-renders after data mutations
  const bump = () => setVersion((v) => v + 1);

  // restore an existing session on load
  useEffect(() => {
    getCurrentUser().then((u) =>
      setAuth(u ? { status: "in", user: u } : { status: "out", user: null })
    );
  }, []);

  const onSignedIn = (user) => { setView("dashboard"); setAuth({ status: "in", user }); };
  const signOut = () => { cognitoSignOut(); setAuth({ status: "out", user: null }); };

  if (auth.status === "loading") return <div className="center-msg">Loading…</div>;
  if (auth.status === "out") return <Login onSignedIn={onSignedIn} />;

  const role = auth.user.role;
  if (!role) {
    return (
      <div className="center-msg">
        <p>Signed in as <b>{auth.user.email}</b>, but this account isn't in a role group
          (student / parent / teacher / principal / school-admin / owner).</p>
        <p className="mini">Ask an admin to add you to a group in Cognito.</p>
        <button className="btn" onClick={signOut} style={{ marginTop: 14 }}>Sign out</button>
      </div>
    );
  }

  const safeView = NAV[role].find((n) => n.key === view) ? view : NAV[role][0].key;

  return (
    <AppContext.Provider value={{ role, view: safeView, setView, bump, user: auth.user, signOut }}>
      <Layout />
    </AppContext.Provider>
  );
}
