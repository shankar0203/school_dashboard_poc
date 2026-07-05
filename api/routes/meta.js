const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");
const { requireRole, CAN } = require("../auth");

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

// POST /meta/subjects { name } -> add a subject (e.g. Hindi). Idempotent on name.
router.post("/subjects", requireRole(...CAN.MANAGE_META), h(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const [[existing]] = await db.query(
    "SELECT id FROM subjects WHERE school_id = ? AND name = ?",
    [req.schoolId, name]
  );
  if (existing) return res.json({ id: existing.id, existed: true });
  const [r] = await db.query(
    "INSERT INTO subjects (school_id, name) VALUES (?,?)",
    [req.schoolId, name]
  );
  res.json({ id: r.insertId });
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
