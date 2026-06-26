// ===========================================================================
//  DATA SERVICE  —  the ONE place that talks to "the backend".
//  Today it reads/writes the in-memory seed. To go live, replace each function
//  body with a fetch() to your Express API — the rest of the app is untouched.
//
//  Example real swap:
//    export const listStudents = (cls) =>
//      fetch(`/api/students?class=${cls}`).then(r => r.json());
// ===========================================================================

import * as seed from "../data/seed.js";

export const getDemoUser = (role) => seed.demoUsers[role];

export const listStudents = (cls) =>
  cls ? seed.students.map((s) => ({ ...s, cls })) : seed.students;

export const addStudent = ({ name, cls }) => {
  seed.students.push({
    roll: seed.students.length + 1,
    name, cls, att: 100, guardian: "—", phone: "—", fee: "Pending",
  });
  return seed.students;
};

export const getMyMarks = (examId) => seed.myMarks[examId] || [];
export const getClassAttendance = () => seed.classAttendance;
export const getEvents = () => seed.events;
export const getTimetable = () => seed.timetable;
export const getFees = () => seed.fees;

// ---- messaging ----------------------------------------------------------
export const getMessages = () => seed.messages;

export const postStudentMessage = (text) => {
  seed.messages.studentPosts.unshift({
    from: "Aarav (Student)", role: "student", col: "#9b7bff", time: "just now", text,
  });
};

export const postTeacherNote = (text) => {
  seed.messages.studentFeed.unshift({
    from: "Mr. Saravanan (Class Teacher)", role: "teacher", col: "#ffb454", time: "just now", text,
  });
};

export const replyToPrincipal = (i, text) => {
  if (seed.messages.teacherInbox[i]) seed.messages.teacherInbox[i].reply = text;
};

export const principalBroadcastStudents = (text) => {
  seed.messages.studentFeed.unshift({
    from: "Principal Office", role: "principal", col: "#34d1bf", time: "just now", text,
  });
};

export const principalBroadcastTeachers = (text) => {
  seed.messages.teacherGeneral.unshift({
    from: "Principal Office", role: "principal", col: "#34d1bf", time: "just now", text,
  });
};

export const principalDirectMessage = (text) => {
  seed.messages.teacherInbox.unshift({
    from: "Principal — Mrs. Lakshmi", role: "principal", col: "#34d1bf", time: "just now", reply: null, text,
  });
};
