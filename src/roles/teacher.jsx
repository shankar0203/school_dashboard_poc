// TEACHER role screens.
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Tabs, Message } from "../components/ui.jsx";

const { subjects, exams } = config.academics;

function Dashboard() {
  const { bump } = useApp();
  const students = api.listStudents();
  const [present, setPresent] = useState(() =>
    Object.fromEntries(students.map((s) => [s.roll, s.att >= 70]))
  );
  const toggle = (roll) => setPresent((p) => ({ ...p, [roll]: !p[roll] }));
  const count = Object.values(present).filter(Boolean).length;
  return (
    <>
      <PageHead title="My Class — 8-A" sub="Mr. Saravanan K. · class teacher · Tue 23 Jun"
        right={<span className="pill">{students.length} students · {count} present</span>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Present today" value={count} delta={`of ${students.length}`} dir="up" />
        <Stat label="Absent" value={students.length - count} delta="tap cards to change" dir="down" />
        <Stat label="Class attendance" value="92%" delta="term avg" dir="up" />
        <Stat label="Pending" value="Marks" delta="Half-Yearly Tamil" />
      </div>
      <Card title={<>Take attendance — 8-A <button className="btn sm" onClick={() => alert("Attendance saved for 8-A (POC)")}>Save</button></>}>
        <div className="grid g4" style={{ gap: 9 }}>
          {students.map((s) => {
            const p = present[s.roll];
            return (
              <div className="att-cell" key={s.roll} onClick={() => toggle(s.roll)}>
                <div><div className="nm">{s.name}</div><div className="rn">Roll {s.roll}</div></div>
                <div className={`pres ${p ? "p-yes" : "p-no"}`}>{p ? "P" : "A"}</div>
              </div>
            );
          })}
        </div>
        <div className="mini" style={{ marginTop: 10 }}>Tap a card to toggle present/absent.</div>
      </Card>
    </>
  );
}

function Students() {
  const { bump } = useApp();
  const students = api.listStudents();
  const add = () => {
    const name = prompt("New student name:");
    if (!name) return;
    const cls = prompt("Class (e.g. 8-A):", "8-A") || "8-A";
    api.addStudent({ name, cls });
    alert(`${name} added — saved to backend (POC).`);
    bump();
  };
  return (
    <>
      <PageHead title="Students" sub="View & edit all students · add new (saves to backend)"
        right={<button className="btn" onClick={add}>＋ Add student</button>} />
      <Card>
        <table>
          <thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Attendance</th><th>Guardian</th><th>Phone</th><th></th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.roll}>
                <td>{s.roll}</td><td><b>{s.name}</b></td><td>{s.cls}</td><td>{s.att}%</td>
                <td>{s.guardian}</td><td className="mini">{s.phone}</td>
                <td><span className="mini" style={{ cursor: "pointer", color: "var(--pri2)" }} onClick={() => alert(`Edit ${s.name} (POC form)`)}>Edit ›</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Results() {
  const [mode, setMode] = useState("create");
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
                <button className="btn" onClick={() => alert("Exam created. Admin can now grant subject access. (POC)")}>Create exam</button>
              </div>
            </Card>
            <Card title="Existing exams">
              {exams.map((x) => (
                <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 0", borderBottom: "1px solid rgba(42,47,99,.5)" }}>
                  <b style={{ flex: 1, fontSize: 13 }}>{x.name}</b>
                  <span className={`badge ${x.id === "hy" ? "b-warn" : "b-good"}`}>{x.id === "hy" ? "marks open" : "locked"}</span>
                </div>
              ))}
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="notice">You teach <b>Tamil to 9-A</b> (cross-class access granted by admin). You can enter Tamil marks for 9-A only — not other subjects or classes.</div>
          <Card title={<>Mid Term 1 · Tamil · Class 9-A <button className="btn sm" onClick={() => alert("Tamil marks saved for 9-A (POC)")}>Save marks</button></>}>
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
  const { bump } = useApp();
  const [text, setText] = useState("");
  const recent = api.getMessages().studentFeed.filter((m) => m.role === "teacher");
  const post = () => { if (!text.trim()) return; api.postTeacherNote(text.trim()); setText(""); alert("Note posted — now visible on the student's page."); bump(); };
  return (
    <>
      <PageHead title="Notes to Parent / Student" sub="Your note appears on the student's page" />
      <div className="grid g2">
        <Card title="Post a note">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <select className="compose" style={{ width: "100%" }}>
              <option>Aarav Anand (8-A)</option><option>Karthik Raja (8-A)</option><option>Whole class 8-A</option>
            </select>
            <textarea className="compose" style={{ width: "100%", minHeight: 90 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Please ensure homework is completed…" />
            <button className="btn" onClick={post}>Post note</button>
          </div>
        </Card>
        <Card title="Recent notes">{recent.map((m, i) => <Message m={m} key={i} />)}</Card>
      </div>
    </>
  );
}

function Messages() {
  const { bump } = useApp();
  const msgs = api.getMessages();
  const [replies, setReplies] = useState({});
  const send = (i) => { const t = (replies[i] || "").trim(); if (!t) return; api.replyToPrincipal(i, t); bump(); };
  return (
    <>
      <PageHead title="Messages" sub="General notices & direct messages from the principal" />
      <div className="grid g2">
        <Card title="📢 General (all teachers)">{msgs.teacherGeneral.map((m, i) => <Message m={m} key={i} />)}</Card>
        <Card title={<>📩 Direct from principal <span className="mini">private to you</span></>}>
          {msgs.teacherInbox.map((m, i) => (
            <div key={i}>
              <Message m={m} />
              {m.reply ? (
                <div className="msg" style={{ marginLeft: 30, background: "var(--panel)" }}>
                  <div className="av" style={{ background: "var(--warn)" }}>S</div>
                  <div style={{ flex: 1 }}><div className="from">You replied</div><div className="text">{m.reply}</div></div>
                </div>
              ) : (
                <div className="compose">
                  <input value={replies[i] || ""} onChange={(e) => setReplies({ ...replies, [i]: e.target.value })} placeholder="Reply to principal…" />
                  <button className="btn" onClick={() => send(i)}>Reply</button>
                </div>
              )}
            </div>
          ))}
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
