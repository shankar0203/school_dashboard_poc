const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");
const { requireRole, CAN } = require("../auth");

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// GET /timetable?classId=X
// Returns [ { day, subjects: ["Tamil","Maths",...] }, ... ]
router.get("/", h(async (req, res) => {
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ error: "classId required" });

  const [rows] = await db.query(
    `SELECT t.day_of_week AS day, t.period, sub.name AS subject
     FROM timetable t
     JOIN subjects sub ON sub.id = t.subject_id
     WHERE t.class_id = ? AND t.school_id = ?
     ORDER BY FIELD(t.day_of_week,'Mon','Tue','Wed','Thu','Fri'), t.period`,
    [classId, req.schoolId]
  );

  // Group into { Mon: ["Tamil","Maths",...], ... }
  const map = {};
  rows.forEach(({ day, period, subject }) => {
    if (!map[day]) map[day] = [];
    map[day][period - 1] = subject;
  });

  // Return as ordered array
  const schedule = DAY_ORDER
    .filter((d) => map[d])
    .map((d) => ({ day: d, subjects: map[d].filter(Boolean) }));

  res.json(schedule);
}));

// PUT /timetable
// Body: { classId, schedule: [{ day, subjects: ["Tamil","Maths",...] }, ...] }
router.put("/", requireRole(...CAN.MANAGE_META), h(async (req, res) => {
  const { classId, schedule } = req.body;
  if (!classId || !Array.isArray(schedule))
    return res.status(400).json({ error: "classId and schedule[] required" });

  // Load all subjects for this school (to map name -> id)
  const [subs] = await db.query(
    "SELECT id, name FROM subjects WHERE school_id = ?",
    [req.schoolId]
  );
  const subMap = {};
  subs.forEach((s) => { subMap[s.name.toLowerCase()] = s.id; });

  const rows = [];
  schedule.forEach(({ day, subjects }) => {
    subjects.forEach((subName, idx) => {
      const subId = subMap[subName.toLowerCase()];
      if (subId) rows.push([req.schoolId, classId, day, idx + 1, subId]);
    });
  });

  if (!rows.length) return res.status(400).json({ error: "no valid subjects found" });

  // Delete existing and re-insert
  await db.query(
    "DELETE FROM timetable WHERE class_id = ? AND school_id = ?",
    [classId, req.schoolId]
  );
  await db.query(
    "INSERT INTO timetable (school_id, class_id, day_of_week, period, subject_id) VALUES ?",
    [rows]
  );

  res.json({ ok: true, saved: rows.length });
}));

module.exports = router;
