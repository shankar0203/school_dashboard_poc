// ===========================================================================
//  AUTH — Cognito JWT verification + role/tenant enforcement
// ---------------------------------------------------------------------------
//  Every request (except /health) must carry a valid Cognito ID token:
//      Authorization: Bearer <idToken>
//
//  From the verified token we derive:
//    req.user     -> { sub, email, groups }
//    req.role     -> app role (owner|principal|schoolAdmin|teacher|parent|student)
//    req.schoolId -> tenant, from the token's `custom:school_id` claim
//
//  This is the security boundary the POC was missing: the API no longer
//  trusts the client for identity, role, or tenant.
// ===========================================================================
const { CognitoJwtVerifier } = require("aws-jwt-verify");

const PROD = process.env.NODE_ENV === "production";

// Dev-only escape hatch so the app runs locally without Cognito wired up.
// HARD FAIL if someone tries to disable auth in production.
const AUTH_DISABLED = process.env.AUTH_DISABLED === "true";
if (AUTH_DISABLED && PROD) {
  throw new Error("AUTH_DISABLED=true is not allowed when NODE_ENV=production");
}

// -------------------------------------------------------------------------
//  Cognito group -> app role  (mirrors src/lib/auth.js on the frontend)
// -------------------------------------------------------------------------
const ROLE_PRECEDENCE = ["owner", "principal", "schoolAdmin", "teacher", "parent", "student", "guest"];

const GROUP_TO_ROLE = {
  owner: "owner",
  principal: "principal",
  schoolAdmin: "schoolAdmin",
  "school-admin": "schoolAdmin",
  teacher: "teacher",
  parent: "parent",
  student: "student",
  guest: "guest",
  // vidyam-prefixed Cognito groups (from the CloudFormation template)
  "vidyam-leadership": "owner",
  "vidyam-principal": "principal",
  "vidyam-school-admin": "schoolAdmin",
  "vidyam-teacher": "teacher",
  "vidyam-parent": "parent",
  "vidyam-student": "student",
  "vidyam-guest": "guest",
};

function roleFromGroups(groups = []) {
  const roles = groups.map((g) => GROUP_TO_ROLE[g]).filter(Boolean);
  return ROLE_PRECEDENCE.find((r) => roles.includes(r)) || null;
}

// -------------------------------------------------------------------------
//  Verifier — created once, caches the Cognito JWKS in memory.
// -------------------------------------------------------------------------
let verifier = null;
if (!AUTH_DISABLED) {
  if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
    throw new Error(
      "COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set (or set AUTH_DISABLED=true for local dev)"
    );
  }
  verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    tokenUse: "id", // we need `custom:school_id`, which only the ID token carries
    clientId: process.env.COGNITO_CLIENT_ID,
  });
}

function bearer(req) {
  const hdr = req.headers.authorization || "";
  return hdr.startsWith("Bearer ") ? hdr.slice(7).trim() : null;
}

// -------------------------------------------------------------------------
//  requireAuth — verify the token, populate req.user/role/schoolId
// -------------------------------------------------------------------------
async function requireAuth(req, res, next) {
  // Local-dev bypass: behave as a full-access owner for a single school.
  if (AUTH_DISABLED) {
    req.user = { sub: "dev", email: "dev@local", groups: ["owner"] };
    req.role = "owner";
    req.schoolId = Number(process.env.DEFAULT_SCHOOL_ID || 1);
    return next();
  }

  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  let payload;
  try {
    payload = await verifier.verify(token);
  } catch (_e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const groups = payload["cognito:groups"] || [];
  const role = roleFromGroups(groups);
  if (!role) return res.status(403).json({ error: "No role assigned to this account" });

  // Tenant comes from the token, never the client. Fall back to the default
  // school only in single-tenant deployments where the claim isn't set.
  const claimedSchool = payload["custom:school_id"];
  const schoolId = Number(claimedSchool != null ? claimedSchool : process.env.DEFAULT_SCHOOL_ID || 1);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    return res.status(403).json({ error: "Account is not linked to a school" });
  }

  req.user = { sub: payload.sub, email: payload.email || payload["cognito:username"] || "", groups };
  req.role = role;
  req.schoolId = schoolId;
  next();
}

// -------------------------------------------------------------------------
//  requireRole — allow only the listed roles (use the named sets below)
// -------------------------------------------------------------------------
const requireRole = (...allowed) => (req, res, next) => {
  if (!req.role || !allowed.includes(req.role)) {
    return res.status(403).json({ error: "You don't have permission to do that" });
  }
  next();
};

// Named permission sets — keep write policy in one place.
const CAN = {
  MANAGE_STUDENTS: ["owner", "principal", "schoolAdmin"],
  ENTER_MARKS: ["owner", "principal", "teacher"],
  MARK_ATTENDANCE: ["owner", "principal", "teacher"],
  MANAGE_EXAMS: ["owner", "principal", "schoolAdmin"],
  MANAGE_FEES: ["owner", "principal", "schoolAdmin"],
  MANAGE_META: ["owner", "principal", "schoolAdmin"],
};

// -------------------------------------------------------------------------
//  resolveDbUser — get the DB users.id for the current request's sub.
//  Returns null if not found. Call once per route that needs the DB user id.
// -------------------------------------------------------------------------
async function resolveDbUser(db, sub, email, schoolId) {
  // Fast path: match by cognito_sub
  let [[u]] = await db.query(
    "SELECT id FROM users WHERE cognito_sub = ? AND school_id = ?",
    [sub, schoolId]
  );
  if (u) return u.id;

  // Fallback: match by email (admin pre-seeded before first login)
  const cleanEmail = (email || "").trim().toLowerCase();
  if (cleanEmail) {
    [[u]] = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = ? AND school_id = ?",
      [cleanEmail, schoolId]
    );
    if (u) {
      // Store sub for next time
      await db.query("UPDATE users SET cognito_sub = ? WHERE id = ?", [sub, u.id]);
      return u.id;
    }
  }
  return null;
}

// -------------------------------------------------------------------------
//  assertTeacherClass — 403 if this teacher doesn't teach the given class.
//  Pass req.teacherUserId (set by resolveDbUser) and the classId to check.
// -------------------------------------------------------------------------
async function assertTeacherClass(db, teacherUserId, classId, schoolId) {
  const [[row]] = await db.query(
    `SELECT 1 FROM teacher_subject_class
     WHERE teacher_id = ? AND class_id = ? AND school_id = ?
     UNION
     SELECT 1 FROM classes
     WHERE class_teacher_id = ? AND id = ? AND school_id = ?
     LIMIT 1`,
    [teacherUserId, classId, schoolId, teacherUserId, classId, schoolId]
  );
  if (!row) {
    const err = new Error("You are not assigned to this class");
    err.status = 403;
    throw err;
  }
}

// -------------------------------------------------------------------------
//  getTeacherClassIds — returns [classId, ...] the teacher is allowed to see
// -------------------------------------------------------------------------
async function getTeacherClassIds(db, teacherUserId, schoolId) {
  const [rows] = await db.query(
    `SELECT DISTINCT c.id
     FROM teacher_subject_class tsc JOIN classes c ON c.id = tsc.class_id
     WHERE tsc.teacher_id = ? AND tsc.school_id = ?
     UNION
     SELECT id FROM classes WHERE class_teacher_id = ? AND school_id = ?`,
    [teacherUserId, schoolId, teacherUserId, schoolId]
  );
  return rows.map((r) => r.id);
}

module.exports = {
  requireAuth, requireRole, roleFromGroups, CAN, AUTH_DISABLED,
  resolveDbUser, assertTeacherClass, getTeacherClassIds,
};
