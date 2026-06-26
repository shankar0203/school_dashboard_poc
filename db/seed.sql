-- ===========================================================================
--  SEED DATA — matches the prototype so the app shows the same records.
--  Run AFTER schema.sql.  IDs are set explicitly for predictable foreign keys.
-- ===========================================================================
USE school_app;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE timetable; TRUNCATE events; TRUNCATE fees; TRUNCATE messages;
TRUNCATE attendance; TRUNCATE marks; TRUNCATE teacher_subject_class;
TRUNCATE exam_subjects; TRUNCATE exams; TRUNCATE students; TRUNCATE subjects;
TRUNCATE classes; TRUNCATE users; TRUNCATE schools;
SET FOREIGN_KEY_CHECKS = 1;

-- school -------------------------------------------------------------------
INSERT INTO schools (id, name, city, academic_year) VALUES
  (1, 'Vidyam Public School', 'Coimbatore', '2025-26');

-- users (1 principal + 6 teachers) -----------------------------------------
INSERT INTO users (id, school_id, role, name, email, phone, status) VALUES
  (1, 1, 'principal', 'Mrs. Lakshmi N.',  'lakshmi@vidyam.test',   '98xxxxxx01', 'active'),
  (2, 1, 'teacher',   'Mr. Saravanan K.', 'saravanan@vidyam.test', '98xxxxxx02', 'active'),
  (3, 1, 'teacher',   'Mrs. Geetha',      'geetha@vidyam.test',    '98xxxxxx03', 'active'),
  (4, 1, 'teacher',   'Ms. Rachel',       'rachel@vidyam.test',    '98xxxxxx04', 'active'),
  (5, 1, 'teacher',   'Mr. Murugan',      'murugan@vidyam.test',   '98xxxxxx05', 'on_leave'),
  (6, 1, 'teacher',   'Mr. Bala',         'bala@vidyam.test',      '98xxxxxx06', 'active'),
  (7, 1, 'teacher',   'Ms. Divya',        'divya@vidyam.test',     '98xxxxxx07', 'active');

-- subjects (1-5 academic, 6-9 activity) ------------------------------------
INSERT INTO subjects (id, school_id, name) VALUES
  (1,1,'Tamil'), (2,1,'English'), (3,1,'Maths'), (4,1,'Science'), (5,1,'Social'),
  (6,1,'Computer'), (7,1,'P.E.'), (8,1,'Library'), (9,1,'Games');

-- classes (12) — 8-A (id 5) class teacher = Mr. Saravanan ------------------
INSERT INTO classes (id, school_id, name, class_teacher_id) VALUES
  (1,1,'6-A',NULL),(2,1,'6-B',NULL),(3,1,'7-A',NULL),(4,1,'7-B',NULL),
  (5,1,'8-A',2),   (6,1,'8-B',NULL),(7,1,'9-A',NULL),(8,1,'9-B',NULL),
  (9,1,'10-A',NULL),(10,1,'10-B',NULL),(11,1,'11-A',NULL),(12,1,'12-A',NULL);

-- students (Class 8-A = class_id 5) ----------------------------------------
INSERT INTO students (id, school_id, class_id, roll_no, name, guardian_name, guardian_phone) VALUES
  (1,1,5,12,'Aarav Anand',     'Anand Kumar','98xxxxxx12'),
  (2,1,5, 4,'Divya Meenakshi', 'Meena R.',   '98xxxxxx04'),
  (3,1,5, 7,'Priya Lakshmi',   'Lakshmi S.', '98xxxxxx07'),
  (4,1,5,19,'Karthik Raja',    'Raja M.',    '98xxxxxx19'),
  (5,1,5,22,'Mohammed Irfan',  'Irfan A.',   '98xxxxxx22'),
  (6,1,5, 3,'Sneha Devi',      'Devi K.',    '98xxxxxx03');

