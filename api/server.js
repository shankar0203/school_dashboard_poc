require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// --- tenant (POC): default to school 1.
// Later: decode the Cognito JWT from the Authorization header and set
// req.schoolId / req.role from it. For now everything is school 1.
app.use((req, _res, next) => {
  req.schoolId = Number(process.env.DEFAULT_SCHOOL_ID || 1);
  next();
});

app.get("/health", async (_req, res) => {
  try {
    const db = require("./db");
    await db.query("SELECT 1");
    res.json({ ok: true, db: "up" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use("/students", require("./routes/students"));
app.use("/attendance", require("./routes/attendance"));
app.use("/exams", require("./routes/exams"));
app.use("/marks", require("./routes/marks"));
app.use("/results", require("./routes/results"));
app.use("/messages", require("./routes/messages"));
app.use("/fees", require("./routes/fees"));
app.use("/meta", require("./routes/meta"));

// basic error guard
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on ${port}`));
