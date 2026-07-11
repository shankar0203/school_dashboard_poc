const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");
const { requireRole, CAN, resolveDbUser, getTeacherClassIds } = require("../auth");

// GET /fees?studentId=  -> { total, paid, terms:[{id,term,due,paid,date,receipt}] }
// Students/parents can only fetch their own fees. Teachers can only fetch students in their class.
router.get("/", h(async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ error: "studentId required" });

  const { role } = req;

  if (role === "student" || role === "parent") {
    const uid = await resolveDbUser(db, req.user.sub, req.user.email, req.schoolId);
    if (!uid) return res.status(403).json({ error: "Account not linked" });
    const [[owned]] = await db.query(
      "SELECT id FROM students WHERE id = ? AND user_id = ? AND school_id = ?",
      [studentId, uid, req.schoolId]
    );
    if (!owned) return res.status(403).json({ error: "You can only view your own fees" });
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

  const [terms] = await db.query(
    `SELECT id, item AS term, amount_due AS due, amount_paid AS paid,
            COALESCE(DATE_FORMAT(due_date,'%d %b %Y'),'') AS date,
            COALESCE(receipt_no,'') AS receipt
     FROM fees WHERE student_id = ? ORDER BY id`,
    [studentId]
  );
  const total = terms.reduce((a, t) => a + Number(t.due), 0);
  const paid = terms.reduce((a, t) => a + Number(t.paid), 0);
  res.json({ total, paid, terms });
}));

// POST /fees  { studentId, item, amount_due, due_date? }  -> add a fee item
router.post("/", requireRole(...CAN.MANAGE_FEES), h(async (req, res) => {
  const { studentId, item, amount_due, due_date } = req.body;
  if (!studentId || !item || amount_due == null)
    return res.status(400).json({ error: "studentId, item, amount_due required" });
  const [r] = await db.query(
    `INSERT INTO fees (school_id, student_id, item, amount_due, amount_paid, due_date)
     VALUES (?,?,?,?,0,?)`,
    [req.schoolId, studentId, item, amount_due, due_date || null]
  );
  res.json({ id: r.insertId });
}));

// POST /fees/:id/pay  { amount, receipt? }  -> record a payment (caps at amount_due)
router.post("/:id/pay", requireRole(...CAN.MANAGE_FEES), h(async (req, res) => {
  const { amount, receipt } = req.body;
  if (amount == null) return res.status(400).json({ error: "amount required" });
  await db.query(
    `UPDATE fees
       SET amount_paid = LEAST(amount_due, amount_paid + ?),
           receipt_no  = COALESCE(?, receipt_no)
     WHERE id = ? AND school_id = ?`,
    [amount, receipt || null, req.params.id, req.schoolId]
  );
  res.json({ ok: true });
}));

module.exports = router;
