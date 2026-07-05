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

// GET /meta/events -> [{ id, d, m, t, s, event_date }]
router.get("/events", h(async (req, res) => {
  const [rows] = await db.query(
    `SELECT id,
            DATE_FORMAT(event_date,'%d') AS d,
            DATE_FORMAT(event_date,'%b') AS m,
            title AS t, subtitle AS s,
            event_date
     FROM events WHERE school_id = ? ORDER BY event_date DESC`,
    [req.schoolId]
  );
  res.json(rows);
}));

// POST /meta/events — principal posts a circular/announcement
// Body: { title, subtitle, eventDate }
router.post("/events", requireRole(...CAN.MANAGE_META), h(async (req, res) => {
  const { title, subtitle, eventDate } = req.body;
  if (!title || !eventDate) return res.status(400).json({ error: "title and eventDate required" });
  const [r] = await db.query(
    "INSERT INTO events (school_id, title, subtitle, event_date) VALUES (?,?,?,?)",
    [req.schoolId, title.trim(), (subtitle || "").trim(), eventDate]
  );
  res.json({ ok: true, id: r.insertId });
}));

// DELETE /meta/events/:id
router.delete("/events/:id", requireRole(...CAN.MANAGE_META), h(async (req, res) => {
  await db.query(
    "DELETE FROM events WHERE id = ? AND school_id = ?",
    [req.params.id, req.schoolId]
  );
  res.json({ ok: true });
}));

module.exports = router;