-- exams --------------------------------------------------------------------
INSERT INTO exams (id, school_id, name, created_by, status) VALUES
  (1,1,'Mid Term 1',  2,'locked'),
  (2,1,'Quarterly',   2,'locked'),
  (3,1,'Mid Term 2',  2,'locked'),
  (4,1,'Half-Yearly', 2,'open');

-- each exam covers the 5 academic subjects --------------------------------
INSERT INTO exam_subjects (exam_id, subject_id, max_mark) VALUES
  (1,1,100),(1,2,100),(1,3,100),(1,4,100),(1,5,100),
  (2,1,100),(2,2,100),(2,3,100),(2,4,100),(2,5,100),
  (3,1,100),(3,2,100),(3,3,100),(3,4,100),(3,5,100),
  (4,1,100),(4,2,100),(4,3,100),(4,4,100),(4,5,100);

-- mark-entry permissions ---------------------------------------------------
--   Saravanan: Tamil & Science to 8-A, and Tamil to 9-A (cross-class)
--   Geetha: Maths to 8-A
INSERT INTO teacher_subject_class (school_id, teacher_id, subject_id, class_id) VALUES
  (1,2,1,5),   -- Saravanan / Tamil / 8-A
  (1,2,4,5),   -- Saravanan / Science / 8-A
  (1,2,1,7),   -- Saravanan / Tamil / 9-A  (cross-class)
  (1,3,3,5);   -- Geetha / Maths / 8-A

-- Aarav's marks (student_id 1) across all 4 exams -------------------------
--   subject order: Tamil=1 English=2 Maths=3 Science=4 Social=5
INSERT INTO marks (school_id, exam_id, student_id, subject_id, mark, entered_by) VALUES
  -- Mid Term 1  [78,82,71,80,74]
  (1,1,1,1,78,2),(1,1,1,2,82,4),(1,1,1,3,71,3),(1,1,1,4,80,2),(1,1,1,5,74,6),
  -- Quarterly   [85,80,76,88,79]
  (1,2,1,1,85,2),(1,2,1,2,80,4),(1,2,1,3,76,3),(1,2,1,4,88,2),(1,2,1,5,79,6),
  -- Mid Term 2  [88,84,82,90,80]
  (1,3,1,1,88,2),(1,3,1,2,84,4),(1,3,1,3,82,3),(1,3,1,4,90,2),(1,3,1,5,80,6),
  -- Half-Yearly [92,85,88,90,81]
  (1,4,1,1,92,2),(1,4,1,2,85,4),(1,4,1,3,88,3),(1,4,1,4,90,2),(1,4,1,5,81,6);

-- attendance ---------------------------------------------------------------
-- Aarav (id 1): June 2026 weekdays, absent on 5th, 12th, 19th
INSERT INTO attendance (school_id, student_id, class_id, att_date, status, marked_by) VALUES
  (1,1,5,'2026-06-01','present',2),(1,1,5,'2026-06-02','present',2),
  (1,1,5,'2026-06-03','present',2),(1,1,5,'2026-06-04','present',2),
  (1,1,5,'2026-06-05','absent', 2),(1,1,5,'2026-06-08','present',2),
  (1,1,5,'2026-06-09','present',2),(1,1,5,'2026-06-10','present',2),
  (1,1,5,'2026-06-11','present',2),(1,1,5,'2026-06-12','absent', 2),
  (1,1,5,'2026-06-15','present',2),(1,1,5,'2026-06-16','present',2),
  (1,1,5,'2026-06-17','present',2),(1,1,5,'2026-06-18','present',2),
  (1,1,5,'2026-06-19','absent', 2),(1,1,5,'2026-06-22','present',2),
  (1,1,5,'2026-06-23','present',2);
-- the rest of 8-A for today (23rd): Karthik & Irfan absent, others present
INSERT INTO attendance (school_id, student_id, class_id, att_date, status, marked_by) VALUES
  (1,2,5,'2026-06-23','present',2),
  (1,3,5,'2026-06-23','present',2),
  (1,4,5,'2026-06-23','absent', 2),
  (1,5,5,'2026-06-23','absent', 2),
  (1,6,5,'2026-06-23','present',2);

