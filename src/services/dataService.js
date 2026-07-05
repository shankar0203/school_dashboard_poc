// ===========================================================================
//  DATA SERVICE — now backed by the real API (Express -> RDS).
//  Every function returns a Promise. Screens load these via the useApi hook.
//  A couple of static bits (timetable, demo persona) stay local for the POC.
// ===========================================================================
import { get, post, put, del } from "../lib/apiClient.js";
import { demoUsers, timetable } from "../data/seed.js";

// For the POC the logged-in student persona maps to seeded student id 1 (Aarav).
// This is only used as a fallback if /me is not yet linked.
export const DEMO_STUDENT_ID = 1;

// --- me (who am I?) -------------------------------------------------------
// Returns { role, linked, studentId?, classId?, className?, ... }
export const getMe = () => get("/me");

// --- admin: link a cognito user to a student / teacher -------------------
export const linkUserToStudent = (cognitoEmail, studentId) =>
  post("/me/link", { cognitoEmail, studentId });
export const linkUserToTeacher = (cognitoEmail, classId) =>
  post("/me/link-teacher", { cognitoEmail, classId });
export const unlinkStudent = (studentId) =>
  post("/me/unlink", { studentId });

// --- static (UI only) ----------------------------------------------------
export const getDemoUser = (role) => demoUsers[role];
export const getTimetable = () => timetable;  // legacy static (kept for fallback)

// --- timetable (DB) ------------------------------------------------------
export const getTimetableDB = (classId) => get(`/timetable?classId=${classId}`);
export const saveTimetable  = (classId, schedule) => put("/timetable", { classId, schedule });

// --- students ------------------------------------------------------------
export const listStudents = (cls) =>
  get("/students" + (cls ? `?class=${encodeURIComponent(cls)}` : ""));
export const getStudent = (id) => get(`/students/${id}`);
export const addStudent = (s) => post("/students", s);
export const updateStudent = (id, s) => put(`/students/${id}`, s);

// --- attendance ----------------------------------------------------------
export const getClassAttendance = () => get("/attendance/classwise");
export const getStudentAttendance = (id) => get(`/attendance/student/${id}`);
export const getAttendanceByDate = (classId, date) =>
  get(`/attendance/by-date?classId=${classId}&date=${date}`);
export const saveAttendance = (classId, date, records) =>
  post("/attendance", { classId, date, records });

// --- subjects ------------------------------------------------------------
export const getSubjects = () => get("/meta/subjects");
export const addSubject = (name) => post("/meta/subjects", { name });

// --- exams + marks -------------------------------------------------------
export const getExams = () => get("/exams");
export const createExam = (name, subjectIds) => post("/exams", { name, subjectIds });
export const setExamStatus = (examId, status) => put(`/exams/${examId}/status`, { status });
export const getMarks = (examId, studentId) =>
  get(`/marks?examId=${examId}&studentId=${studentId}`);
export const getStudentMarksAll = (studentId) => get(`/marks/student/${studentId}`);
export const getMarksGrid = (examId, classId, subjectId) =>
  get(`/marks/grid?examId=${examId}&classId=${classId}&subjectId=${subjectId}`);
export const saveMarks = (examId, subjectId, marks) =>
  post("/marks/bulk", { examId, subjectId, marks });
export const getResultsSummary = (examId) => get(`/results/summary?examId=${examId}`);
export const getClassResults = (examId, classId) =>
  get(`/results/class?examId=${examId}&classId=${classId}`);

// --- fees ----------------------------------------------------------------
export const getFees = (studentId) => get(`/fees?studentId=${studentId}`);
export const addFee = (studentId, item, amount_due, due_date) =>
  post("/fees", { studentId, item, amount_due, due_date });
export const recordFeePayment = (feeId, amount) => post(`/fees/${feeId}/pay`, { amount });

// --- events --------------------------------------------------------------
export const getEvents      = ()                          => get("/meta/events");
export const createEvent    = (title, subtitle, eventDate) => post("/meta/events", { title, subtitle, eventDate });
export const deleteEvent    = (id)                         => del(`/meta/events/${id}`);

// --- messages ------------------------------------------------------------
export const getMessages = () => get("/messages");
export const postStudentMessage = (text) =>
  post("/messages", { audience: "student_post", senderRole: "student", text });
export const postTeacherNote = (text) =>
  post("/messages", { audience: "student_broadcast", senderRole: "teacher", text });
export const replyToPrincipal = (id, text) =>
  post(`/messages/${id}/reply`, { text, senderRole: "teacher" });
export const principalBroadcastStudents = (text) =>
  post("/messages", { audience: "student_broadcast", senderRole: "principal", text });
export const principalBroadcastTeachers = (text) =>
  post("/messages", { audience: "teacher_broadcast", senderRole: "principal", text });
export const principalDirectMessage = (text) =>
  post("/messages", { audience: "direct", senderRole: "principal", text });
