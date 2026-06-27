// ===========================================================================
//  ⚙️  APP CONFIG  —  SINGLE SOURCE OF TRUTH FOR ALL COMMON VALUES
// ---------------------------------------------------------------------------
//  Change anything here and the whole app updates. This is the ONE file you
//  edit for branding, colours, school info, classes, subjects, exams, etc.
//
//  👉 The product name is NOT finalised — just edit `app.name` (and optionally
//     `app.logoInitial` / `app.nativeName`) below whenever you decide.
// ===========================================================================

export const config = {
  // -------------------------------------------------------------------------
  // BRAND  (rename the product here)
  // -------------------------------------------------------------------------
  app: {
    name: "Vidyam",              // ← PRODUCT NAME (placeholder — change anytime)
    tagline: "School Management",
    nativeName: "வித்யம்",        // secondary script next to the name; set "" to hide
    logoInitial: "வி",           // letter/glyph shown in the logo badge
    supportEmail: "hello@example.com",
    locale: "en-IN",
    currency: "₹",
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
    name: "Vidyam Public School",
    city: "Coimbatore",
    academicYear: "2025–26",
  },

  // -------------------------------------------------------------------------
  // COGNITO AUTH  — fill these from your `terraform apply` outputs:
  //   userPoolId = cognito_user_pool_id
  //   clientId   = cognito_client_id
  //   region     = your aws_region
  // -------------------------------------------------------------------------
  cognito: {
    region: "us-east-1",
    userPoolId: "us-east-1_XXXXXXXXX",
    clientId: "XXXXXXXXXXXXXXXXXXXXXXXXXX",
  },

  // -------------------------------------------------------------------------
  // ACADEMICS  (shared lists used across every role/screen)
  // -------------------------------------------------------------------------
  academics: {
    classes: ["6-A","6-B","7-A","7-B","8-A","8-B","9-A","9-B","10-A","10-B","11-A","12-A"],
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
    student:   { label: "Student",           color: "#9b7bff" },
    teacher:   { label: "Teacher",            color: "#ffb454" },
    principal: { label: "Principal / Admin",  color: "#34d1bf" },
  },

  // -------------------------------------------------------------------------
  // FEATURE FLAGS  (turn features on/off without touching code)
  // -------------------------------------------------------------------------
  features: {
    fees: true,
    events: true,
    studentMessaging: true,   // student can post messages (seen by teacher + principal)
    parentRole: false,        // parent portal not enabled yet
    httpsEnforced: false,     // ⚠ set true once HTTPS is configured before go-live
  },
};

// Small helper used in a few labels
export const money = (n) =>
  config.app.currency + Number(n).toLocaleString(config.app.locale);

export default config;
