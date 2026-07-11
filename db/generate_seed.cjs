// ===========================================================================
//  SEED GENERATOR — generates db/seed_full.sql
//  Run: node db/generate_seed.js
//  Output: db/seed_full.sql
//
//  Produces:
//    • 15 classes (Grades 6–10, sections A/B/C)
//    • 17 users (1 principal + 1 admin + 15 class teachers)
//    • 9 subjects
//    • 300 students (20 per class — 10 boys, 10 girls)
//    • 3 exams (Mid Term 1 locked, Quarterly locked, Half-Yearly open)
//    • 4500 marks rows
//    • ~33,000 attendance rows (working days Jun–Nov 2025)
//    • 450 timetable rows
//    • 900 fee rows
// ===========================================================================

const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'seed_full.sql');
const lines = [];
const emit = (s) => lines.push(s);

// ─── helpers ─────────────────────────────────────────────────────────────────
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr, seed) {
  if (seed != null) {
    const x = Math.abs(Math.sin(seed + 1) * 1e6);
    return arr[Math.floor((x % 1) * arr.length)];
  }
  return arr[rnd(0, arr.length - 1)];
}
// Deterministic "random" for repeatability
function det(a, b) { return ((a * 31 + b * 17) % 100) / 100; }
function detRange(a, b, min, max) { return Math.floor(det(a, b) * (max - min + 1)) + min; }

// ─── name pools ──────────────────────────────────────────────────────────────
const BOY_FIRST = [
  'Aarav','Arjun','Karthik','Vikram','Siddharth','Rahul','Aditya','Rohan',
  'Naveen','Deepak','Surya','Ganesh','Rajesh','Manoj','Praveen',
  'Harish','Dinesh','Balaji','Ajay','Senthil','Venkat','Kavin',
  'Gopal','Vijay','Saravanan','Bala','Ravi','Kumar','Suresh','Yuvan'
];
const GIRL_FIRST = [
  'Priya','Divya','Kavya','Sneha','Riya','Ananya','Pooja','Meena',
  'Lakshmi','Geetha','Nithya','Saranya','Deepa','Kamala','Valli',
  'Suganya','Anitha','Pavithra','Revathi','Indira',
  'Janani','Keerthi','Monisha','Nandhini','Oviya',
  'Swetha','Dharini','Harini','Ishwarya','Kavitha'
];
const SURNAMES = [
  'Kumar','Rajan','Murugan','Krishnan','Selvam','Pandian',
  'Arumugam','Venkatesh','Natarajan','Subramanian',
  'Ramachandran','Govindasamy','Shanmugam','Periyasamy','Balakrishnan',
  'Rajendran','Sundaram','Annamalai','Kannan','Prabhu'
];
const BLOOD = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const RELATIONS = ['Father','Mother','Father','Father','Mother','Guardian'];
const CITIES = ['Coimbatore','Salem','Erode','Tiruppur','Pollachi','Mettupalayam'];

// ─── school config ────────────────────────────────────────────────────────────
const SCHOOL_ID = 1;
const GRADES    = [6,7,8,9,10];
const SECTIONS  = ['A','B','C'];
const SUBJECTS  = [
  {id:1,name:'Tamil'},{id:2,name:'English'},{id:3,name:'Maths'},
  {id:4,name:'Science'},{id:5,name:'Social'},
  {id:6,name:'Computer'},{id:7,name:'P.E.'},{id:8,name:'Library'},{id:9,name:'Games'}
];
const ACADEMIC_SUBJECTS = [1,2,3,4,5]; // subjects that appear in exams

// Build class list
const CLASSES = []; // {id, grade, section, name}
let cid = 1;
for (const g of GRADES) for (const s of SECTIONS) {
  CLASSES.push({ id: cid++, grade: g, section: s, name: `${g}-${s}` });
}
// CLASSES[0]=6-A(id1) … CLASSES[14]=10-C(id15)

// Users: 1=principal, 2=admin, 3–17=class teachers (one per class)
const PRINCIPAL_ID = 1;
const ADMIN_ID = 2;
const CLASS_TEACHER_START = 3; // user id 3 = teacher for class 1 (6-A)

// Timetable pattern — 6 periods per day, 5 days, uses subject ids
// We'll rotate subjects across periods deterministically
const DAYS = ['Mon','Tue','Wed','Thu','Fri'];
const PERIOD_COUNT = 6;
// Subject patterns for timetable: academic subjects only for periods 1-5, P.E./Library/Games for period 6
const TIMETABLE_ROTATIONS = [
  [1,2,3,4,5,7], // Mon
  [2,4,1,3,5,8], // Tue
  [3,1,4,2,5,9], // Wed
  [4,3,2,1,5,6], // Thu
  [5,2,3,4,1,7], // Fri
];

