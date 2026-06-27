// Thin fetch wrapper around the API. Base URL comes from config (env.js).
import config from "../config/appConfig.js";

const base = (config.api && config.api.baseUrl) || "/api";

async function req(path, opts = {}) {
  const res = await fetch(base + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let msg = `API ${res.status}`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export const get = (path) => req(path);
export const post = (path, body) => req(path, { method: "POST", body: JSON.stringify(body || {}) });
