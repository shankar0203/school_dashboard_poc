# Database — local setup (MySQL Workbench)

Two scripts:

- **`schema.sql`** — creates the `school_app` database and 14 tables.
- **`seed.sql`** — fills them with the same sample data you see in the app.

Every table has a `school_id` column so the same database can later hold many
schools on one shared AWS RDS instance (one school = `school_id` 1 for now).

---

## Load it in MySQL Workbench

1. Open **MySQL Workbench** and connect to your **Local instance** (the
   `root@localhost` connection it created on install).
2. **File → Open SQL Script…** → choose `db/schema.sql`.
3. Click the **⚡ lightning-bolt** ("Execute") to run the whole script.
   You should see "Action Output" rows all green. This creates `school_app`.
4. **File → Open SQL Script…** → choose `db/seed.sql` → run it the same way.
   (`seed.sql` starts by clearing the tables, so it's safe to re-run anytime.)
5. Refresh the **Schemas** panel (left). You'll see `school_app` with all tables.

## Quick check it worked

Open a new query tab and run:

```sql
USE school_app;
SELECT name, city, academic_year FROM schools;
SELECT COUNT(*) AS students FROM students;          -- 6
SELECT name, status FROM exams;                     -- 4 exams
SELECT s.name, sub.name AS subject, m.mark
FROM marks m
JOIN students s   ON s.id = m.student_id
JOIN subjects sub ON sub.id = m.subject_id
JOIN exams e      ON e.id = m.exam_id
WHERE e.name = 'Half-Yearly';                       -- Aarav's half-yearly marks
```

---

## What's in the database

| Table | Holds |
|-------|-------|
| `schools` | the tenant (one row for now) |
| `users` | principal + teachers (later: Cognito-linked logins) |
| `classes` | 12 classes; `class_teacher_id` = the mentor |
| `subjects` | Tamil, English, Maths, Science, Social (+ activity periods) |
| `students` | pupils, with guardian contact |
| `exams` / `exam_subjects` | exam names and the subjects in each |
| `teacher_subject_class` | **mark-entry permissions** — who can enter which subject for which class (incl. cross-class) |
| `marks` | one row per student × exam × subject |
| `attendance` | one row per student per day |
| `messages` | all four flows: student broadcast, teacher broadcast, direct (with replies), student posts |
| `fees` | fee items, due vs paid |
| `events` | events / news |
| `timetable` | class × day × period |

---

## ⚠️ Important — this DB isn't connected to the app yet

The React app still runs on its built-in mock data (`src/services/dataService.js`).
A browser can't talk to MySQL directly — it needs the **Express API** in between:

```
React app  →  Express API (Node)  →  MySQL (this database)
```

That Express API is the next piece to build. Once it's in, we point
`dataService.js` at it and the app reads/writes this real database.

---

## Moving to AWS later

This same `schema.sql` runs unchanged on **Amazon RDS for MySQL**. You'll point
Workbench (and the Express API) at the RDS endpoint instead of `localhost`, run
`schema.sql` once there, and you're on cloud. Keeping `school_id` on every table
now is what lets multiple schools share one RDS instance later.
