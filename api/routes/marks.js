const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

// GET /marks?examId=&studentId=  -> [{ subjectId, subject, mark }] (subject order)
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

module.exports = router;
