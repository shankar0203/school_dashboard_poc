# School Management — POC (React + Vite)

A config-driven proof-of-concept with three roles: **Student**, **Teacher**, **Principal / Admin**.
Built to mirror your existing stack (React 18 + Vite) so it drops straight into development.

---

## ▶️ Run it

```bash
cd school-app-poc
npm install
npm run dev          # opens http://localhost:5173
```

Build for hosting:

```bash
npm run build        # output in dist/
npm run preview      # preview the production build
```

> Note: this project uses React + Vite from npm. Run `npm install` on your machine
> (it was not run in the environment that generated these files).

---

## ⚙️ ONE place for all common values — `src/config/appConfig.js`

Everything you'd want to change lives in this single file:

| What | Where in the config |
|------|---------------------|
| **Product name** (not finalised yet) | `app.name` — change it here, the whole app updates |
| Logo glyph / native-script name | `app.logoInitial`, `app.nativeName` (set `""` to hide) |
| Tagline, support email, currency, locale | `app.*` |
| **All theme colours** | `theme.*` (pushed into CSS variables at runtime) |
| School name / city / academic year | `school.*` |
| Class list, subjects, exams, grade bands, pass mark | `academics.*` |
| Role labels + accent colours | `roles.*` |
| Feature on/off switches | `features.*` |

Change a colour or the school name in `appConfig.js` and every screen reflects it — no
hunting through components.

### Renaming the product later
Open `src/config/appConfig.js` → edit:
```js
app: {
  name: "Vidyam",        // ← put the final name here
  logoInitial: "வி",      // ← the badge letter/glyph
  nativeName: "வித்யம்",   // ← secondary script, or "" to remove
  ...
}
```
That's the only change needed.

---

## 🗂 Structure

```
src/
  config/appConfig.js     ← SINGLE source of common values (edit this)
  data/seed.js            ← demo data (thrown away once the API is wired)
  services/dataService.js ← the ONE file that talks to "the backend"
  lib/theme.js            ← applies config colours to CSS variables
  styles/global.css       ← structure only; colours come from variables
  components/
    ui.jsx                ← Card, Stat, Tabs, Calendar, Message, etc.
    Layout.jsx            ← topbar + role switch + sidebar nav
  roles/
    student.jsx           ← Student screens + nav
    teacher.jsx           ← Teacher screens + nav
    principal.jsx         ← Principal/Admin screens + nav
    registry.js           ← maps role → nav → screens
  context.js  App.jsx  main.jsx
```

---

## 🔌 Going from POC to real backend

The app never calls the backend directly — it only calls **`src/services/dataService.js`**.
To go live, replace each function body there with a `fetch()` to your Express API. Example:

```js
// now (POC, reads in-memory seed):
export const listStudents = (cls) => seed.students.map(s => ({ ...s, cls }));

// later (real API):
export const listStudents = (cls) =>
  fetch(`/api/students?class=${cls}`).then(r => r.json());
```

No screen or component changes needed.

---

## ✅ Roles in this POC

- **Student** (read-only): dashboard, attendance calendar, exam results, timetable,
  events/news, teacher notes, messages (can post to teacher/parent), fees.
- **Teacher**: my-class attendance, students (view/edit/add), create exam + enter marks
  for assigned subject (incl. cross-class), notes to parent, principal message inbox (reply).
- **Principal / Admin**: school + class-wise attendance, students by class, exam-wise
  results, broadcast to students, broadcast to teachers, direct message to a teacher, fees status.

## 🔒 Before go-live (flags in `features`)
- `httpsEnforced` — turn on HTTPS; logins must not travel in plaintext.
- `parentRole` — parent portal not built yet (student spec references parents).
- `studentMessaging` — consider structured messages (leave/absence) over free chat for safety.
