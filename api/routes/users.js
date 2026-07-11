const router = require("express").Router();
const db     = require("../db");
const { h }  = require("../util");
const { requireRole } = require("../auth");

const MANAGE_USERS = ["owner", "principal", "schoolAdmin"];

// GET /users?role=teacher  — list users by role
router.get("/", requireRole(...MANAGE_USERS), h(async (req, res) => {
  const { role } = req.query;
  if (!role) return res.status(400).json({ error: "role query param required" });

  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.status,
            c.id AS class_id, c.name AS class_name
     FROM users u
     LEFT JOIN classes c ON c.class_teacher_id = u.id AND c.school_id = u.school_id
     WHERE u.school_id = ? AND u.role = ?
     ORDER BY c.name, u.name`,
    [req.schoolId, role]
  );
  res.json(rows);
}));

// PUT /users/:id  — update name / phone
router.put("/:id", requireRole(...MANAGE_USERS), h(async (req, res) => {
  const { name, phone } = req.body;
  const sets = [], vals = [];
  if (name  !== undefined) { sets.push("name = ?");  vals.push(name); }
  if (phone !== undefined) { sets.push("phone = ?"); vals.push(phone || null); }
  if (!sets.length) return res.status(400).json({ error: "nothing to update" });
  vals.push(req.params.id, req.schoolId);
  const [r] = await db.query(
    `UPDATE users SET ${sets.join(", ")} WHERE id = ? AND school_id = ?`,
    vals
  );
  res.json({ ok: true, affectedRows: r.affectedRows });
}));

module.exports = router;
