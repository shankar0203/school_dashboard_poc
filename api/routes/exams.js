const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

// GET /exams -> [{ id, name, status }]
router.get("/", h(async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, name, status FROM exams WHERE school_id = ? ORDER BY id",
    [req.schoolId]
  );
  res.json(rows);
}));

module.exports = router;
