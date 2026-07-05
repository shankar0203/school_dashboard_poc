require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { requireAuth, AUTH_DISABLED } = require("./auth");

const app = express();

// Behind Nginx/ALB — trust the proxy so rate-limit sees real client IPs.
app.set("trust proxy", 1);

// Security headers.
app.use(helmet());

// CORS — restrict to the configured web origin(s) in production.
// CORS_ORIGIN is a comma-separated allow-list; empty/"*" allows all (dev only).
const allowList = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowList.length && !allowList.includes("*") ? allowList : true,
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

// Basic rate limiting to blunt abuse / brute force.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_PER_MIN || 120),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check is public (used by the load balancer).
app.get("/health", async (_req, res) => {
  try {
    const db = require("./db");
    await db.query("SELECT 1");
    res.json({ ok: true, db: "up", auth: AUTH_DISABLED ? "disabled(dev)" : "cognito" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 🔒 Everything below requires a valid Cognito token.
// requireAuth sets req.user, req.role and req.schoolId from the verified JWT.
app.use(requireAuth);

app.use("/students", require("./routes/students"));
app.use("/timetable", require("./routes/timetable"));
app.use("/attendance", require("./routes/attendance"));
app.use("/exams", require("./routes/exams"));
app.use("/marks", require("./routes/marks"));
app.use("/results", require("./routes/results"));
app.use("/messages", require("./routes/messages"));
app.use("/fees", require("./routes/fees"));
app.use("/meta", require("./routes/meta"));

// 404 for anything unmatched.
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Error guard — log server-side, never leak internals to the client.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () =>
  console.log(`API listening on ${port}  (auth: ${AUTH_DISABLED ? "DISABLED — dev only" : "Cognito JWT"})`)
);
