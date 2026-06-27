const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

// GET /fees?studentId=  -> { total, paid, terms:[{term,due,paid,date}] }
router.get("/", h(async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ error: "studentId required" });
  const [terms] = await db.query(
    `SELECT item AS term, amount_due AS due, amount_paid AS paid,
            COALESCE(DATE_FORMAT(due_date,'%d %b %Y'),'') AS date
     FROM fees WHERE student_id = ? ORDER BY id`,
    [studentId]
  );
  const total = terms.reduce((a, t) => a + Number(t.due), 0);
  const paid = terms.reduce((a, t) => a + Number(t.paid), 0);
  res.json({ total, paid, terms });
}));

module.exports = router;
