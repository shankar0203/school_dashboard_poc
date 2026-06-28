// Small reusable UI building blocks shared across all role screens.
import React from "react";
import config from "../config/appConfig.js";

// Loading / error helper for API-backed sections.
export const Loading = ({ state, children }) => {
  if (state.loading) return <div className="mini" style={{ padding: 12 }}>Loading…</div>;
  if (state.error) return <div className="mini" style={{ padding: 12, color: "var(--bad)" }}>Couldn’t load: {state.error.message}</div>;
  return children;
};

export const Card = ({ title, action, children, className = "" }) => (
  <div className={`card ${className}`}>
    {title && <div className="ct">{title}{action}</div>}
    {children}
  </div>
);

export const Stat = ({ label, value, delta, dir = "flat", suffix }) => (
  <div className="card stat">
    <div className="lbl">{label}</div>
    <div className="val">{value}</div>
    <div className={`delta ${dir}`}>
      {dir === "up" ? "▲ " : dir === "down" ? "▼ " : ""}{delta}
    </div>
    {suffix}
  </div>
);

export const PageHead = ({ title, sub, right }) => (
  <div className="ph">
    <div><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div>
    {right}
  </div>
);

export const Bar = ({ name, pct }) => (
  <div className="subline">
    <div className="s-nm">{name}</div>
    <div className="bar" style={{ flex: 1 }}><i style={{ width: pct + "%" }} /></div>
    <div className="s-mk">{pct}%</div>
  </div>
);

export const Tabs = ({ items, value, onChange }) => (
  <div className="tabs">
    {items.map((it) => (
      <div key={it.id} className={`tab ${it.id === value ? "on" : ""}`} onClick={() => onChange(it.id)}>
        {it.name}
      </div>
    ))}
  </div>
);

export const FeeBadge = ({ status }) => {
  const cls = status === "Paid" ? "b-good" : status === "Partial" ? "b-warn" : "b-bad";
  return <span className={`badge ${cls}`}>{status}</span>;
};

export const Message = ({ m }) => (
  <div className="msg">
    <div className="av" style={{ background: m.col || "var(--pri)" }}>{m.from[0]}</div>
    <div style={{ flex: 1 }}>
      <div className="from">{m.from} <span className="time">· {m.time || "now"}</span></div>
      <div className="text">{m.text}</div>
    </div>
  </div>
);

// June 2026 attendance calendar (demo month). absent = [day numbers]
export const Calendar = ({ absent = [] }) => {
  const dows = ["S", "M", "T", "W", "T", "F", "S"];
  const startOffset = 1, daysInMonth = 30; // June 1, 2026 = Monday
  const cells = [];
  dows.forEach((d, i) => cells.push(<div className="dow" key={"dow" + i}>{d}</div>));
  for (let i = 0; i < startOffset; i++) cells.push(<div className="day e" key={"e" + i} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = (startOffset + d - 1) % 7;
    let cls = "p", lab = "P";
    if (dow === 0 || dow === 6) { cls = "h"; lab = ""; }
    else if (absent.includes(d)) { cls = "a"; lab = "A"; }
    if (d > 23 && dow !== 0 && dow !== 6) { cls = ""; lab = ""; } // future days plain
    cells.push(
      <div className={`day ${cls}`} key={d}>{d}{lab && <small>{lab}</small>}</div>
    );
  }
  return <div className="cal">{cells}</div>;
};

export const money = (n) =>
  config.app.currency + Number(n).toLocaleString(config.app.locale);

// Donut chart (CSS conic-gradient, no dependencies).
// segments: [{ label, value, color }]
export const Donut = ({ segments = [], size = 130, centerLabel, centerSub }) => {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  const stops = segments.map((s) => {
    const start = (acc / total) * 360;
    acc += s.value;
    const end = (acc / total) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  });
  const bg = total && segments.some((s) => s.value > 0)
    ? `conic-gradient(${stops.join(",")})`
    : "var(--panel2)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: bg, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: "24%", borderRadius: "50%", background: "var(--panel)", display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{centerLabel}</div>
            {centerSub && <div className="mini">{centerSub}</div>}
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, margin: "5px 0" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            {s.label}<b style={{ marginLeft: "auto" }}>{s.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
};
