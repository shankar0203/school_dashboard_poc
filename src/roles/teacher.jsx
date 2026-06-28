// TEACHER role screens — live data from the API.
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Tabs, Message, Loading } from "../components/ui.jsx";
import StudentForm from "../components/StudentForm.jsx";
import StudentProfile from "../components/StudentProfile.jsx";

const { subjects, classes } = config.academics;
const MY_CLASS = "8-A";

function Dashboard() {
  const list = useApi(() => api.listStudents(MY_CLASS), []);
  const students = list.data || [];
  const [present, setPresent] = useState({});
  // default present from attendance %, lazily once data arrives
  const initial = Object.keys(present).length === 0 && students.length
    ? Object.fromEntries(students.map((s) => [s.roll, Number(s.att) >= 70])) : present;
  const toggle = (roll) => setPresent({ ...initial, [roll]: !initial[roll] });
  const count = Object.values(initial).filter(Boolean).length;
  return (
    <>
      <PageHead title={`My Class — ${MY_CLASS}`} sub="Mr. Saravanan K. · class teacher · Tue 23 Jun"
        right={<span className="pill">{students.length} students</span>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Present today" value={count} delta={`of ${students.length}`} dir="up" />
        <Stat label="Absent" value={students.length - count} delta="tap to change" dir="down" />
        <Stat label="Class size" value={students.length} delta={MY_CLASS} />
        <Stat label="Pending" value="Marks" delta="Half-Yearly Tamil" />
      </div>
      <Card title={<>Take attendance — {MY_CLASS} <button className="btn sm" onClick={() => alert("Attendance saved (POC)")}>Save</button></>}>
        <Loading state={list}>
          <div className="grid g4" style={{ gap: 9 }}>
            {students.map((s) => {
              const p = initial[s.roll];
              return (
                <div className="att-cell" key={s.roll} onClick={() => toggle(s.roll)}>
                  <div><div className="nm">{s.name}</div><div className="rn">Roll {s.roll}</div></div>
                  <div className={`pres ${p ? "p-yes" : "p-no"}`}>{p ? "P" : "A"}</div>
                </div>
              );
            })}
          </div>
          <div className="mini" style={{ marginTop: 10 }}>Tap a card to toggle present/absent.</div>
        </Loading>
      </Card>
    </>
  );
}

function Students() {
  const list = useApi(() => api.listStudents(MY_CLASS), []);
  const [form, setForm] = useState(null);      // {student} | {student:null} when open
  const [profileId, setProfileId] = useState(null);
  const done = () => { setForm(null); list.reload(); };
  return (
    <>
      <PageHead title="Students" sub="View, add & edit your class (saved to the database)"
        right={<button className="btn" onClick={() => setForm({ student: null })}>＋ Add student</button>} />
      <Card>
        <Loading state={list}>
          <table>
            <thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Attendance</th><th>Guardian</th><th>Phone</th><th></th></tr></thead>
            <tbody>
              {(list.data || []).map((s) => (
                <tr key={s.id}>
                  <td>{s.roll}</td>
                  <td><b style={{ cursor: "pointer" }} onClick={() => setProfileId(s.id)}>{s.name}</b></td>
                  <td>{s.cls}</td><td>{s.att}%</td><td>{s.guardian}</td><td className="mini">{s.phone}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="mini link" onClick={() => setProfileId(s.id)}>View</span>
                    {" · "}
                    <span className="mini link" onClick={() => setForm({ student: s })}>Edit</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Loading>
      </Card>

      {form && (
        <StudentForm
          student={form.student}
          classes={classes}
          lockedClass={MY_CLASS}
          onClose={() => setForm(null)}
          onSaved={done}
        />
      )}
      {profileId && (
        <StudentProfile
          id={profileId}
          onClose={() => setProfileId(null)}
          onEdit={(s) => { setProfileId(null); setForm({ student: s }); }}
        />
      )}
    </>
  );
}

function Results() {
  const [mode, setMode] = useState("create");
  const exams = useApi(() => api.getExams(), []);
  const tabs = [
    { id: "create", name: "① Create exam (8-A)" },
    { id: "enter", name: "② Enter marks — Tamil · 9-A" },
  ];
  return (
    <>
      <PageHead title="Exam Results" sub="Create exams (class teacher) · enter marks for your subject" />
      <Tabs items={tabs} value={mode} onChange={setMode} />
      {mode === "create" ? (
        <>
          <div className="notice">As 8-A class teacher you create the exam and its subjects. Admin then grants each subject teacher access to enter their subject's marks.</div>
          <div className="grid g2">
            <Card title="New exam">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="compose" style={{ display: "block", width: "100%" }} defaultValue="Mid Term 1" />
                <div className="mini">Subjects (each assigned to its teacher):</div>
                {subjects.map((s) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 9, padding: "9px 12px" }}>
                    <b style={{ fontSize: 13, flex: 1 }}>{s}</b>
                    <span className="mini">teacher: {s === "Tamil" ? "Mr. Saravanan" : s === "Maths" ? "Mrs. Geetha" : "— assign —"}</span>
                  </div>
                ))}
                <button className="btn" onClick={() => alert("Exam created (POC)")}>Create exam</button>
              </div>
            </Card>
            <Card title="Existing exams">
              <Loading state={exams}>
                {(exams.data || []).map((x) => (
                  <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 0", borderBottom: "1px solid rgba(42,47,99,.5)" }}>
                    <b style={{ flex: 1, fontSize: 13 }}>{x.name}</b>
                    <span className={`badge ${x.status === "open" ? "b-warn" : "b-good"}`}>{x.status === "open" ? "marks open" : "locked"}</span>
                  </div>
                ))}
              </Loading>
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="notice">You teach <b>Tamil to 9-A</b> (cross-class access granted by admin). You can enter Tamil marks for 9-A only.</div>
          <Card title={<>Mid Term 1 · Tamil · Class 9-A <button className="btn sm" onClick={() => alert("Marks saved (POC)")}>Save marks</button></>}>
            <table>
              <thead><tr><th>Roll</th><th>Student</th><th>Tamil / 100</th></tr></thead>
              <tbody>
                {["Anitha R.", "Bala S.", "Charan V.", "Deepa M.", "Esakki P.", "Fareed K."].map((n, i) => (
                  <tr key={i}><td>{i + 1}</td><td>{n}</td>
                    <td><input style={{ width: 80, background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--txt)", borderRadius: 7, padding: "6px 9px" }} defaultValue={70 + i * 3} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}

function Notes() {
  const [text, setText] = useState("");
  const msgs = useApi(() => api.getMessages(), []);
  const recent = ((msgs.data && msgs.data.studentFeed) || []).filter((m) => m.role === "teacher");
  const post = async () => { if (!text.trim()) return; await api.postTeacherNote(text.trim()); setText(""); alert("Note posted — visible on the student's page."); msgs.reload(); };
  return (
    <>
      <PageHead title="Notes to Parent / Student" sub="Your note appears on the student's page" />
      <div className="grid g2">
        <Card title="Post a note">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <select className="compose" style={{ width: "100%" }}>
              <option>Aarav Anand (8-A)</option><option>Whole class 8-A</option>
            </select>
            <textarea className="compose" style={{ width: "100%", minHeight: 90 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Please ensure homework is completed…" />
            <button className="btn" onClick={post}>Post note</button>
          </div>
        </Card>
        <Card title="Recent notes"><Loading state={msgs}>{recent.map((m, i) => <Message m={m} key={i} />)}</Loading></Card>
      </div>
    </>
  );
}

function Messages() {
  const msgs = useApi(() => api.getMessages(), []);
  const [replies, setReplies] = useState({});
  const send = async (id) => { const t = (replies[id] || "").trim(); if (!t) return; await api.replyToPrincipal(id, t); setReplies({ ...replies, [id]: "" }); msgs.reload(); };
  const inbox = (msgs.data && msgs.data.teacherInbox) || [];
  const general = (msgs.data && msgs.data.teacherGeneral) || [];
  return (
    <>
      <PageHead title="Messages" sub="General notices & direct messages from the principal" />
      <div className="grid g2">
        <Card title="📢 General (all teachers)"><Loading state={msgs}>{general.map((m, i) => <Message m={m} key={i} />)}</Loading></Card>
        <Card title={<>📩 Direct from principal <span className="mini">private to you</span></>}>
          <Loading state={msgs}>
            {inbox.map((m) => (
              <div key={m.id}>
                <Message m={m} />
                {m.reply ? (
                  <div className="msg" style={{ marginLeft: 30, background: "var(--panel)" }}>
                    <div className="av" style={{ background: "var(--warn)" }}>S</div>
                    <div style={{ flex: 1 }}><div className="from">You replied</div><div className="text">{m.reply}</div></div>
                  </div>
                ) : (
                  <div className="compose">
                    <input value={replies[m.id] || ""} onChange={(e) => setReplies({ ...replies, [m.id]: e.target.value })} placeholder="Reply to principal…" />
                    <button className="btn" onClick={() => send(m.id)}>Reply</button>
                  </div>
                )}
              </div>
            ))}
          </Loading>
        </Card>
      </div>
    </>
  );
}

export const teacherNav = [
  { key: "dashboard", label: "My Class",        icon: "🏠", Component: Dashboard },
  { key: "students", label: "Students",         icon: "🎓", Component: Students },
  { key: "results", label: "Exam Results",      icon: "📊", Component: Results },
  { key: "notes", label: "Notes to Parent",     icon: "📝", Component: Notes },
  { key: "messages", label: "Messages",         icon: "💬", Component: Messages },
];
