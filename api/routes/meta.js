const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

// GET /meta/classes  -> [{ id, name }]
router.get("/classes", h(async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, name FROM classes WHERE school_id = ? ORDER BY name",
    [req.schoolId]
  );
  res.json(rows);
}));

// GET /meta/subjects -> [{ id, name }]
router.get("/subjects", h(async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, name FROM subjects WHERE school_id = ? ORDER BY id",
    [req.schoolId]
  );
  res.json(rows);
}));

// GET /meta/events -> [{ d, m, t, s }]  (matches the UI event card)
router.get("/events", h(async (req, res) => {
  const [rows] = await db.query(
    `SELECT DATE_FORMAT(event_date,'%d') AS d,
            DATE_FORMAT(event_date,'%b') AS m,
            title AS t, subtitle AS s
     FROM events WHERE school_id = ? ORDER BY event_date`,
    [req.schoolId]
  );
  res.json(rows);
}));

module.exports = router;
