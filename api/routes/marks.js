const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

// GET /marks?examId=&studentId=  -> [{ subjectId, subject, mark }] (one student)
router.get("/", h(async (req, res) => {
  const { examId, studentId } = req.query;
  if (!examId || !studentId)
    return res.status(400).json({ error: "examId and studentId required" });
  const [rows] = await db.query(
    `SELECT m.subject_id AS subjectId, sub.name AS subject, m.mark
     FROM marks m JOIN subjects sub ON sub.id = m.subject_id
     WHERE m.exam_id = ? AND m.student_id = ?
     ORDER BY m.subject_id`,
    [examId, studentId]
  );
  res.json(rows);
}));

// GET /marks/grid?examId=&classId=&subjectId=
//   -> [{ studentId, roll, name, mark }]  (for the marks-entry grid)
router.get("/grid", h(async (req, res) => {
  const { examId, classId, subjectId } = req.query;
  if (!examId || !classId || !subjectId)
    return res.status(400).json({ error: "examId, classId, subjectId required" });
  const [rows] = await db.query(
    `SELECT s.id AS studentId, s.roll_no AS roll, s.name,
            (SELECT mark FROM marks m
              WHERE m.exam_id = ? AND m.student_id = s.id AND m.subject_id = ?) AS mark
     FROM students s
     WHERE s.class_id = ? AND s.school_id = ?
     ORDER BY s.roll_no`,
    [examId, subjectId, classId, req.schoolId]
  );
  res.json(rows);
}));

// POST /marks/bulk  { examId, subjectId, marks:[{studentId, mark}] }  -> upsert
router.post("/bulk", h(async (req, res) => {
  const { examId, subjectId, marks } = req.body;
  if (!examId || !subjectId || !Array.isArray(marks))
    return res.status(400).json({ error: "examId, subjectId, marks[] required" });

  const valid = marks.filter((m) => m.mark !== "" && m.mark != null && !isNaN(Number(m.mark)));
  if (!valid.length) return res.json({ saved: 0 });

  const rows = valid.map((m) => [req.schoolId, examId, m.studentId, subjectId, Number(m.mark)]);
  await db.query(
    `INSERT INTO marks (school_id, exam_id, student_id, subject_id, mark)
     VALUES ?
     ON DUPLICATE KEY UPDATE mark = VALUES(mark)`,
    [rows]
  );
  res.json({ saved: valid.length });
}));

module.exports = router;
