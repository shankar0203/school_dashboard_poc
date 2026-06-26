// ===========================================================================
//  SEED / DEMO DATA  (throwaway — replaced by the real API via dataService.js)
//  Only volatile demo records live here. Shared CONSTANTS (classes, subjects,
//  exams, currency, theme...) live in src/config/appConfig.js.
// ===========================================================================

// Demo "logged-in" user per role (later: comes from the auth token)
export const demoUsers = {
  student:   { name: "Aarav Anand",   sub: "Class 8-A · Roll 12",
               note: "Read-only access. Can view own records and post a message to teacher/parent." },
  teacher:   { name: "Mr. Saravanan K.", sub: "Class Teacher · 8-A",
               note: "Class teacher of 8-A. Also teaches Tamil to 9-A (cross-class access granted by admin)." },
  principal: { name: "Mrs. Lakshmi N.",  sub: "Principal · Admin",
               note: "Full school oversight: broadcast to students & teachers, message individual teachers, view fees." },
};

export const students = [
  { roll: 12, name: "Aarav Anand",      cls: "8-A", att: 94, guardian: "Anand Kumar", phone: "98xxxxxx12", fee: "Paid" },
  { roll: 4,  name: "Divya Meenakshi",  cls: "8-A", att: 98, guardian: "Meena R.",    phone: "98xxxxxx04", fee: "Paid" },
  { roll: 7,  name: "Priya Lakshmi",    cls: "8-A", att: 92, guardian: "Lakshmi S.",  phone: "98xxxxxx07", fee: "Pending" },
  { roll: 19, name: "Karthik Raja",     cls: "8-A", att: 76, guardian: "Raja M.",     phone: "98xxxxxx19", fee: "Partial" },
  { roll: 22, name: "Mohammed Irfan",   cls: "8-A", att: 61, guardian: "Irfan A.",    phone: "98xxxxxx22", fee: "Pending" },
  { roll: 3,  name: "Sneha Devi",       cls: "8-A", att: 95, guardian: "Devi K.",     phone: "98xxxxxx03", fee: "Paid" },
];

// student Aarav's marks per exam (index matches config.academics.subjects order)
export const myMarks = {
  mt1: [78, 82, 71, 80, 74],
  qt:  [85, 80, 76, 88, 79],
  mt2: [88, 84, 82, 90, 80],
  hy:  [92, 85, 88, 90, 81],
};

// class-wise attendance for the principal view
export const classAttendance = {
  "6-A":94,"6-B":90,"7-A":88,"7-B":85,"8-A":92,"8-B":96,
  "9-A":83,"9-B":87,"10-A":90,"10-B":89,"11-A":91,"12-A":97,
};

export const events = [
  { d: "28", m: "Jun", t: "Parent–Teacher Meeting", s: "10:00 AM · Main hall" },
  { d: "02", m: "Jul", t: "Science Exhibition",      s: "All day · Classes 6–10" },
  { d: "05", m: "Jul", t: "Unit Test 2 begins",      s: "Timetable on notice board" },
  { d: "15", m: "Aug", t: "Independence Day",         s: "Flag hoisting 8 AM" },
];

export const timetable = [
  ["Mon","Tamil","Maths","English","Science","Social","Computer"],
  ["Tue","Science","Tamil","Maths","English","P.E.","Social"],
  ["Wed","Maths","English","Tamil","Social","Science","Library"],
  ["Thu","English","Science","Social","Maths","Tamil","Computer"],
  ["Fri","Social","Maths","Science","Tamil","English","Games"],
];

export const fees = {
  total: 48000,
  paid: 32000,
  terms: [
    { term: "Term 1 — Tuition",   due: 16000, paid: 16000, date: "12 Apr 2026" },
    { term: "Term 1 — Transport", due: 6000,  paid: 6000,  date: "12 Apr 2026" },
    { term: "Term 2 — Tuition",   due: 16000, paid: 10000, date: "Partial" },
    { term: "Term 2 — Transport", due: 6000,  paid: 0,     date: "Due 30 Jun" },
    { term: "Exam & Lab fee",     due: 4000,  paid: 0,     date: "Due 30 Jun" },
  ],
};

// messaging store (mutable in-memory for the POC)
export const messages = {
  studentFeed: [
    { from: "Principal Office", role: "principal", col: "#34d1bf", time: "2 h ago",
      text: "Half-yearly report cards are now available. PTM on Sat 28 June, 10 AM." },
    { from: "Mr. Saravanan (Class Teacher)", role: "teacher", col: "#ffb454", time: "Yesterday",
      text: "Aarav, please bring your science record book tomorrow." },
  ],
  studentPosts: [
    { from: "Aarav (Student)", role: "student", col: "#9b7bff", time: "3 h ago",
      text: "Sir, I will be absent on Friday for a medical appointment." },
  ],
  teacherInbox: [
    { from: "Principal — Mrs. Lakshmi", role: "principal", col: "#34d1bf", time: "1 h ago", reply: null,
      text: "8-A maths average dropped this term. Can we discuss a plan?" },
  ],
  teacherGeneral: [
    { from: "Principal Office", role: "principal", col: "#34d1bf", time: "4 h ago",
      text: "Staff meeting Friday 4 PM. Marks entry for Half-Yearly closes Thursday." },
  ],
};