// ─── attendance days (Mon–Sat, Jun–Nov 2025, skip holidays) ─────────────────
function getWorkingDays() {
  const days = [];
  const holidays = new Set([
    '2025-08-15','2025-10-02','2025-10-03','2025-10-24', // Independence Day, Gandhi J., Dussehra, Diwali
    '2025-11-01','2025-11-04', // Tamil Nadu Day, holiday
  ]);
  const start = new Date('2025-06-05');
  const end   = new Date('2025-11-29');
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    const ds  = cur.toISOString().slice(0, 10);
    if (dow !== 0 && !holidays.has(ds)) { // skip Sunday only (Sat is school day)
      days.push(ds);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
const WORKING_DAYS = getWorkingDays();

// ─── mark generation for a student ──────────────────────────────────────────
// Each student has a base ability (40–95). Each exam slightly improves.
// Return {examIdx, subjectId, mark}
function studentMarks(studentId, classId) {
  const ability = 40 + detRange(studentId, classId, 0, 55); // 40-95
  const rows = [];
  const examDeltas = [0, 3, 6]; // Mid Term → Quarterly → Half-Yearly trend
  const EXAMS = [1,2,3];
  for (let ei = 0; ei < EXAMS.length; ei++) {
    for (const sid of ACADEMIC_SUBJECTS) {
      const subjectBias = detRange(studentId * 7, sid * 3 + ei, -12, 12);
      let mark = ability + examDeltas[ei] + subjectBias + rnd(-5, 5);
      mark = Math.min(100, Math.max(12, mark)); // clamp 12-100
      rows.push({ examId: EXAMS[ei], subjectId: sid, mark });
    }
  }
  return rows;
}

// ─── attendance generation for a student ─────────────────────────────────────
// tendencyPct: 70-100 (how often the student shows up)
function studentAttendance(studentId, classId, tendencyPct) {
  const rows = [];
  for (const day of WORKING_DAYS) {
    const dayHash = detRange(studentId, day.charCodeAt(5) + day.charCodeAt(8), 0, 99);
    let status;
    if (dayHash < tendencyPct) {
      status = dayHash < 3 ? 'late' : 'present';
    } else {
      status = 'absent';
    }
    rows.push({ date: day, classId, status });
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BUILD SQL
// ═══════════════════════════════════════════════════════════════════════════
emit('-- =========================================================================');
emit('--  seed_full.sql — Full realistic seed for Vidyam Public School');
emit(`--  Generated: ${new Date().toISOString()}`);
emit(`--  ${CLASSES.length} classes · ${CLASSES.length * 20} students · ${WORKING_DAYS.length} school days`);
emit('-- =========================================================================');
emit('USE school_app;');
emit('');
emit('SET FOREIGN_KEY_CHECKS = 0;');
emit('TRUNCATE timetable; TRUNCATE events; TRUNCATE fees; TRUNCATE messages;');
emit('TRUNCATE attendance; TRUNCATE marks; TRUNCATE teacher_subject_class;');
emit('TRUNCATE exam_subjects; TRUNCATE exams; TRUNCATE students; TRUNCATE subjects;');
emit('TRUNCATE classes; TRUNCATE users; TRUNCATE schools;');
emit('SET FOREIGN_KEY_CHECKS = 1;');
emit('');

// ─── SCHOOL ───────────────────────────────────────────────────────────────
emit('-- SCHOOL ---------------------------------------------------------------');
emit(`INSERT INTO schools (id,name,city,academic_year) VALUES (1,'Vidyam Public School','Coimbatore','2025-26');`);
emit('');

// ─── USERS ────────────────────────────────────────────────────────────────
emit('-- USERS ----------------------------------------------------------------');
emit("-- 1=principal  2=admin  3–17=class teachers (one per class in order 6-A…10-C)");
const userInserts = [];
userInserts.push(`(1,1,'principal','Mrs. Lakshmi Narayanan','principal@invisos.in','9800000001','active')`);
userInserts.push(`(2,1,'admin','Mr. Ramesh Sundaram','admin@invisos.in','9800000002','active')`);

const teacherNames = [
  // 6-A, 6-B, 6-C
  ['Mr. Saravanan Krishnan', 'saravanan.k'],
  ['Mrs. Geetha Pandian', 'geetha.p'],
  ['Ms. Rachel Selvam', 'rachel.s'],
  // 7-A, 7-B, 7-C
  ['Mr. Murugan Arumugam', 'murugan.a'],
  ['Mrs. Meena Venkatesh', 'meena.v'],
  ['Mr. Naveen Rajendran', 'naveen.r'],
  // 8-A, 8-B, 8-C
  ['Mr. Bala Subramanian', 'bala.s'],
  ['Mrs. Divya Natarajan', 'divya.n'],
  ['Mr. Harish Govindasamy', 'harish.g'],
  // 9-A, 9-B, 9-C
  ['Ms. Priya Kannan', 'priya.k'],
  ['Mr. Rajesh Annamalai', 'rajesh.a'],
  ['Mrs. Kavitha Prabhu', 'kavitha.pr'],
  // 10-A, 10-B, 10-C
  ['Mr. Senthil Balakrishnan', 'senthil.b'],
  ['Mrs. Saranya Shanmugam', 'saranya.sh'],
  ['Mr. Vijay Periyasamy', 'vijay.p'],
];

for (let i = 0; i < teacherNames.length; i++) {
  const uid = CLASS_TEACHER_START + i;
  const [name] = teacherNames[i];
  const cls = CLASSES[i];
  // Email format matches Cognito users: {grade}{section}-T-{firstName}@invisos.in
  const firstName = name.replace(/^(Mr\.|Mrs\.|Ms\.) /, '').split(' ')[0].toLowerCase();
  const email = `${cls.grade}${cls.section}-T-${firstName}@invisos.in`;
  const phone = `980000${String(uid).padStart(4, '0')}`;
  userInserts.push(`(${uid},1,'teacher','${name}','${email}','${phone}','active')`);
}

emit(`INSERT INTO users (id,school_id,role,name,email,phone,status) VALUES`);
emit(userInserts.map((r,i) => '  ' + r + (i < userInserts.length-1 ? ',' : ';')).join('\n'));
emit('');

// ─── SUBJECTS ─────────────────────────────────────────────────────────────
emit('-- SUBJECTS -------------------------------------------------------------');
const subVals = SUBJECTS.map(s => `(${s.id},1,'${s.name}')`).join(',');
emit(`INSERT INTO subjects (id,school_id,name) VALUES ${subVals};`);
emit('');

// ─── CLASSES ──────────────────────────────────────────────────────────────
emit('-- CLASSES (15: Grades 6-10 × sections A/B/C) ---------------------------');
const classVals = CLASSES.map((c, i) => {
  const teacherId = CLASS_TEACHER_START + i;
  return `(${c.id},1,'${c.name}',${teacherId})`;
}).join(',\n  ');
emit(`INSERT INTO classes (id,school_id,name,class_teacher_id) VALUES`);
emit('  ' + classVals + ';');
emit('');

// ─── STUDENTS ─────────────────────────────────────────────────────────────
emit('-- STUDENTS (300 total: 20 per class, 10 boys + 10 girls) ---------------');

const allStudents = []; // {id, schoolId, classId, rollNo, name, gender, ...}
let studentId = 1;

// We'll batch these inserts
const studentRows = [];

for (const cls of CLASSES) {
  const usedFirstNames = new Set();
  const pickUnique = (pool, seed) => {
    let tries = 0;
    let name;
    do {
      name = pick(pool, seed + tries);
      tries++;
    } while (usedFirstNames.has(name) && tries < 100);
    usedFirstNames.add(name);
    return name;
  };

  for (let roll = 1; roll <= 20; roll++) {
    const isBoy = roll <= 10;
    const gender = isBoy ? 'male' : 'female';
    const namePool = isBoy ? BOY_FIRST : GIRL_FIRST;
    const firstName = pickUnique(namePool, studentId * 13);
    const surname   = pick(SURNAMES, studentId * 7);
    const fullName  = `${firstName} ${surname}`;

    const guardianFirst = isBoy
      ? pick(BOY_FIRST, studentId * 3 + 1)
      : pick(BOY_FIRST, studentId * 5 + 1);
    const guardianSurname = surname;
    const guardianRelation = isBoy
      ? pick(['Father','Mother'], studentId)
      : pick(['Mother','Father'], studentId);
    const guardianName = `${guardianFirst} ${guardianSurname}`;
    const guardianPhone = `9${rnd(600000000, 999999999)}`;
    const studentPhone  = rnd(0, 3) === 0 ? `9${rnd(600000000, 999999999)}` : null;

    const bg = pick(BLOOD, studentId);
    // DOB: grade 6 → age ~11, grade 10 → age ~15
    const ageYears = cls.grade - 6 + 11;
    const dobYear  = 2025 - ageYears;
    const dobMonth = rnd(1, 12);
    const dobDay   = rnd(1, 28);
    const dob = `${dobYear}-${String(dobMonth).padStart(2,'0')}-${String(dobDay).padStart(2,'0')}`;

    const admYear  = 2025 - (cls.grade - 6); // started in std 6
    const admDate  = `${admYear}-06-0${rnd(1,9)}`;
    const admNo    = `ADM${admYear}${String(studentId).padStart(4,'0')}`;
    const address  = `${rnd(1,99)} ${pick(['Anna Nagar','Gandhi Street','Nehru Road','Bharathi Colony','Tamil Salai'], studentId)}, ${pick(CITIES, studentId + 3)}`;

    // 30% chance of having a note
    const notePool = [
      'Good at sports','Active class participant','Needs extra support in Maths',
      'Very creative student','Shy but hardworking','Great leadership qualities',
      'Improve handwriting','Consistent performer','Loves reading','Science enthusiast'
    ];
    const note = rnd(0,2) === 0 ? pick(notePool, studentId) : null;

    const phoneStr = studentPhone ? `'${studentPhone}'` : 'NULL';
    const noteStr  = note ? `'${note}'` : 'NULL';

    studentRows.push(
      `(${studentId},1,${cls.id},${roll},'${fullName}','${admNo}','${gender}','${dob}','${bg}',` +
      `${phoneStr},'${admNo.toLowerCase()}@student.vidyam.school','${address}',` +
      `'${guardianName}','${guardianRelation}','${guardianPhone}',NULL,'${admDate}',${noteStr},NULL)`
    );

    allStudents.push({ id: studentId, classId: cls.id, rollNo: roll, name: fullName });
    studentId++;
  }
}

// batch insert in chunks of 50
const CHUNK = 50;
emit(`INSERT INTO students`);
emit(`  (id,school_id,class_id,roll_no,name,admission_no,gender,dob,blood_group,`);
emit(`   student_phone,student_email,address,guardian_name,guardian_relation,guardian_phone,`);
emit(`   guardian_email,admission_date,notes,user_id) VALUES`);
for (let i = 0; i < studentRows.length; i++) {
  const comma = i < studentRows.length - 1 ? ',' : ';';
  if (i % CHUNK === 0 && i > 0) {
    // close previous batch, start new
    // Actually just emit all as one big INSERT — MySQL handles it
  }
  emit('  ' + studentRows[i] + (i < studentRows.length - 1 ? ',' : ';'));
}
emit('');

// ─── EXAMS ────────────────────────────────────────────────────────────────
emit('-- EXAMS ----------------------------------------------------------------');
emit(`INSERT INTO exams (id,school_id,name,created_by,status) VALUES`);
emit(`  (1,1,'Mid Term 1',1,'locked'),`);
emit(`  (2,1,'Quarterly',1,'locked'),`);
emit(`  (3,1,'Half-Yearly',1,'open');`);
emit('');

emit('-- EXAM SUBJECTS (3 exams × 5 academic subjects) -----------------------');
const esRows = [];
for (const eid of [1,2,3]) for (const sid of ACADEMIC_SUBJECTS) esRows.push(`(${eid},${sid},100)`);
emit(`INSERT INTO exam_subjects (exam_id,subject_id,max_mark) VALUES ${esRows.join(',')};`);
emit('');

// ─── TEACHER_SUBJECT_CLASS ────────────────────────────────────────────────
emit('-- TEACHER_SUBJECT_CLASS (class teacher handles all 5 subjects in own class) ---');
const tscRows = [];
for (let ci = 0; ci < CLASSES.length; ci++) {
  const cls = CLASSES[ci];
  const tid = CLASS_TEACHER_START + ci;
  for (const sid of ACADEMIC_SUBJECTS) {
    tscRows.push(`(1,${tid},${sid},${cls.id})`);
  }
}
emit(`INSERT INTO teacher_subject_class (school_id,teacher_id,subject_id,class_id) VALUES`);
emit(tscRows.map((r,i) => '  '+r+(i<tscRows.length-1?',':';')).join('\n'));
emit('');

// ─── MARKS ────────────────────────────────────────────────────────────────
emit('-- MARKS (300 students × 3 exams × 5 subjects = 4500 rows) -------------');
const markRows = [];
for (const stu of allStudents) {
  const marks = studentMarks(stu.id, stu.classId);
  // teacher for this class
  const classIdx = CLASSES.findIndex(c => c.id === stu.classId);
  const teacherId = CLASS_TEACHER_START + classIdx;
  for (const m of marks) {
    markRows.push(`(1,${m.examId},${stu.id},${m.subjectId},${m.mark},${teacherId})`);
  }
}
emit(`INSERT INTO marks (school_id,exam_id,student_id,subject_id,mark,entered_by) VALUES`);
for (let i = 0; i < markRows.length; i++) {
  emit('  ' + markRows[i] + (i < markRows.length - 1 ? ',' : ';'));
}
emit('');

// ─── ATTENDANCE ──────────────────────────────────────────────────────────
emit(`-- ATTENDANCE (${allStudents.length} students × ${WORKING_DAYS.length} days = ~${allStudents.length * WORKING_DAYS.length} rows) ---`);
// group by class to mark attendance in batches
const attRows = [];
for (const stu of allStudents) {
  // attendance tendency: most students 85-97%, some lower (70-84%)
  const tendencyPct = stu.id % 5 === 0 ? detRange(stu.id, 7, 70, 82) : detRange(stu.id, 11, 86, 97);
  const classIdx = CLASSES.findIndex(c => c.id === stu.classId);
  const teacherId = CLASS_TEACHER_START + classIdx;
  const att = studentAttendance(stu.id, stu.classId, tendencyPct);
  for (const a of att) {
    attRows.push(`(1,${stu.id},${stu.classId},'${a.date}','${a.status}',${teacherId})`);
  }
}

emit(`INSERT INTO attendance (school_id,student_id,class_id,att_date,status,marked_by) VALUES`);
const ATT_CHUNK = 500;
for (let i = 0; i < attRows.length; i++) {
  const isLast = i === attRows.length - 1;
  const isChunkEnd = (i + 1) % ATT_CHUNK === 0;
  if (i > 0 && i % ATT_CHUNK === 0) {
    // MySQL allows large multi-row inserts so we keep one statement
    // just add comma
  }
  emit('  ' + attRows[i] + (isLast ? ';' : ','));
}
emit('');

// ─── TIMETABLE ───────────────────────────────────────────────────────────
emit('-- TIMETABLE (15 classes × 5 days × 6 periods = 450 rows) -------------');
const ttRows = [];
for (let ci = 0; ci < CLASSES.length; ci++) {
  const cls = CLASSES[ci];
  const teacherId = CLASS_TEACHER_START + ci;
  for (let di = 0; di < DAYS.length; di++) {
    for (let pi = 0; pi < PERIOD_COUNT; pi++) {
      // rotate subject pattern slightly per class section
      const subjectPool = TIMETABLE_ROTATIONS[di];
      const subjectIdx  = (pi + ci) % subjectPool.length;
      const subId       = subjectPool[subjectIdx];
      // non-academic subjects don't have a teacher
      const ttTeacher   = ACADEMIC_SUBJECTS.includes(subId) ? teacherId : 'NULL';
      ttRows.push(`(1,${cls.id},'${DAYS[di]}',${pi+1},${subId},${ttTeacher})`);
    }
  }
}
emit(`INSERT INTO timetable (school_id,class_id,day_of_week,period,subject_id,teacher_id) VALUES`);
emit(ttRows.map((r,i) => '  '+r+(i<ttRows.length-1?',':';')).join('\n'));
emit('');

// ─── FEES ────────────────────────────────────────────────────────────────
emit('-- FEES (300 students × 3 terms) ----------------------------------------');
// Tuition + Transport per term. Some paid fully, some partial, some none.
const feeRows = [];
for (const stu of allStudents) {
  // Each student has 3 terms of tuition + 1 lab fee
  // Payment pattern based on student id
  const payPattern = stu.id % 10; // 0-9
  const tuition = 16000;
  const transport = 5500;
  const lab = 3500;

  const t1paid = payPattern < 8 ? tuition : payPattern < 9 ? 8000 : 0;
  const t2paid = payPattern < 6 ? tuition : payPattern < 8 ? 8000 : 0;
  const t3paid = payPattern < 4 ? tuition : 0;
  const trPaid = payPattern < 7 ? transport : payPattern < 9 ? 2500 : 0;
  const labPaid = payPattern < 6 ? lab : 0;

  const rc = (n) => n > 0 ? `'RC-${stu.id}-${n}'` : 'NULL';

  feeRows.push(`(1,${stu.id},'Term 1 — Tuition',${tuition},${t1paid},'2025-07-31',${rc(1)})`);
  feeRows.push(`(1,${stu.id},'Term 2 — Tuition',${tuition},${t2paid},'2025-10-31',${t2paid>0?rc(2):'NULL'})`);
  feeRows.push(`(1,${stu.id},'Term 3 — Tuition',${tuition},${t3paid},'2026-01-31',${t3paid>0?rc(3):'NULL'})`);
  feeRows.push(`(1,${stu.id},'Transport Fee',${transport},${trPaid},'2025-07-31',${trPaid>0?`'RC-${stu.id}-T'`:'NULL'})`);
  feeRows.push(`(1,${stu.id},'Exam & Lab Fee',${lab},${labPaid},'2025-09-30',${labPaid>0?`'RC-${stu.id}-L'`:'NULL'})`);
}
emit(`INSERT INTO fees (school_id,student_id,item,amount_due,amount_paid,due_date,receipt_no) VALUES`);
emit(feeRows.map((r,i) => '  '+r+(i<feeRows.length-1?',':';')).join('\n'));
emit('');

// ─── EVENTS ──────────────────────────────────────────────────────────────
emit('-- EVENTS ---------------------------------------------------------------');
emit(`INSERT INTO events (school_id,title,subtitle,event_date) VALUES`);
emit(`  (1,'Reopening Day','Academic year 2025-26 begins','2025-06-05'),`);
emit(`  (1,'Mid Term 1 Exams','All classes 6-10','2025-08-05'),`);
emit(`  (1,'Parent-Teacher Meeting','10 AM · Main Hall','2025-09-06'),`);
emit(`  (1,'Quarterly Exams','All classes · Timetable on notice board','2025-09-15'),`);
emit(`  (1,'Diwali Holiday','School closed','2025-10-24'),`);
emit(`  (1,'Half-Yearly Exams','All classes 6-10','2025-11-15'),`);
emit(`  (1,'Science Exhibition','All day · Classes 6-10','2025-11-22'),`);
emit(`  (1,'Annual Day','Cultural programmes · 5 PM','2025-12-15');`);
emit('');

// ─── MESSAGES ─────────────────────────────────────────────────────────────
emit('-- MESSAGES -------------------------------------------------------------');
emit(`INSERT INTO messages (school_id,sender_id,sender_role,audience,recipient_id,parent_id,body) VALUES`);
emit(`  (1,1,'principal','student_broadcast',NULL,NULL,'Half-yearly exams begin 15 Nov. Prepare well!'),`);
emit(`  (1,1,'principal','teacher_broadcast',NULL,NULL,'Staff meeting Mon 4 PM. Marks entry for Half-Yearly closes Fri.'),`);
emit(`  (1,3,'teacher','student_broadcast',NULL,NULL,'6-A students: bring geometry box on Monday.'),`);
emit(`  (1,1,'principal','direct',3,NULL,'6-A attendance is improving — keep it up!');`);
emit('');

// ─── TEST STUDENT USER ───────────────────────────────────────────────────
// Links Cognito user 6A-S-surya@invisos.in to student_id=1 (first student in 6-A)
emit('-- TEST STUDENT USER (links Cognito 6A-S-surya@invisos.in to student id=1) ---');
emit(`INSERT INTO users (id,school_id,role,name,email,phone,status) VALUES`);
emit(`  (18,1,'student','Surya (Test Student)','6a-s-surya@invisos.in','9000000018','active');`);
emit(`UPDATE students SET user_id=18 WHERE id=1 AND school_id=1;`);
emit('');

emit('-- =========================================================================');
emit('-- END OF SEED');
emit('-- =========================================================================');

// ─── write file ──────────────────────────────────────────────────────────────
const sql = lines.join('\n');
fs.writeFileSync(OUT, sql, 'utf8');
console.log(`✅ Written: ${OUT}`);
console.log(`   Classes   : ${CLASSES.length}`);
console.log(`   Students  : ${allStudents.length}`);
console.log(`   Mark rows : ${markRows.length}`);
console.log(`   Att rows  : ${attRows.length}`);
console.log(`   Fee rows  : ${feeRows.length}`);
console.log(`   TT rows   : ${ttRows.length}`);
console.log(`   School days: ${WORKING_DAYS.length}`);
