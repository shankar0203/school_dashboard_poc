// ===========================================================================
//  INTEGRATION TESTS — Role-Based Access Control
//  Run on EC2: node tests/integration.cjs
//
//  Covers:
//    ✅ Principal  — full access to all 300 students + all classes
//    ✅ Teacher    — scoped to own class only (6-A, 8-A, 10-A tested)
//    ✅ Student    — own record only, 403 on everything else
//
//  Prereqs:
//    - api/.env must have COGNITO_CLIENT_ID, COGNITO_USER_POOL_ID, PORT
//    - All test users must exist in Cognito with password set
//    - TEST_PASSWORD env var (default: Vidyam@2025!)
// ===========================================================================

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// ── load .env ─────────────────────────────────────────────────────────────────
const envFile = path.join(__dirname, '../api/.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const REGION    = process.env.AWS_REGION || 'us-east-1';
const API       = `http://localhost:${process.env.PORT || 4000}`;
const PW        = process.env.TEST_PASSWORD || 'Vidyam@2025!';

if (!CLIENT_ID) { console.error('❌ COGNITO_CLIENT_ID not set in api/.env'); process.exit(1); }

// ── colours ───────────────────────────────────────────────────────────────────
const G = s => `\x1b[32m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const B = s => `\x1b[34m${s}\x1b[0m`;
const D = s => `\x1b[90m${s}\x1b[0m`;

// ── counters ──────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, total = 0;
const failures = [];

// ── assert helpers ────────────────────────────────────────────────────────────
function assert(name, cond, detail = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ${G('✓')} ${name}`);
  } else {
    failed++;
    const msg = `${name}${detail ? ' — ' + detail : ''}`;
    failures.push(msg);
    console.log(`  ${R('✗')} ${msg}`);
  }
}

function assertStatus(name, res, expected) {
  assert(name, res.status === expected,
    `expected ${expected}, got ${res.status} ${JSON.stringify(res.body).slice(0, 80)}`);
}

function assertCount(name, res, min, max) {
  const arr = Array.isArray(res.body) ? res.body : [];
  const ok = arr.length >= min && arr.length <= max;
  assert(name, ok, `expected ${min}-${max} items, got ${arr.length}`);
}

function assertExact(name, res, count) {
  const arr = Array.isArray(res.body) ? res.body : [];
  assert(name, arr.length === count, `expected ${count}, got ${arr.length}`);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function request(method, url, token, body) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = lib.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers },
      res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const GET  = (url, token)       => request('GET',  url, token);
const POST = (url, token, body) => request('POST', url, token, body);

// ── Cognito auth ──────────────────────────────────────────────────────────────
function getToken(email, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    });
    const req = https.request({
      hostname: `cognito-idp.${REGION}.amazonaws.com`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AmazonCognitoIdentityProviderService.InitiateAuth',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const p = JSON.parse(data);
        if (p.AuthenticationResult) resolve(p.AuthenticationResult.IdToken);
        else reject(new Error(p.message || p.__type || JSON.stringify(p)));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── section header ────────────────────────────────────────────────────────────
function section(title) {
  console.log(`\n${B('━━━')} ${Y(title)} ${B('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TEST DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Student IDs per class (20 per class, ordered 6-A first):
// class_id=1  (6-A):  student_id  1–20
// class_id=2  (6-B):  student_id 21–40
// class_id=7  (8-A):  student_id 121–140
// class_id=13 (10-A): student_id 241–260

async function testPrincipal(token) {
  section('PRINCIPAL — full school access');

  const me = await GET(`${API}/api/me`, token);
  assert('GET /me → role=principal', me.body.role === 'principal', me.body.role);

  const students = await GET(`${API}/api/students`, token);
  assertCount('GET /students → all 300 students', students, 295, 305);

  const cls6A = await GET(`${API}/api/students?classId=1`, token);
  assertExact('GET /students?classId=1 → exactly 20', cls6A, 20);

  const cls8A = await GET(`${API}/api/students?classId=7`, token);
  assertExact('GET /students?classId=7 → exactly 20', cls8A, 20);

  const cls10A = await GET(`${API}/api/students?classId=13`, token);
  assertExact('GET /students?classId=13 → exactly 20', cls10A, 20);

  const s1 = await GET(`${API}/api/students/1`, token);
  assertStatus('GET /students/1 → 200', s1, 200);

  const s200 = await GET(`${API}/api/students/200`, token);
  assertStatus('GET /students/200 → 200', s200, 200);

  const att = await GET(`${API}/api/attendance/classwise`, token);
  assert('GET /attendance/classwise → 15 classes',
    typeof att.body === 'object' && Object.keys(att.body).length === 15,
    `got ${Object.keys(att.body || {}).length} classes`);

  const byDate = await GET(`${API}/api/attendance/by-date?classId=1&date=2025-06-05`, token);
  assertCount('GET /attendance/by-date class 1 → 20 students', byDate, 20, 20);

  const marksGrid = await GET(`${API}/api/marks/grid?examId=1&classId=1&subjectId=1`, token);
  assertCount('GET /marks/grid → 20 rows', marksGrid, 20, 20);

  const fees = await GET(`${API}/api/fees?studentId=1`, token);
  assertStatus('GET /fees?studentId=1 → 200', fees, 200);
}

async function testTeacher(token, label, myClassId, myStudentId, otherClassId, otherStudentId) {
  section(`TEACHER — ${label} (class_id=${myClassId}, student_id=${myStudentId})`);

  const me = await GET(`${API}/api/me`, token);
  assert(`GET /me → role=teacher`, me.body.role === 'teacher', me.body.role);
  assert(`GET /me → classId=${myClassId}`, me.body.classId === myClassId,
    `got ${me.body.classId}`);
  assert('GET /me → classIds[] populated', Array.isArray(me.body.classIds) && me.body.classIds.length > 0,
    JSON.stringify(me.body.classIds));

  // own class — should work
  const own = await GET(`${API}/api/students?classId=${myClassId}`, token);
  assertExact(`GET /students?classId=${myClassId} → 20 students`, own, 20);

  // other class filtered out — scopedWhere returns empty, not 403
  const other = await GET(`${API}/api/students?classId=${otherClassId}`, token);
  assertExact(`GET /students?classId=${otherClassId} → 0 (blocked)`, other, 0);

  // no filter — only own class returned
  const all = await GET(`${API}/api/students`, token);
  assertExact(`GET /students (no filter) → 20 own class only`, all, 20);

  // own student detail
  const sOwn = await GET(`${API}/api/students/${myStudentId}`, token);
  assertStatus(`GET /students/${myStudentId} (own class) → 200`, sOwn, 200);

  // other student — 403
  const sOther = await GET(`${API}/api/students/${otherStudentId}`, token);
  assertStatus(`GET /students/${otherStudentId} (other class) → 403`, sOther, 403);

  // attendance classwise — own class only
  const attCW = await GET(`${API}/api/attendance/classwise`, token);
  assert('GET /attendance/classwise → own class only',
    typeof attCW.body === 'object' && Object.keys(attCW.body).length === 1,
    `got ${Object.keys(attCW.body || {}).length} entries`);

  // attendance by date — own class
  const attOwn = await GET(`${API}/api/attendance/by-date?classId=${myClassId}&date=2025-06-05`, token);
  assertCount(`GET /attendance/by-date own class → 20`, attOwn, 20, 20);

  // attendance by date — other class → 403
  const attOther = await GET(`${API}/api/attendance/by-date?classId=${otherClassId}&date=2025-06-05`, token);
  assertStatus(`GET /attendance/by-date other class → 403`, attOther, 403);

  // attendance for own student
  const attStu = await GET(`${API}/api/attendance/student/${myStudentId}`, token);
  assertStatus(`GET /attendance/student/${myStudentId} (own) → 200`, attStu, 200);

  // attendance for other student → 403
  const attStuOther = await GET(`${API}/api/attendance/student/${otherStudentId}`, token);
  assertStatus(`GET /attendance/student/${otherStudentId} (other) → 403`, attStuOther, 403);

  // marks grid — own class
  const mgOwn = await GET(`${API}/api/marks/grid?examId=1&classId=${myClassId}&subjectId=1`, token);
  assertCount(`GET /marks/grid own class → 20`, mgOwn, 20, 20);

  // marks grid — other class → 403
  const mgOther = await GET(`${API}/api/marks/grid?examId=1&classId=${otherClassId}&subjectId=1`, token);
  assertStatus(`GET /marks/grid other class → 403`, mgOther, 403);

  // marks for own student
  const mOwn = await GET(`${API}/api/marks/student/${myStudentId}`, token);
  assertStatus(`GET /marks/student/${myStudentId} (own) → 200`, mOwn, 200);

  // marks for other student → 403
  const mOther = await GET(`${API}/api/marks/student/${otherStudentId}`, token);
  assertStatus(`GET /marks/student/${otherStudentId} (other) → 403`, mOther, 403);

  // POST attendance — own class (no actual records, just check auth passes)
  const postOwn = await POST(`${API}/api/attendance`, token,
    { classId: myClassId, date: '2025-07-01', records: [{ studentId: myStudentId, status: 'present' }] });
  assert(`POST /attendance own class → 200 or 400`, [200, 400].includes(postOwn.status),
    `got ${postOwn.status}`);

  // POST attendance — other class → 403
  const postOther = await POST(`${API}/api/attendance`, token,
    { classId: otherClassId, date: '2025-07-01', records: [{ studentId: otherStudentId, status: 'present' }] });
  assertStatus(`POST /attendance other class → 403`, postOther, 403);
}

async function testStudent(token) {
  section('STUDENT — own record only');

  const me = await GET(`${API}/api/me`, token);
  assert('GET /me → role=student', me.body.role === 'student', me.body.role);
  assert('GET /me → studentId=1',  me.body.studentId === 1, `got ${me.body.studentId}`);

  // own record
  const own = await GET(`${API}/api/students`, token);
  assertExact('GET /students → 1 (own only)', own, 1);

  const s1 = await GET(`${API}/api/students/1`, token);
  assertStatus('GET /students/1 (own) → 200', s1, 200);

  // other records → 403
  const s2 = await GET(`${API}/api/students/2`, token);
  assertStatus('GET /students/2 (other) → 403', s2, 403);

  const s50 = await GET(`${API}/api/students/50`, token);
  assertStatus('GET /students/50 (other) → 403', s50, 403);

  // attendance — own
  const attOwn = await GET(`${API}/api/attendance/student/1`, token);
  assertStatus('GET /attendance/student/1 (own) → 200', attOwn, 200);
  assert('Attendance has records', Array.isArray(attOwn.body) && attOwn.body.length > 0,
    `got ${attOwn.body?.length}`);

  // attendance — other → 403
  const attOther = await GET(`${API}/api/attendance/student/2`, token);
  assertStatus('GET /attendance/student/2 (other) → 403', attOther, 403);

  // marks — own
  const mOwn = await GET(`${API}/api/marks?examId=1&studentId=1`, token);
  assertStatus('GET /marks?studentId=1 (own) → 200', mOwn, 200);
  assert('Marks has 5 subjects', Array.isArray(mOwn.body) && mOwn.body.length === 5,
    `got ${mOwn.body?.length}`);

  // marks — other → 403
  const mOther = await GET(`${API}/api/marks?examId=1&studentId=2`, token);
  assertStatus('GET /marks?studentId=2 (other) → 403', mOther, 403);

  // marks all exams — own
  const maOwn = await GET(`${API}/api/marks/student/1`, token);
  assertStatus('GET /marks/student/1 (own) → 200', maOwn, 200);

  // marks all exams — other → 403
  const maOther = await GET(`${API}/api/marks/student/2`, token);
  assertStatus('GET /marks/student/2 (other) → 403', maOther, 403);

  // fees — own
  const fOwn = await GET(`${API}/api/fees?studentId=1`, token);
  assertStatus('GET /fees?studentId=1 (own) → 200', fOwn, 200);

  // fees — other → 403
  const fOther = await GET(`${API}/api/fees?studentId=2`, token);
  assertStatus('GET /fees?studentId=2 (other) → 403', fOther, 403);

  // cannot mark attendance (student role not in CAN.MARK_ATTENDANCE)
  const postAtt = await POST(`${API}/api/attendance`, token,
    { classId: 1, date: '2025-07-01', records: [] });
  assertStatus('POST /attendance → 403 (not allowed)', postAtt, 403);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${Y('══════════════════════════════════════════════════════════')}`);
  console.log(`${Y('  VIDYAM — Role-Based Access Integration Tests')}`);
  console.log(`${Y('══════════════════════════════════════════════════════════')}`);
  console.log(D(`  API:  ${API}`));
  console.log(D(`  Pool: ${REGION} · Client: ${CLIENT_ID?.slice(0,8)}...`));
  console.log(D(`  Password: ${PW}`));

  // ── Authenticate all users ──────────────────────────────────────────────────
  section('Authenticating test users');
  const tokens = {};
  const users = {
    principal:  'principal@invisos.in',
    teacher6A:  '6A-T-saravanan@invisos.in',
    teacher8A:  '8A-T-bala@invisos.in',
    teacher10A: '10A-T-senthil@invisos.in',
    student:    '6A-S-surya@invisos.in',
  };

  for (const [key, email] of Object.entries(users)) {
    try {
      tokens[key] = await getToken(email, PW);
      console.log(`  ${G('✓')} ${email}`);
    } catch (e) {
      console.log(`  ${R('✗')} ${email} — ${e.message}`);
      tokens[key] = null;
    }
  }

  // ── Run tests ───────────────────────────────────────────────────────────────
  if (tokens.principal)  await testPrincipal(tokens.principal);
  else                   console.log(R('\n  ⚠ Skipping principal tests — auth failed'));

  if (tokens.teacher6A)  await testTeacher(tokens.teacher6A,  '6-A', 1,  1,   7, 121);
  else                   console.log(R('\n  ⚠ Skipping teacher 6-A tests — auth failed'));

  if (tokens.teacher8A)  await testTeacher(tokens.teacher8A,  '8-A', 7,  121, 1, 1);
  else                   console.log(R('\n  ⚠ Skipping teacher 8-A tests — auth failed'));

  if (tokens.teacher10A) await testTeacher(tokens.teacher10A, '10-A', 13, 241, 1, 1);
  else                   console.log(R('\n  ⚠ Skipping teacher 10-A tests — auth failed'));

  if (tokens.student)    await testStudent(tokens.student);
  else                   console.log(R('\n  ⚠ Skipping student tests — auth failed'));

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${Y('══════════════════════════════════════════════════════════')}`);
  console.log(`  ${G(`✓ ${passed} passed`)}   ${failed ? R(`✗ ${failed} failed`) : D('0 failed')}   ${D(`${total} total`)}`);

  if (failures.length) {
    console.log(`\n${R('  FAILURES:')}`);
    failures.forEach(f => console.log(`    ${R('✗')} ${f}`));
  } else {
    console.log(`\n${G('  All tests passed! Role-based access is working correctly.')}`);
  }
  console.log(`${Y('══════════════════════════════════════════════════════════')}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(R('\n  Fatal: ' + e.message)); process.exit(1); });
