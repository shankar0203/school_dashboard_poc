// Topbar (brand + role switch), sidebar (user + nav), and the screen area.
import React from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApp } from "../context.js";
import { NAV } from "../roles/registry.js";

export default function Layout() {
  const { role, setRole, view, setView } = useApp();
  const nav = NAV[role];
  const item = nav.find((n) => n.key === view) || nav[0];
  const Screen = item.Component;
  const roleMeta = config.roles[role];
  const user = api.getDemoUser(role);

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="logo">{config.app.logoInitial}</div>
          {config.app.name}
          {config.app.nativeName && <span className="ta">{config.app.nativeName}</span>}
        </div>
        <div className="roleswitch">
          {Object.entries(config.roles).map(([key, meta]) => (
            <button key={key} className={key === role ? "active" : ""}
              style={{ background: key === role ? `linear-gradient(135deg, ${meta.color}, ${meta.color})` : "transparent" }}
              onClick={() => { setRole(key); setView(NAV[key][0].key); }}>
              <span className="dot" style={{ background: meta.color }} />{meta.label}
            </button>
          ))}
        </div>
      </div>

      <div className="shell">
        <aside className="side">
          <div className="who">
            <div className="avatar" style={{ background: roleMeta.color }}>{user.name[0]}</div>
            <div><div className="nm">{user.name}</div><div className="rl">{user.sub}</div></div>
          </div>
          <nav className="nav">
            {nav.map((n) => (
              <a key={n.key} className={n.key === view ? "on" : ""} onClick={() => setView(n.key)}>
                <span className="ic">{n.icon}</span>{n.label}
              </a>
            ))}
          </nav>
          <div className="ro-note">{user.note}</div>
        </aside>
        <main className="main"><Screen /></main>
      </div>
    </>
  );
}
