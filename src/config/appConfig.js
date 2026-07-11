// ===========================================================================
//  ⚙️  APP CONFIG  —  SINGLE SOURCE OF TRUTH FOR ALL COMMON VALUES
// ---------------------------------------------------------------------------
//  Change anything here and the whole app updates. This is the ONE file you
//  edit for branding, colours, school info, classes, subjects, exams, etc.
//
//  👉 The product name is NOT finalised — just edit `app.name` (and optionally
//     `app.logoInitial` / `app.nativeName`) below whenever you decide.
//
//  Environment endpoints (Cognito IDs, region, API URL) live in ./env.js,
//  which is generated from the single `config.values` file via
//  scripts/apply-config.sh.
// ===========================================================================
import env from "./env.js";

export const config = {
  // -------------------------------------------------------------------------
  // SCHOOL BRANDING  (change per deployment — each school gets their own name + logo)
  // logoUrl: path to school logo image. If set, shown instead of logoInitial.
  // -------------------------------------------------------------------------
  app: {
    name: "ABC School",          // ← School name shown in topbar (change per school)
    tagline: "School Management",
    nativeName: "",              // secondary script; set "" to hide
    logoInitial: "A",            // letter shown in badge when no logoUrl
    logoUrl: "",                 // optional school logo image URL (overrides logoInitial)
    supportEmail: "hello@invisos.in",
    locale: "en-IN",
    currency: "₹",
  },

  // -------------------------------------------------------------------------
  // PLATFORM  (Invisos branding — shown as "Powered by" in sidebar footer)
  // -------------------------------------------------------------------------
  platform: {
    name: "Invisos",
    url: "https://invisos.in",
  },

  // -------------------------------------------------------------------------
  // THEME  (every colour in the UI comes from here, via CSS variables)
  // -------------------------------------------------------------------------
  theme: {
    bg: "#0b0e23",
    bg2: "#11153a",
    panel: "#161a44",
    panel2: "#1d2255",
    line: "#2a2f63",
    text: "#e8e9ff",
    muted: "#9aa0d4",
    muteder: "#6b71a8",
    primary: "#7c5cff",
    primary2: "#9b7bff",
    accent: "#34d1bf",
    warn: "#ffb454",
    bad: "#ff5c7c",
    good: "#4ade80",
    info: "#5aa9ff",
    radius: "15px",
  },

  // -------------------------------------------------------------------------
  // SCHOOL  (the tenant — later comes from the logged-in user's school)
  // -------------------------------------------------------------------------
  school: {
    name: "ABC School",
    city: "Coimbatore",
    academicYear: "2025–26",
  },

  // -------------------------------------------------------------------------
  // COGNITO AUTH + API  — values come from ./env.js (the single values file).
  // Don't edit here; edit config.values and run scripts/apply-config.sh.
  // -------------------------------------------------------------------------
  cognito: {
    region: env.region,
    userPoolId: env.cognito.userPoolId,
    clientId: env.cognito.clientId,
  },
  api: {
    baseUrl: env.apiBaseUrl,
  },

  // -------------------------------------------------------------------------
  // ACADEMICS  (shared lists used across every role/screen)
  // -------------------------------------------------------------------------
  academics: {
    classes: ["6-A","6-B","6-C","7-A","7-B","7-C","8-A","8-B","8-C","9-A","9-B","9-C","10-A","10-B","10-C"],
    subjects: ["Tamil","English","Maths","Science","Social"],
    exams: [
      { id: "mt1", name: "Mid Term 1" },
      { id: "qt",  name: "Quarterly" },
      { id: "mt2", name: "Mid Term 2" },
      { id: "hy",  name: "Half-Yearly" },
    ],
    grade(mark) {
      if (mark >= 90) return "A+";
      if (mark >= 80) return "A";
      if (mark >= 70) return "B";
      if (mark >= 60) return "C";
      if (mark >= 35) return "D";
      return "F";
    },
    passMark: 35,
  },

  // -------------------------------------------------------------------------
  // ROLES  (label + accent colour per role; nav/screens live in the registry)
  // -------------------------------------------------------------------------
  roles: {
    student:     { label: "Student",        color: "#9b7bff" },
    parent:      { label: "Parent",         color: "#5aa9ff" },
    teacher:     { label: "Class Teacher",  color: "#ffb454" },
    principal:   { label: "Principal",      color: "#34d1bf" },
    schoolAdmin: { label: "School Admin",   color: "#ff5c7c" },
    owner:       { label: "Product Owner",  color: "#4ade80" },
  },

  // -------------------------------------------------------------------------
  // FEATURE FLAGS  (turn features on/off without touching code)
  // -------------------------------------------------------------------------
  features: {
    fees: true,
    events: true,
    studentMessaging: true,
    parentRole: true,
    schoolAdminRole: true,
    ownerRole: true,
    httpsEnforced: false,     // ⚠ set true once HTTPS is live
  },
};

// Small helper used in a few labels
export const money = (n) =>
  config.app.currency + Number(n).toLocaleString(config.app.locale);

// ── Attendance status definitions ─────────────────────────────────────────────
// Single source of truth — import { ATT_STATUSES, ATT_MAP, attEffPct } where needed.
export const ATT_STATUSES = [
  { value: "present",  label: "Present",  short: "P",  color: "#4ade80", bg: "rgba(74,222,128,0.15)",  w: 1.0 },
  { value: "absent",   label: "Absent",   short: "A",  color: "#ff5c7c", bg: "rgba(255,92,124,0.15)",  w: 0   },
  { value: "late",     label: "Late",     short: "L",  color: "#ffb454", bg: "rgba(255,180,84,0.15)",  w: 1.0 },
  { value: "half_day", label: "Half Day", short: "HD", color: "#ffd700", bg: "rgba(255,215,0,0.15)",   w: 0.5 },
  { value: "od",       label: "On Duty",  short: "OD", color: "#5aa9ff", bg: "rgba(90,169,255,0.15)",  w: 1.0 },
  { value: "medical",  label: "Medical",  short: "ML", color: "#c084fc", bg: "rgba(192,132,252,0.15)", w: 0   },
];

export const ATT_MAP = Object.fromEntries(ATT_STATUSES.map((s) => [s.value, s]));

// Weighted attendance % — present/late/od = 1.0, half_day = 0.5, absent/medical = 0
export const attEffPct = (rows) => {
  if (!rows || !rows.length) return 0;
  const eff = rows.reduce((sum, r) => sum + (ATT_MAP[r.status]?.w ?? 0), 0);
  return Math.round((eff / rows.length) * 100);
};

export default config;
