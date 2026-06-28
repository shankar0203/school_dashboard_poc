const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

const PASS = 35; // pass mark

// GET /results/summary?examId=
//   -> { appeared, avg, passRate, distinctions, classes:[{cls,avg,pass}] }
router.get("/summary", h(async (req, res) => {
  const { examId } = req.query;
  if (!examId) return res.status(400).json({ error: "examId required" });

  // per-class averages (avg of each student's average across subjects)
  const [classes] = await db.query(
    `SELECT c.name AS cls,
            ROUND(AVG(sm.avg_mark)) AS avg,
            ROUND(AVG(sm.avg_mark >= ?) * 100) AS pass
     FROM (
       SELECT m.student_id, AVG(m.mark) AS avg_mark
       FROM marks m WHERE m.exam_id = ? AND m.school_id = ?
       GROUP BY m.student_id
     ) sm
     JOIN students s ON s.id = sm.student_id
     JOIN classes c ON c.id = s.class_id
     GROUP BY c.id ORDER BY c.name`,
    [PASS, examId, req.schoolId]
  );

  const [[overall]] = await db.query(
    `SELECT COUNT(*) AS appeared, ROUND(AVG(avg_mark)) AS avg,
            ROUND(AVG(avg_mark >= ?) * 100) AS passRate,
            SUM(avg_mark >= 75) AS distinctions
     FROM (SELECT student_id, AVG(mark) AS avg_mark FROM marks
           WHERE exam_id = ? AND school_id = ? GROUP BY student_id) t`,
    [PASS, examId, req.schoolId]
  );

  res.json({
    appeared: overall ? Number(overall.appeared) : 0,
    avg: overall ? Number(overall.avg || 0) : 0,
    passRate: overall ? Number(overall.passRate || 0) : 0,
    distinctions: overall ? Number(overall.distinctions || 0) : 0,
    classes,
  });
}));

// GET /results/class?examId=&classId=
//   -> [{ studentId, roll, name, avg, fails }]  ordered by most failed subjects
router.get("/class", h(async (req, res) => {
  const { examId, classId } = req.query;
  if (!examId || !classId) return res.status(400).json({ error: "examId and classId required" });
  const [rows] = await db.query(
    `SELECT s.id AS studentId, s.roll_no AS roll, s.name,
            ROUND(AVG(m.mark)) AS avg,
            COALESCE(SUM(m.mark < ?), 0) AS fails
     FROM students s
     LEFT JOIN marks m ON m.student_id = s.id AND m.exam_id = ?
     WHERE s.class_id = ? AND s.school_id = ?
     GROUP BY s.id
     ORDER BY fails DESC, avg ASC`,
    [PASS, examId, classId, req.schoolId]
  );
  res.json(rows.map((r) => ({ ...r, avg: r.avg == null ? null : Number(r.avg), fails: Number(r.fails) })));
}));

module.exports = router;
