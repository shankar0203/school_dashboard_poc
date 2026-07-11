const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");
const { requireRole, CAN, resolveDbUser, assertTeacherClass, getTeacherClassIds } = require("../auth");

// GET /attendance/classwise -> { "8-A": 92, "9-A": 83, ... }
// Teacher: scoped to their classes only. Principal/admin/owner: full school.
router.get("/classwise", h(async (req, res) => {
  let classFilter = "";
  const args = [req.schoolId];

  if (req.role === "teacher") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (uid) {
      const classIds = await getTeacherClassIds(db, uid, req.schoolId);
      if (classIds.length) { classFilter = " AND a.class_id IN (?)"; args.push(classIds); }
      else { return res.json({}); }
    }
  }

  const [rows] = await db.query(
    `SELECT c.name AS cls, ROUND(AVG(a.status = 'present') * 100) AS pct
     FROM attendance a JOIN classes c ON c.id = a.class_id
     WHERE a.school_id = ?${classFilter}
     GROUP BY c.id ORDER BY c.name`,
    args
  );
  const out = {};
  rows.forEach((r) => { out[r.cls] = Number(r.pct); });
  res.json(out);
}));

// GET /attendance/student/:id -> [{ date, status }]
// Students/parents can only fetch their own record.
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
    if (!owned) return res.status(403).json({ error: "You can only view your own attendance" });
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
    `SELECT DATE_FORMAT(att_date,'%Y-%m-%d') AS date, status
     FROM attendance WHERE student_id = ? ORDER BY att_date`,
    [targetId]
  );
  res.json(rows);
}));

// GET /attendance/by-date?classId=&date=YYYY-MM-DD
// Teacher: classId must be one of their classes.
router.get("/by-date", h(async (req, res) => {
  const { classId, date } = req.query;
  if (!classId || !date) return res.status(400).json({ error: "classId and date required" });

  if (req.role === "teacher") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (uid) await assertTeacherClass(db, uid, classId, req.schoolId);
  }

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
// Teacher: classId must be one of their classes.
router.post("/", requireRole(...CAN.MARK_ATTENDANCE), h(async (req, res) => {
  const { classId, date, records } = req.body;
  if (!classId || !date || !Array.isArray(records))
    return res.status(400).json({ error: "classId, date, records[] required" });

  if (req.role === "teacher") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (uid) await assertTeacherClass(db, uid, classId, req.schoolId);
  }

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