-- messages -----------------------------------------------------------------
-- principal broadcast to students, teacher note (shows on student page)
INSERT INTO messages (school_id, sender_id, sender_role, audience, recipient_id, parent_id, body) VALUES
  (1,1,'principal','student_broadcast',NULL,NULL,'Half-yearly report cards are now available. PTM on Sat 28 June, 10 AM.'),
  (1,2,'teacher',  'student_broadcast',NULL,NULL,'Aarav, please bring your science record book tomorrow.');
-- Aarav''s own post (visible to teacher & principal)
INSERT INTO messages (school_id, sender_id, sender_role, audience, recipient_id, parent_id, body) VALUES
  (1,NULL,'student','student_post',NULL,NULL,'Sir, I will be absent on Friday for a medical appointment.');
-- principal broadcast to all teachers
INSERT INTO messages (school_id, sender_id, sender_role, audience, recipient_id, parent_id, body) VALUES
  (1,1,'principal','teacher_broadcast',NULL,NULL,'Staff meeting Friday 4 PM. Marks entry for Half-Yearly closes Thursday.');
-- principal direct to Mr. Saravanan (recipient_id 2)
INSERT INTO messages (school_id, sender_id, sender_role, audience, recipient_id, parent_id, body) VALUES
  (1,1,'principal','direct',2,NULL,'8-A maths average dropped this term. Can we discuss a plan?');

-- fees (Aarav, student_id 1) ----------------------------------------------
INSERT INTO fees (school_id, student_id, item, amount_due, amount_paid, due_date, receipt_no) VALUES
  (1,1,'Term 1 — Tuition',   16000,16000,'2026-04-12','RC-1001'),
  (1,1,'Term 1 — Transport',  6000, 6000,'2026-04-12','RC-1002'),
  (1,1,'Term 2 — Tuition',   16000,10000,'2026-06-30',NULL),
  (1,1,'Term 2 — Transport',  6000,    0,'2026-06-30',NULL),
  (1,1,'Exam & Lab fee',      4000,    0,'2026-06-30',NULL);

-- events -------------------------------------------------------------------
INSERT INTO events (school_id, title, subtitle, event_date) VALUES
  (1,'Parent-Teacher Meeting','10:00 AM · Main hall','2026-06-28'),
  (1,'Science Exhibition','All day · Classes 6-10','2026-07-02'),
  (1,'Unit Test 2 begins','Timetable on notice board','2026-07-05'),
  (1,'Independence Day','Flag hoisting 8 AM','2026-08-15');

-- timetable (Class 8-A = class_id 5) --------------------------------------
INSERT INTO timetable (school_id, class_id, day_of_week, period, subject_id, teacher_id) VALUES
  (1,5,'Mon',1,1,2),(1,5,'Mon',2,3,3),(1,5,'Mon',3,2,4),(1,5,'Mon',4,4,2),(1,5,'Mon',5,5,6),(1,5,'Mon',6,6,7),
  (1,5,'Tue',1,4,2),(1,5,'Tue',2,1,2),(1,5,'Tue',3,3,3),(1,5,'Tue',4,2,4),(1,5,'Tue',5,7,NULL),(1,5,'Tue',6,5,6),
  (1,5,'Wed',1,3,3),(1,5,'Wed',2,2,4),(1,5,'Wed',3,1,2),(1,5,'Wed',4,5,6),(1,5,'Wed',5,4,2),(1,5,'Wed',6,8,NULL),
  (1,5,'Thu',1,2,4),(1,5,'Thu',2,4,2),(1,5,'Thu',3,5,6),(1,5,'Thu',4,3,3),(1,5,'Thu',5,1,2),(1,5,'Thu',6,6,7),
  (1,5,'Fri',1,5,6),(1,5,'Fri',2,3,3),(1,5,'Fri',3,4,2),(1,5,'Fri',4,1,2),(1,5,'Fri',5,2,4),(1,5,'Fri',6,9,NULL);
