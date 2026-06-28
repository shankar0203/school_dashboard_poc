const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

// GET /exams -> [{ id, name, status }]
router.get("/", h(async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, name, status FROM exams WHERE school_id = ? ORDER BY id",
    [req.schoolId]
  );
  res.json(rows);
}));

// POST /exams  { name, subjectIds:[...] }  -> create exam + its subjects
router.post("/", h(async (req, res) => {
  const { name, subjectIds } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const [r] = await db.query(
    "INSERT INTO exams (school_id, name, status) VALUES (?,?, 'open')",
    [req.schoolId, name]
  );
  const examId = r.insertId;
  let ids = Array.isArray(subjectIds) ? subjectIds : [];
  if (!ids.length) {
    const [subs] = await db.query("SELECT id FROM subjects WHERE school_id = ? LIMIT 5", [req.schoolId]);
    ids = subs.map((s) => s.id);
  }
  if (ids.length) {
    const rows = ids.map((sid) => [examId, sid, 100]);
    await db.query("INSERT INTO exam_subjects (exam_id, subject_id, max_mark) VALUES ?", [rows]);
  }
  res.json({ id: examId });
}));

module.exports = router;
