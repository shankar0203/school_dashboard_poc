const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

// GET /attendance/classwise -> { "8-A": 92, "9-A": 83, ... }
router.get("/classwise", h(async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.name AS cls, ROUND(AVG(a.status = 'present') * 100) AS pct
     FROM attendance a JOIN classes c ON c.id = a.class_id
     WHERE a.school_id = ?
     GROUP BY c.id ORDER BY c.name`,
    [req.schoolId]
  );
  const out = {};
  rows.forEach((r) => { out[r.cls] = Number(r.pct); });
  res.json(out);
}));

// GET /attendance/student/:id -> [{ date, status }]  (raw days, UI builds the calendar)
router.get("/student/:id", h(async (req, res) => {
  const [rows] = await db.query(
    `SELECT DATE_FORMAT(att_date,'%Y-%m-%d') AS date, status
     FROM attendance WHERE student_id = ? ORDER BY att_date`,
    [req.params.id]
  );
  res.json(rows);
}));

// GET /attendance/by-date?classId=&date=YYYY-MM-DD
//   -> [{ studentId, roll, name, status }]  (status null if not yet marked)
router.get("/by-date", h(async (req, res) => {
  const { classId, date } = req.query;
  if (!classId || !date) return res.status(400).json({ error: "classId and date required" });
  const [rows] = await db.query(
    `SELECT s.id AS studentId, s.roll_no AS roll, s.name,
            (SELECT status FROM attendance a
              WHERE a.student_id = s.id AND a.att_date = ?) AS status
     FROM students s
     WHERE s.class_id = ? AND s.school_id = ?
     ORDER BY s.roll_no`,
    [date, classId, req.schoolId]
  );
  res.json(rows);
}));

// POST /attendance  { classId, date, records:[{studentId, status}] }  -> upsert a day
router.post("/", h(async (req, res) => {
  const { classId, date, records } = req.body;
  if (!classId || !date || !Array.isArray(records))
    return res.status(400).json({ error: "classId, date, records[] required" });
  const valid = records.filter((r) => ["present", "absent", "late"].includes(r.status));
  if (!valid.length) return res.json({ saved: 0 });

  const rows = valid.map((r) => [req.schoolId, r.studentId, classId, date, r.status]);
  await db.query(
    `INSERT INTO attendance (school_id, student_id, class_id, att_date, status)
     VALUES ?
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [rows]
  );
  res.json({ saved: valid.length });
}));

module.exports = router;
