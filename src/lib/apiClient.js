// Thin fetch wrapper around the API. Base URL comes from config (env.js).
// Every request carries the signed-in user's Cognito ID token; the API
// verifies it and derives role + tenant from it.
import config from "../config/appConfig.js";
import { getIdToken, signOut } from "./auth.js";

const base = (config.api && config.api.baseUrl) || "/api";

// Called on 401 so the app can bounce the user back to login.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

async function req(path, opts = {}) {
  const token = await getIdToken();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(base + path, { ...opts, headers });

  if (res.status === 401) {
    // Token missing/expired — clear the session and let the app react.
    signOut();
    if (onUnauthorized) onUnauthorized();
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (!res.ok) {
    let msg = `API ${res.status}`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export const get = (path) => req(path);
export const post = (path, body) => req(path, { method: "POST", body: JSON.stringify(body || {}) });
export const put = (path, body) => req(path, { method: "PUT", body: JSON.stringify(body || {}) });
