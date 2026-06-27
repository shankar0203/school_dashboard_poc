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

module.exports = router;
