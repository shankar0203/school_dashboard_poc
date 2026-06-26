// Pushes the colours from appConfig.theme into CSS variables on :root,
// and sets the document title from the app name. Called once at startup.
import config from "../config/appConfig.js";

export function applyTheme() {
  const t = config.theme;
  const r = document.documentElement.style;
  const map = {
    "--bg": t.bg, "--bg2": t.bg2, "--panel": t.panel, "--panel2": t.panel2,
    "--line": t.line, "--txt": t.text, "--muted": t.muted, "--muteder": t.muteder,
    "--pri": t.primary, "--pri2": t.primary2, "--accent": t.accent,
    "--warn": t.warn, "--bad": t.bad, "--good": t.good, "--info": t.info,
    "--radius": t.radius,
  };
  Object.entries(map).forEach(([k, v]) => r.setProperty(k, v));
  document.title = `${config.app.name} · ${config.app.tagline}`;
}
