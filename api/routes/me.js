// ===========================================================================
//  GET /me  — returns the logged-in user's full context
//  Called once after login; frontend caches the result in React context.
//
//  Response shape per role:
//    teacher  → { role, userId, name, email, classId, className, subjects[] }
//    student  → { role, userId, name, email, studentId, classId, className, roll }
//    parent   → { role, userId, name, email, studentId, classId, className, roll, childName }
//    principal/admin/owner → { role, userId, name, email, schoolId, schoolName }
// ===========================================================================
const router = require("express").Router();
const db     = require("../db");
const { h }  = require("../util");
const { requireRole, CAN } = require("../auth");

router.get("/", h(async (req, res) => {
  const { sub, email } = req.user;
  const { role, schoolId } = req;

  // Look up the users row by cognito_sub
  const [[u]] = await db.query(
    "SELECT id, name, email, phone FROM users WHERE cognito_sub = ? AND school_id = ?",
    [sub, schoolId]
  );

  if (!u) {
    // User is authenticated with Cognito but not yet linked in the DB.
    // Return minimal context so the frontend can prompt the admin to link them.
    return res.json({ role, schoolId, linked: false, cognitoEmail: email });
  }

  const base = { role, schoolId, linked: true, userId: u.id, name: u.name, email: u.email || email };

  // ── Teacher ─────────────────────────────────────────────────────────────
  if (role === "teacher") {
    // Primary class (class_teacher_id = this user)
    const [[cls]] = await db.query(
      "SELECT id, name FROM classes WHERE class_teacher_id = ? AND school_id = ?",
      [u.id, schoolId]
    );
    // Subjects they teach (any class)
    const [subs] = await db.query(
      `SELECT DISTINCT s.id, s.name, c.name AS class_name
       FROM teacher_subject_class tsc
       JOIN subjects s ON s.id = tsc.subject_id
       JOIN classes  c ON c.id = tsc.class_id
       WHERE tsc.teacher_id = ? AND tsc.school_id = ?`,
      [u.id, schoolId]
    );
    return res.json({
      ...base,
      classId:   cls ? cls.id   : null,
      className: cls ? cls.name : null,
      subjects:  subs,
    });
  }

  // ── Student or Parent ────────────────────────────────────────────────────
  if (role === "student" || role === "parent") {
    const [[stu]] = await db.query(
      `SELECT s.id, s.name, s.roll_no, s.class_id, c.name AS class_name
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.user_id = ? AND s.school_id = ?`,
      [u.id, schoolId]
    );
    if (!stu) {
      return res.json({ ...base, linked: false, reason: "No student record linked to this account yet." });
    }
    return res.json({
      ...base,
      studentId: stu.id,
      childName: stu.name,        // useful for parent view
      roll:      stu.roll_no,
      classId:   stu.class_id,
      className: stu.class_name,
    });
  }

  // ── Principal / Admin / Owner ────────────────────────────────────────────
  const [[school]] = await db.query("SELECT name FROM schools WHERE id = ?", [schoolId]);
  return res.json({ ...base, schoolName: school ? school.name : null });
}));

// ===========================================================================
//  POST /me/link  — admin assigns a Cognito user to a student record
//  Body: { cognitoEmail, studentId }
//  Only principal / schoolAdmin can do this.
// ===========================================================================
router.post("/link", requireRole(...CAN.MANAGE_STUDENTS), h(async (req, res) => {
  const { cognitoEmail, studentId, role: targetRole = "student" } = req.body;
  if (!cognitoEmail || !studentId) return res.status(400).json({ error: "cognitoEmail and studentId required" });

  // 1. Find or create the users row for this Cognito email
  let [[u]] = await db.query(
    "SELECT id FROM users WHERE email = ? AND school_id = ?",
    [cognitoEmail.trim().toLowerCase(), req.schoolId]
  );
  if (!u) {
    const [r] = await db.query(
      "INSERT INTO users (school_id, role, name, email, status) VALUES (?,?,?,?,'active')",
      [req.schoolId, targetRole, cognitoEmail.trim(), cognitoEmail.trim().toLowerCase()]
    );
    u = { id: r.insertId };
  }

  // 2. Link the student record to this users row
  await db.query(
    "UPDATE students SET user_id = ? WHERE id = ? AND school_id = ?",
    [u.id, studentId, req.schoolId]
  );

  res.json({ ok: true, userId: u.id, studentId });
}));

// POST /me/link-teacher  — assign a teacher user to a class
// Body: { cognitoEmail, classId }
router.post("/link-teacher", requireRole(...CAN.MANAGE_STUDENTS), h(async (req, res) => {
  const { cognitoEmail, classId } = req.body;
  if (!cognitoEmail || !classId) return res.status(400).json({ error: "cognitoEmail and classId required" });

  let [[u]] = await db.query(
    "SELECT id FROM users WHERE email = ? AND school_id = ?",
    [cognitoEmail.trim().toLowerCase(), req.schoolId]
  );
  if (!u) {
    const [r] = await db.query(
      "INSERT INTO users (school_id, role, name, email, status) VALUES (?,'teacher',?,?,'active')",
      [req.schoolId, cognitoEmail.trim(), cognitoEmail.trim().toLowerCase()]
    );
    u = { id: r.insertId };
  }

  await db.query(
    "UPDATE classes SET class_teacher_id = ? WHERE id = ? AND school_id = ?",
    [u.id, classId, req.schoolId]
  );

  res.json({ ok: true, userId: u.id, classId });
}));

// POST /me/set-cognito-sub  — called after first login to store the Cognito sub
// Body: { cognitoSub }  (frontend passes req.user.sub after auth)
router.post("/set-sub", h(async (req, res) => {
  const { sub } = req.user;
  const email = (req.user.email || "").toLowerCase();
  if (!sub) return res.status(400).json({ error: "no sub in token" });

  await db.query(
    "UPDATE users SET cognito_sub = ? WHERE (email = ? OR cognito_sub = ?) AND school_id = ?",
    [sub, email, sub, req.schoolId]
  );
  res.json({ ok: true });
}));

// POST /me/unlink  — remove student → user link
// Body: { studentId }
router.post("/unlink", requireRole(...CAN.MANAGE_STUDENTS), h(async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: "studentId required" });
  await db.query(
    "UPDATE students SET user_id = NULL WHERE id = ? AND school_id = ?",
    [studentId, req.schoolId]
  );
  res.json({ ok: true });
}));

module.exports = router;
