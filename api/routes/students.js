const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");
const { requireRole, CAN, resolveDbUser, assertTeacherClass, getTeacherClassIds } = require("../auth");

// columns a client may set on create/update
const FIELDS = [
  "name", "admission_no", "gender", "dob", "blood_group",
  "student_phone", "student_email", "address",
  "guardian_name", "guardian_relation", "guardian_phone", "guardian_email",
  "admission_date", "notes",
];

// ── Role-scoped list helper ──────────────────────────────────────────────────
// Returns WHERE clauses + args scoped to the logged-in user's role.
// teacher  -> only their assigned classes
// student  -> only their own record
// parent   -> only their linked child's record
// principal/admin/owner -> whole school
async function scopedWhere(req) {
  const where = ["s.school_id = ?"];
  const args  = [req.schoolId];
  const { role } = req;

  if (role === "teacher") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (!uid) return { where, args }; // unlinked teacher — empty result is safe
    const classIds = await getTeacherClassIds(db, uid, req.schoolId);
    if (!classIds.length) {
      where.push("1 = 0"); // teacher exists but teaches no class yet
    } else if (req.query.classId) {
      // honour explicit filter, but only if teacher is allowed
      if (!classIds.map(String).includes(String(req.query.classId))) {
        where.push("1 = 0");
      } else {
        where.push("s.class_id = ?"); args.push(req.query.classId);
      }
    } else if (req.query.class) {
      where.push("c.name = ? AND s.class_id IN (?)"); args.push(req.query.class, classIds);
    } else {
      where.push("s.class_id IN (?)"); args.push(classIds);
    }

  } else if (role === "student") {
    // Student sees only their own record
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    where.push(uid ? "s.user_id = ?" : "1 = 0");
    if (uid) args.push(uid);

  } else if (role === "parent") {
    // Parent sees their linked child only
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    where.push(uid ? "s.user_id = ?" : "1 = 0");
    if (uid) args.push(uid);

  } else {
    // principal / schoolAdmin / owner — full school, honour optional filters
    if (req.query.classId) { where.push("s.class_id = ?"); args.push(req.query.classId); }
    else if (req.query.class) { where.push("c.name = ?"); args.push(req.query.class); }
  }

  return { where, args };
}

// GET /students            -> list scoped to logged-in role
// GET /students?class=8-A  -> scoped + filtered by class name
// GET /students?classId=5  -> scoped + filtered by class id
router.get("/", h(async (req, res) => {
  const { where, args } = await scopedWhere(req);

  const [rows] = await db.query(
    `SELECT s.id, s.roll_no AS roll, s.name, c.name AS cls,
            s.gender, s.guardian_name AS guardian, s.guardian_phone AS phone,
            s.notes AS remarks,
            u.email AS user_email,
            ROUND(COALESCE(AVG(a.status = 'present') * 100, 100)) AS att,
            CASE
              WHEN COALESCE(f.due,0) = 0 THEN 'Paid'
              WHEN f.paid >= f.due      THEN 'Paid'
              WHEN f.paid > 0           THEN 'Partial'
              ELSE 'Pending'
            END AS fee
     FROM students s
     JOIN classes c ON c.id = s.class_id
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN attendance a ON a.student_id = s.id
     LEFT JOIN (SELECT student_id, SUM(amount_due) due, SUM(amount_paid) paid
                FROM fees GROUP BY student_id) f ON f.student_id = s.id
     WHERE ${where.join(" AND ")}
     GROUP BY s.id
     ORDER BY s.roll_no ASC`,
    args
  );
  res.json(rows);
}));

