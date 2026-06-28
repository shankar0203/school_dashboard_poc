-- ===========================================================================
--  SCHOOL MANAGEMENT — MySQL schema (POC)
--  MySQL 8.x · InnoDB · utf8mb4 (supports Tamil and other scripts)
--
--  MULTI-TENANT: every table carries school_id so one shared database can hold
--  many schools (the AWS shared-RDS model). For the local POC you'll have one
--  school (id = 1).
--
--  Load order: run this file first (schema), then seed.sql (sample data).
-- ===========================================================================

CREATE DATABASE IF NOT EXISTS school_app
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE school_app;

-- Drop in reverse-dependency order so the script is re-runnable -------------
DROP TABLE IF EXISTS timetable;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS fees;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS marks;
DROP TABLE IF EXISTS teacher_subject_class;
DROP TABLE IF EXISTS exam_subjects;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS schools;

-- ---------------------------------------------------------------------------
-- schools (tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE schools (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  city          VARCHAR(100),
  academic_year VARCHAR(20)  NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- users (staff & login accounts: principal/admin/teacher; students/parents
--        can be added here later, or kept in their own tables)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  school_id    INT NOT NULL,
  cognito_sub  VARCHAR(100),                 -- maps to AWS Cognito user (later)
  role         ENUM('principal','admin','teacher','parent','student') NOT NULL,
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(150),
  phone        VARCHAR(30),
  status       ENUM('active','on_leave','inactive') DEFAULT 'active',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES schools(id),
  INDEX idx_users_school_role (school_id, role)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- classes  (e.g. "8-A"); class_teacher_id is the mentor/owner of the class
-- ---------------------------------------------------------------------------
CREATE TABLE classes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  school_id        INT NOT NULL,
  name             VARCHAR(20) NOT NULL,       -- "8-A"
  class_teacher_id INT,                        -- users.id (a teacher)
  CONSTRAINT fk_classes_school  FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_classes_teacher FOREIGN KEY (class_teacher_id) REFERENCES users(id),
  UNIQUE KEY uq_class (school_id, name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------
CREATE TABLE subjects (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  name      VARCHAR(50) NOT NULL,
  CONSTRAINT fk_subjects_school FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY uq_subject (school_id, name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
CREATE TABLE students (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  school_id         INT NOT NULL,
  class_id          INT NOT NULL,
  roll_no           INT NOT NULL,
  name              VARCHAR(120) NOT NULL,
  admission_no      VARCHAR(30),
  gender            ENUM('male','female','other'),
  dob               DATE,
  blood_group       VARCHAR(5),
  student_phone     VARCHAR(30),
  student_email     VARCHAR(150),
  address           VARCHAR(255),
  guardian_name     VARCHAR(120),
  guardian_relation VARCHAR(30),                 -- Father / Mother / Guardian
  guardian_phone    VARCHAR(30),
  guardian_email    VARCHAR(150),
  admission_date    DATE,
  notes             VARCHAR(500),                -- medical / general notes
  user_id           INT,                         -- optional login (student/parent)
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_students_class  FOREIGN KEY (class_id)  REFERENCES classes(id),
  CONSTRAINT fk_students_user   FOREIGN KEY (user_id)   REFERENCES users(id),
  UNIQUE KEY uq_roll (class_id, roll_no),
  INDEX idx_students_school (school_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- exams  (e.g. "Mid Term 1"); created by a class teacher / admin
-- ---------------------------------------------------------------------------
CREATE TABLE exams (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  school_id  INT NOT NULL,
  name       VARCHAR(80) NOT NULL,
  created_by INT,                              -- users.id
  status     ENUM('open','locked') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exams_school  FOREIGN KEY (school_id)  REFERENCES schools(id),
  CONSTRAINT fk_exams_creator FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_exams_school (school_id)
) ENGINE=InnoDB;

-- which subjects are part of an exam
CREATE TABLE exam_subjects (
  exam_id    INT NOT NULL,
  subject_id INT NOT NULL,
  max_mark   INT NOT NULL DEFAULT 100,
  PRIMARY KEY (exam_id, subject_id),
  CONSTRAINT fk_es_exam    FOREIGN KEY (exam_id)    REFERENCES exams(id) ON DELETE CASCADE,
  CONSTRAINT fk_es_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- teacher_subject_class  — THE permission model:
--   "this teacher may enter marks for this subject in this class"
--   (handles the cross-class case: e.g. 8-A teacher teaches Tamil to 9-A)
-- ---------------------------------------------------------------------------
CREATE TABLE teacher_subject_class (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  school_id  INT NOT NULL,
  teacher_id INT NOT NULL,
  subject_id INT NOT NULL,
  class_id   INT NOT NULL,
  CONSTRAINT fk_tsc_school  FOREIGN KEY (school_id)  REFERENCES schools(id),
  CONSTRAINT fk_tsc_teacher FOREIGN KEY (teacher_id) REFERENCES users(id),
  CONSTRAINT fk_tsc_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_tsc_class   FOREIGN KEY (class_id)   REFERENCES classes(id),
  UNIQUE KEY uq_tsc (teacher_id, subject_id, class_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- marks  (one row per student × exam × subject)
-- ---------------------------------------------------------------------------
CREATE TABLE marks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  school_id  INT NOT NULL,
  exam_id    INT NOT NULL,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  mark       DECIMAL(5,2) NOT NULL,
  entered_by INT,                              -- users.id (which teacher)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_marks_school  FOREIGN KEY (school_id)  REFERENCES schools(id),
  CONSTRAINT fk_marks_exam    FOREIGN KEY (exam_id)    REFERENCES exams(id),
  CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_marks_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_marks_teacher FOREIGN KEY (entered_by) REFERENCES users(id),
  UNIQUE KEY uq_mark (exam_id, student_id, subject_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- attendance  (one row per student per day)
-- ---------------------------------------------------------------------------
CREATE TABLE attendance (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  school_id  INT NOT NULL,
  student_id INT NOT NULL,
  class_id   INT NOT NULL,
  att_date   DATE NOT NULL,
  status     ENUM('present','absent','late') NOT NULL,
  marked_by  INT,
  CONSTRAINT fk_att_school  FOREIGN KEY (school_id)  REFERENCES schools(id),
  CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_att_class   FOREIGN KEY (class_id)   REFERENCES classes(id),
  CONSTRAINT fk_att_marker  FOREIGN KEY (marked_by)  REFERENCES users(id),
  UNIQUE KEY uq_att (student_id, att_date),
  INDEX idx_att_class_date (class_id, att_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- messages  (covers all four flows in the app)
--   audience: student_broadcast | teacher_broadcast | direct | student_post
--   recipient_id used for 'direct'; parent_id links a reply to its message
-- ---------------------------------------------------------------------------
CREATE TABLE messages (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  school_id    INT NOT NULL,
  sender_id    INT,
  sender_role  ENUM('principal','admin','teacher','parent','student') NOT NULL,
  audience     ENUM('student_broadcast','teacher_broadcast','direct','student_post') NOT NULL,
  recipient_id INT,                            -- users.id for 'direct'
  parent_id    INT,                            -- messages.id for a reply
  body         TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_school    FOREIGN KEY (school_id)    REFERENCES schools(id),
  CONSTRAINT fk_msg_sender    FOREIGN KEY (sender_id)    REFERENCES users(id),
  CONSTRAINT fk_msg_recipient FOREIGN KEY (recipient_id) REFERENCES users(id),
  CONSTRAINT fk_msg_parent    FOREIGN KEY (parent_id)    REFERENCES messages(id),
  INDEX idx_msg_audience (school_id, audience)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- fees  (one row per fee item per student)
-- ---------------------------------------------------------------------------
CREATE TABLE fees (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  school_id   INT NOT NULL,
  student_id  INT NOT NULL,
  item        VARCHAR(80) NOT NULL,            -- "Term 1 — Tuition"
  amount_due  DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_date    DATE,
  receipt_no  VARCHAR(40),
  CONSTRAINT fk_fees_school  FOREIGN KEY (school_id)  REFERENCES schools(id),
  CONSTRAINT fk_fees_student FOREIGN KEY (student_id) REFERENCES students(id),
  INDEX idx_fees_student (student_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- events / news
-- ---------------------------------------------------------------------------
CREATE TABLE events (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  school_id  INT NOT NULL,
  title      VARCHAR(150) NOT NULL,
  subtitle   VARCHAR(200),
  event_date DATE NOT NULL,
  CONSTRAINT fk_events_school FOREIGN KEY (school_id) REFERENCES schools(id),
  INDEX idx_events_school_date (school_id, event_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- timetable  (one row per class × day × period)
-- ---------------------------------------------------------------------------
CREATE TABLE timetable (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  school_id  INT NOT NULL,
  class_id   INT NOT NULL,
  day_of_week ENUM('Mon','Tue','Wed','Thu','Fri','Sat') NOT NULL,
  period     INT NOT NULL,
  subject_id INT,
  teacher_id INT,
  CONSTRAINT fk_tt_school  FOREIGN KEY (school_id)  REFERENCES schools(id),
  CONSTRAINT fk_tt_class   FOREIGN KEY (class_id)   REFERENCES classes(id),
  CONSTRAINT fk_tt_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_tt_teacher FOREIGN KEY (teacher_id) REFERENCES users(id),
  UNIQUE KEY uq_tt (class_id, day_of_week, period)
) ENGINE=InnoDB;
