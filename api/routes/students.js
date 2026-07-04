const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

// columns a client may set on create/update
const FIELDS = [
  "name", "admission_no", "gender", "dob", "blood_group",
  "student_phone", "student_email", "address",
  "guardian_name", "guardian_relation", "guardian_phone", "guardian_email",
  "admission_date", "notes",
];

// GET /students            -> all students (school)
// GET /students?class=8-A  -> students in a class (by name)
// GET /students?classId=5  -> students in a class (by id)
router.get("/", h(async (req, res) => {
  const where = ["s.school_id = ?"];
  const args = [req.schoolId];
  if (req.query.classId) { where.push("s.class_id = ?"); args.push(req.query.classId); }
  else if (req.query.class) { where.push("c.name = ?"); args.push(req.query.class); }

  const [rows] = await db.query(
    `SELECT s.id, s.roll_no AS roll, s.name, c.name AS cls,
            s.gender, s.guardian_name AS guardian, s.guardian_phone AS phone,
            ROUND(COALESCE(AVG(a.status = 'present') * 100, 100)) AS att,
            CASE
              WHEN COALESCE(f.due,0) = 0 THEN 'Paid'
              WHEN f.paid >= f.due      THEN 'Paid'
              WHEN f.paid > 0           THEN 'Partial'
              ELSE 'Pending'
            END AS fee
     FROM students s
     JOIN classes c ON c.id = s.class_id
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

// GET /students/:id  -> full profile (all fields + class name + attendance% + fee summary)
router.get("/:id", h(async (req, res) => {
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
router.post("/", h(async (req, res) => {
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
router.put("/:id", h(async (req, res) => {
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