// GET /students/:id  -> full profile — enforces ownership for student/parent/teacher
router.get("/:id", h(async (req, res) => {
  const targetId = Number(req.params.id);
  const { role } = req;

  // Students and parents can only fetch their own record
  if (role === "student" || role === "parent") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (!uid) return res.status(403).json({ error: "Account not linked to a student record" });
    const [[owned]] = await db.query(
      "SELECT id FROM students WHERE id = ? AND user_id = ? AND school_id = ?",
      [targetId, uid, req.schoolId]
    );
    if (!owned) return res.status(403).json({ error: "You can only view your own record" });
  }

  // Teachers can only fetch students in their classes
  if (role === "teacher") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (uid) {
      const classIds = await getTeacherClassIds(db, uid, req.schoolId);
      const [[inClass]] = await db.query(
        "SELECT id FROM students WHERE id = ? AND class_id IN (?) AND school_id = ?",
        [targetId, classIds.length ? classIds : [0], req.schoolId]
      );
      if (!inClass) return res.status(403).json({ error: "This student is not in your class" });
    }
  }

  const [[s]] = await db.query(
    `SELECT s.*, c.name AS class_name,
            ROUND(COALESCE(AVG(a.status = 'present') * 100, 100)) AS attendance_pct
     FROM students s
     JOIN classes c ON c.id = s.class_id
     LEFT JOIN attendance a ON a.student_id = s.id
     WHERE s.id = ? AND s.school_id = ?
     GROUP BY s.id`,
    [req.params.id, req.schoolId]
  );
  if (!s) return res.status(404).json({ error: "student not found" });

  const [[f]] = await db.query(
    "SELECT COALESCE(SUM(amount_due),0) due, COALESCE(SUM(amount_paid),0) paid FROM fees WHERE student_id = ?",
    [req.params.id]
  );
  s.fees = { total: Number(f.due), paid: Number(f.paid), pending: Number(f.due) - Number(f.paid) };
  res.json(s);
}));

// helper: resolve a class name to an id (within this school)
async function classId(schoolId, cls, classIdRaw) {
  if (classIdRaw) return classIdRaw;
  if (!cls) return null;
  const [[c]] = await db.query("SELECT id FROM classes WHERE school_id = ? AND name = ?", [schoolId, cls]);
  return c && c.id;
}

// POST /students  { name, class|classId, roll?, + any FIELDS }
router.post("/", requireRole(...CAN.MANAGE_STUDENTS), h(async (req, res) => {
  const cid = await classId(req.schoolId, req.body.cls || req.body.class, req.body.classId);
  if (!cid) return res.status(400).json({ error: "class or classId required" });
  if (!req.body.name) return res.status(400).json({ error: "name required" });

  let roll = req.body.roll;
  if (!roll) {
    const [[mx]] = await db.query("SELECT COALESCE(MAX(roll_no),0)+1 AS n FROM students WHERE class_id = ?", [cid]);
    roll = mx.n;
  }

  const cols = ["school_id", "class_id", "roll_no"];
  const vals = [req.schoolId, cid, roll];
  FIELDS.forEach((f) => {
    if (req.body[f] !== undefined && req.body[f] !== "") { cols.push(f); vals.push(req.body[f]); }
  });
  const placeholders = cols.map(() => "?").join(",");
  const [r] = await db.query(`INSERT INTO students (${cols.join(",")}) VALUES (${placeholders})`, vals);
  res.json({ id: r.insertId, roll });
}));

// PUT /students/:id  -> update any provided FIELDS (+ class / roll)
router.put("/:id", requireRole(...CAN.MANAGE_STUDENTS), h(async (req, res) => {
  const sets = [];
  const vals = [];

  if (req.body.cls || req.body.class || req.body.classId) {
    const cid = await classId(req.schoolId, req.body.cls || req.body.class, req.body.classId);
    if (cid) { sets.push("class_id = ?"); vals.push(cid); }
  }
  if (req.body.roll !== undefined && req.body.roll !== "") { sets.push("roll_no = ?"); vals.push(req.body.roll); }
  FIELDS.forEach((f) => {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f] === "" ? null : req.body[f]); }
  });
  if (!sets.length) return res.status(400).json({ error: "nothing to update" });

  vals.push(req.params.id, req.schoolId);
  await db.query(`UPDATE students SET ${sets.join(", ")} WHERE id = ? AND school_id = ?`, vals);
  res.json({ ok: true });
}));

module.exports = router;
