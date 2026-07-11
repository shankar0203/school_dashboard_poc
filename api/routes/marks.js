const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");
const { requireRole, CAN, resolveDbUser, assertTeacherClass, getTeacherClassIds } = require("../auth");

// GET /marks?examId=&studentId=  -> [{ subjectId, subject, mark }] (one student)
// Student/parent: studentId must be their own. Teacher: student must be in their class.
router.get("/", h(async (req, res) => {
  const { examId, studentId } = req.query;
  if (!examId || !studentId)
    return res.status(400).json({ error: "examId and studentId required" });

  const { role } = req;

  if (role === "student" || role === "parent") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (!uid) return res.status(403).json({ error: "Account not linked" });
    const [[owned]] = await db.query(
      "SELECT id FROM students WHERE id = ? AND user_id = ? AND school_id = ?",
      [studentId, uid, req.schoolId]
    );
    if (!owned) return res.status(403).json({ error: "You can only view your own marks" });
  }

  if (role === "teacher") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (uid) {
      const classIds = await getTeacherClassIds(db, uid, req.schoolId);
      const [[inClass]] = await db.query(
        "SELECT id FROM students WHERE id = ? AND class_id IN (?) AND school_id = ?",
        [studentId, classIds.length ? classIds : [0], req.schoolId]
      );
      if (!inClass) return res.status(403).json({ error: "Student not in your class" });
    }
  }

  const [rows] = await db.query(
    `SELECT m.subject_id AS subjectId, sub.name AS subject, m.mark
     FROM marks m JOIN subjects sub ON sub.id = m.subject_id
     WHERE m.exam_id = ? AND m.student_id = ?
     ORDER BY m.subject_id`,
    [examId, studentId]
  );
  res.json(rows);
}));

// GET /marks/student/:id  -> all exams for one student (for report card)
// Student/parent: can only fetch their own record.
// Teacher: student must be in their class.
router.get("/student/:id", h(async (req, res) => {
  const targetId = Number(req.params.id);
  const { role } = req;

  if (role === "student" || role === "parent") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (!uid) return res.status(403).json({ error: "Account not linked" });
    const [[owned]] = await db.query(
      "SELECT id FROM students WHERE id = ? AND user_id = ? AND school_id = ?",
      [targetId, uid, req.schoolId]
    );
    if (!owned) return res.status(403).json({ error: "You can only view your own marks" });
  }

  if (role === "teacher") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (uid) {
      const classIds = await getTeacherClassIds(db, uid, req.schoolId);
      const [[inClass]] = await db.query(
        "SELECT id FROM students WHERE id = ? AND class_id IN (?) AND school_id = ?",
        [targetId, classIds.length ? classIds : [0], req.schoolId]
      );
      if (!inClass) return res.status(403).json({ error: "Student not in your class" });
    }
  }

  const [rows] = await db.query(
    `SELECT e.id AS examId, e.name AS examName, e.status,
            sub.name AS subject, m.mark
     FROM exams e
     JOIN exam_subjects es ON es.exam_id = e.id
     JOIN subjects sub ON sub.id = es.subject_id
     LEFT JOIN marks m ON m.exam_id = e.id AND m.student_id = ? AND m.subject_id = sub.id
     WHERE e.school_id = ?
     ORDER BY e.id, sub.id`,
    [targetId, req.schoolId]
  );

  // Group by exam
  const examMap = {};
  rows.forEach(({ examId, examName, status, subject, mark }) => {
    if (!examMap[examId]) examMap[examId] = { examId, examName, status, marks: [] };
    examMap[examId].marks.push({ subject, mark: mark != null ? Number(mark) : null });
  });

  res.json(Object.values(examMap));
}));

// GET /marks/grid?examId=&classId=&subjectId=
//   -> [{ studentId, roll, name, mark }]  (for the marks-entry grid)
// Teacher: classId must be one of their classes.
router.get("/grid", h(async (req, res) => {
  const { examId, classId, subjectId } = req.query;
  if (!examId || !classId || !subjectId)
    return res.status(400).json({ error: "examId, classId, subjectId required" });

  if (req.role === "teacher") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (uid) await assertTeacherClass(db, uid, classId, req.schoolId);
  }

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

// POST /marks/bulk  { examId, subjectId, classId, marks:[{studentId, mark}] }  -> upsert
// Teacher: classId must be one of their classes AND subjectId must be one they teach.
router.post("/bulk", requireRole(...CAN.ENTER_MARKS), h(async (req, res) => {
  const { examId, subjectId, classId, marks } = req.body;
  if (!examId || !subjectId || !Array.isArray(marks))
    return res.status(400).json({ error: "examId, subjectId, marks[] required" });

  if (req.role === "teacher" && classId) {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (uid) await assertTeacherClass(db, uid, classId, req.schoolId);
  }

  // can't enter marks once the exam is locked
  const [[exam]] = await db.query(
    "SELECT status FROM exams WHERE id = ? AND school_id = ?",
    [examId, req.schoolId]
  );
  if (exam && exam.status === "locked")
    return res.status(403).json({ error: "This exam is locked — marks entry is closed." });

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
