// Topbar (brand + signed-in user), sidebar (user + nav), and the screen area.
import React from "react";
import config from "../config/appConfig.js";
import { useApp } from "../context.js";
import { NAV } from "../roles/registry.js";

export default function Layout() {
  const { role, view, setView, user, signOut } = useApp();
  const nav = NAV[role];
  const item = nav.find((n) => n.key === view) || nav[0];
  const Screen = item.Component;
  const roleMeta = config.roles[role];
  const email = user.email || "user";
  const displayName = email.split("@")[0];

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="logo">{config.app.logoInitial}</div>
          {config.app.name}
          {config.app.nativeName && <span className="ta">{config.app.nativeName}</span>}
        </div>
        <div className="user-chip">
          <span className="role-badge" style={{ background: roleMeta.color }}>{roleMeta.label}</span>
          <span className="user-email">{user.email}</span>
          <button className="btn ghost sm" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div className="shell">
        <aside className="side">
          <div className="who">
            <div className="avatar" style={{ background: roleMeta.color }}>{displayName[0].toUpperCase()}</div>
            <div><div className="nm">{displayName}</div><div className="rl">{roleMeta.label}</div></div>
          </div>
          <nav className="nav">
            {nav.map((n) => (
              <a key={n.key} className={n.key === view ? "on" : ""} onClick={() => setView(n.key)}>
                <span className="ic">{n.icon}</span>{n.label}
              </a>
            ))}
          </nav>
          <div className="ro-note">Signed in via Cognito<br/>{email}</div>
        </aside>
        <main className="main"><Screen /></main>
      </div>
    </>
  );
}
