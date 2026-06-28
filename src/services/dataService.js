// ===========================================================================
//  DATA SERVICE — now backed by the real API (Express -> RDS).
//  Every function returns a Promise. Screens load these via the useApi hook.
//  A couple of static bits (timetable, demo persona) stay local for the POC.
// ===========================================================================
import { get, post, put } from "../lib/apiClient.js";
import { demoUsers, timetable } from "../data/seed.js";

// For the POC the logged-in student persona maps to seeded student id 1 (Aarav).
export const DEMO_STUDENT_ID = 1;

// --- static (UI only) ----------------------------------------------------
export const getDemoUser = (role) => demoUsers[role];
export const getTimetable = () => timetable;

// --- students ------------------------------------------------------------
export const listStudents = (cls) =>
  get("/students" + (cls ? `?class=${encodeURIComponent(cls)}` : ""));
export const getStudent = (id) => get(`/students/${id}`);
export const addStudent = (s) => post("/students", s);
export const updateStudent = (id, s) => put(`/students/${id}`, s);

// --- attendance ----------------------------------------------------------
export const getClassAttendance = () => get("/attendance/classwise");
export const getStudentAttendance = (id) => get(`/attendance/student/${id}`);

// --- exams + marks -------------------------------------------------------
export const getExams = () => get("/exams");
export const getMarks = (examId, studentId) =>
  get(`/marks?examId=${examId}&studentId=${studentId}`);

// --- fees ----------------------------------------------------------------
export const getFees = (studentId) => get(`/fees?studentId=${studentId}`);

// --- events --------------------------------------------------------------
export const getEvents = () => get("/meta/events");

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
