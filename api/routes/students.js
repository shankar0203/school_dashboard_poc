const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

// GET /students            -> all students (school)
// GET /students?class=8-A  -> students in a class (by class name)
// GET /students?classId=5  -> students in a class (by id)
router.get("/", h(async (req, res) => {
  const where = ["s.school_id = ?"];
  const args = [req.schoolId];
  if (req.query.classId) { where.push("s.class_id = ?"); args.push(req.query.classId); }
  else if (req.query.class) { where.push("c.name = ?"); args.push(req.query.class); }

  const [rows] = await db.query(
    `SELECT s.id, s.roll_no AS roll, s.name, c.name AS cls,
            s.guardian_name AS guardian, s.guardian_phone AS phone,
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
     ORDER BY s.roll_no`,
    args
  );
  res.json(rows);
}));

// POST /students  { name, class | classId, guardian?, phone? }
router.post("/", h(async (req, res) => {
  const { name, cls, classId, guardian, phone } = req.body;
  let cid = classId;
  if (!cid && cls) {
    const [[c]] = await db.query(
      "SELECT id FROM classes WHERE school_id = ? AND name = ?",
      [req.schoolId, cls]
    );
    cid = c && c.id;
  }
  if (!cid) return res.status(400).json({ error: "class or classId required" });

  const [[mx]] = await db.query(
    "SELECT COALESCE(MAX(roll_no),0)+1 AS n FROM students WHERE class_id = ?",
    [cid]
  );
  const [r] = await db.query(
    `INSERT INTO students (school_id, class_id, roll_no, name, guardian_name, guardian_phone)
     VALUES (?,?,?,?,?,?)`,
    [req.schoolId, cid, mx.n, name, guardian || "—", phone || "—"]
  );
  res.json({ id: r.insertId, roll: mx.n });
}));

module.exports = router;
