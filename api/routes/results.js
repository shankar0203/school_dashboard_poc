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

module.exports = router;
