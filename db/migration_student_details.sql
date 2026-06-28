-- ===========================================================================
--  MIGRATION — add extended student detail columns to an EXISTING database.
--  Run once against your live RDS (Workbench or mysql client).
--  Safe on data: it only ADDs columns; existing rows get NULL for the new ones.
--  (If a column already exists, that ALTER line will error — just skip it.)
-- ===========================================================================
USE school_app;

ALTER TABLE students
  ADD COLUMN admission_no      VARCHAR(30)  AFTER name,
  ADD COLUMN gender            ENUM('male','female','other') AFTER admission_no,
  ADD COLUMN dob               DATE         AFTER gender,
  ADD COLUMN blood_group       VARCHAR(5)   AFTER dob,
  ADD COLUMN student_phone     VARCHAR(30)  AFTER blood_group,
  ADD COLUMN student_email     VARCHAR(150) AFTER student_phone,
  ADD COLUMN address           VARCHAR(255) AFTER student_email,
  ADD COLUMN guardian_relation VARCHAR(30)  AFTER guardian_name,
  ADD COLUMN guardian_email    VARCHAR(150) AFTER guardian_phone,
  ADD COLUMN admission_date    DATE         AFTER guardian_email,
  ADD COLUMN notes             VARCHAR(500) AFTER admission_date;
