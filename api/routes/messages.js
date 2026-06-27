const router = require("express").Router();
const db = require("../db");
const { h } = require("../util");

const COLORS = { principal: "#34d1bf", teacher: "#ffb454", student: "#9b7bff", admin: "#34d1bf", parent: "#4ade80" };
const LABEL = {
  principal: "Principal Office", teacher: "Teacher", student: "Student",
};

function shape(m) {
  return {
    id: m.id,
    from: m.sender_name || LABEL[m.sender_role] || m.sender_role,
    role: m.sender_role,
    col: COLORS[m.sender_role] || "#7c5cff",
    time: m.created_at,
    text: m.body,
    reply: m.reply || null,
  };
}

// GET /messages -> { studentFeed, studentPosts, teacherInbox, teacherGeneral }
router.get("/", h(async (req, res) => {
  const [rows] = await db.query(
    `SELECT m.*, u.name AS sender_name,
            (SELECT body FROM messages r WHERE r.parent_id = m.id ORDER BY r.id DESC LIMIT 1) AS reply
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.school_id = ? AND m.parent_id IS NULL
     ORDER BY m.created_at DESC`,
    [req.schoolId]
  );
  const out = { studentFeed: [], studentPosts: [], teacherInbox: [], teacherGeneral: [] };
  rows.forEach((m) => {
    const s = shape(m);
    if (m.audience === "student_broadcast") out.studentFeed.push(s);
    else if (m.audience === "student_post") out.studentPosts.push(s);
    else if (m.audience === "teacher_broadcast") out.teacherGeneral.push(s);
    else if (m.audience === "direct") out.teacherInbox.push(s);
  });
  res.json(out);
}));

// POST /messages  { audience, text, senderRole, senderId?, recipientId?, parentId? }
router.post("/", h(async (req, res) => {
  const { audience, text, senderRole = "student", senderId = null, recipientId = null, parentId = null } = req.body;
  if (!audience || !text) return res.status(400).json({ error: "audience and text required" });
  const [r] = await db.query(
    `INSERT INTO messages (school_id, sender_id, sender_role, audience, recipient_id, parent_id, body)
     VALUES (?,?,?,?,?,?,?)`,
    [req.schoolId, senderId, senderRole, audience, recipientId, parentId, text]
  );
  res.json({ id: r.insertId });
}));

// POST /messages/:id/reply  { text, senderRole? }  -> a reply linked to a message
router.post("/:id/reply", h(async (req, res) => {
  const { text, senderRole = "teacher" } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  const [r] = await db.query(
    `INSERT INTO messages (school_id, sender_id, sender_role, audience, parent_id, body)
     VALUES (?,?,?,?,?,?)`,
    [req.schoolId, null, senderRole, "direct", req.params.id, text]
  );
  res.json({ id: r.insertId });
}));

module.exports = router;
