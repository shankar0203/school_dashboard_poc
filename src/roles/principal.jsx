// PRINCIPAL / ADMIN role screens.
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Bar, Tabs, FeeBadge, Message, money } from "../components/ui.jsx";

const { classes, exams } = config.academics;

function Dashboard() {
  const { setView } = useApp();
  const catt = api.getClassAttendance();
  return (
    <>
      <PageHead title="School Dashboard" sub={`${config.school.name} · AY ${config.school.academicYear} · Tue 23 Jun`}
        right={<span className="pill">🟢 Live overview</span>} />
      <div className="notice">💡 Items marked <span className="sugg">Suggested</span> are dashboard widgets proposed for your review — tell us which to keep.</div>
      <div className="grid g4">
        <Stat label="Students" value="480" delta="12 classes" />
        <Stat label="Present today" value="441" delta="91.8%" dir="up" />
        <Stat label="Fees collected" value="68%" delta="₹14.2L of ₹21L" dir="up"
          suffix={<span className="sugg" style={{ position: "relative", top: 6 }}>Suggested</span>} />
        <Stat label="Teachers" value="26" delta="2 on leave" />
      </div>
      <div className="grid g2" style={{ marginTop: 15 }}>
        <Card title={<>Attendance by class — today <a className="mini" style={{ cursor: "pointer" }} onClick={() => setView("attendance")}>Full report ›</a></>}>
          {["8-B", "12-A", "6-A", "9-A"].map((c) => <Bar key={c} name={"Class " + c} pct={catt[c]} />)}
        </Card>
        <Card title={<>⚠️ Needs attention <span className="sugg">Suggested</span></>}>
          {[
            { c: "var(--bad)", a: "!", t: "3 classes haven't submitted attendance", s: "7-A, 10-B, 11-A — pending today" },
            { c: "var(--warn)", a: "₹", t: "38 students fee overdue", s: "Total pending ₹2.4L · due 30 Jun" },
            { c: "var(--info)", a: "↓", t: "5 students below 75% attendance", s: "Auto-flag for parent SMS" },
          ].map((x, i) => (
            <div className="msg" key={i}>
              <div className="av" style={{ background: x.c }}>{x.a}</div>
              <div style={{ flex: 1 }}><div className="from">{x.t}</div><div className="text mini">{x.s}</div></div>
            </div>
          ))}
        </Card>
      </div>
      <div className="grid g3" style={{ marginTop: 15 }}>
        <Card title={<>Latest exam <span className="sugg">Suggested</span></>}>
          <div style={{ fontSize: 13 }}>Half-Yearly pass rate</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "var(--good)", margin: "6px 0" }}>94%</div>
          <div className="mini">Top: 12-A · Lowest: 9-A</div>
        </Card>
        <Card title={<>New admissions <span className="sugg">Suggested</span></>}>
          <div style={{ fontSize: 30, fontWeight: 800, margin: "6px 0" }}>+12</div>
          <div className="mini">This month · YoY +8%</div>
        </Card>
        <Card title="Quick actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn ghost sm" onClick={() => setView("messages")}>📢 Post announcement</button>
            <button className="btn ghost sm" onClick={() => setView("results")}>📋 View exam results</button>
            <button className="btn ghost sm" onClick={() => setView("fees")}>💰 Fees status</button>
          </div>
        </Card>
      </div>
    </>
  );
}

function Attendance() {
  const catt = api.getClassAttendance();
  return (
    <>
      <PageHead title="Attendance Report" sub="School overall + class-wise · today"
        right={<span className="pill">School: 91.8%</span>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Present" value="441" delta="of 480" dir="up" />
        <Stat label="Absent" value="39" delta="8.2%" dir="down" />
        <Stat label="Best class" value="12-A" delta="97%" dir="up" />
        <Stat label="Lowest class" value="9-A" delta="83%" dir="down" />
      </div>
      <Card title="Class-wise attendance">
        <div className="grid g2" style={{ gap: "4px 30px" }}>
          {classes.map((c) => <Bar key={c} name={"Class " + c} pct={catt[c]} />)}
        </div>
      </Card>
    </>
  );
}

function Students() {
  const [cls, setCls] = useState("8-A");
  const list = api.listStudents(cls);
  return (
    <>
      <PageHead title="Students" sub="Class-wise · open a student to get parent contact" />
      <Tabs items={classes.slice(0, 8).map((c) => ({ id: c, name: c }))} value={cls} onChange={setCls} />
      <Card title={<>Class {cls} <span className="mini">{list.length} students shown</span></>}>
        <table>
          <thead><tr><th>Roll</th><th>Name</th><th>Attendance</th><th>Guardian</th><th>Phone</th><th>Fees</th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.roll}><td>{s.roll}</td><td><b>{s.name}</b></td><td>{s.att}%</td>
                <td>{s.guardian}</td><td className="mini">{s.phone}</td><td><FeeBadge status={s.fee} /></td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Results() {
  const [exam, setExam] = useState("hy");
  return (
    <>
      <PageHead title="Exam Results" sub="Select an exam to view school-wide results" />
      <Tabs items={exams} value={exam} onChange={setExam} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Appeared" value="476" delta="of 480" />
        <Stat label="Pass rate" value="94%" delta="+2% vs last" dir="up" />
        <Stat label="School avg" value="78%" delta="all subjects" dir="up" />
        <Stat label="Distinctions" value="112" delta="≥75%" dir="up" />
      </div>
      <Card title={`${exams.find((x) => x.id === exam).name} — class averages`}>
        <table>
          <thead><tr><th>Class</th><th>Avg %</th><th>Pass %</th><th>Top subject</th><th>Weakest</th></tr></thead>
          <tbody>
            {["6-A", "7-A", "8-A", "9-A", "10-A", "12-A"].map((c, i) => (
              <tr key={c}><td><b>{c}</b></td><td>{82 - i * 2}%</td><td>{98 - i}%</td><td>Science</td><td>{i % 2 ? "Maths" : "Social"}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Messages() {
  const { bump } = useApp();
  const [mode, setMode] = useState("students");
  const [draft, setDraft] = useState("");
  const msgs = api.getMessages();
  const tabs = [
    { id: "students", name: "📣 To students" },
    { id: "teachers", name: "👩‍🏫 To all teachers" },
    { id: "direct", name: "📩 Direct to a teacher" },
  ];
  const send = () => {
    const t = draft.trim(); if (!t) return;
    if (mode === "students") api.principalBroadcastStudents(t);
    if (mode === "teachers") api.principalBroadcastTeachers(t);
    if (mode === "direct") api.principalDirectMessage(t);
    setDraft(""); alert("Message sent (POC)."); bump();
  };
  return (
    <>
      <PageHead title="Messages" sub="Broadcast to students, broadcast to teachers, or message one teacher privately" />
      <Tabs items={tabs} value={mode} onChange={(m) => { setMode(m); setDraft(""); }} />
      {mode === "students" && (
        <Card title="Announcement → appears on every student's page">
          <div className="compose">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. School closed Monday for maintenance" />
            <button className="btn" onClick={send}>Publish</button>
          </div>
          <div style={{ marginTop: 14 }}>{msgs.studentFeed.filter((m) => m.role === "principal").map((m, i) => <Message m={m} key={i} />)}</div>
        </Card>
      )}
      {mode === "teachers" && (
        <Card title="General message → all teachers only">
          <div className="compose">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Staff meeting Friday 4 PM" />
            <button className="btn" onClick={send}>Send to all</button>
          </div>
          <div style={{ marginTop: 14 }}>{msgs.teacherGeneral.map((m, i) => <Message m={m} key={i} />)}</div>
        </Card>
      )}
      {mode === "direct" && (
        <>
          <div className="notice">Private message to one teacher's inbox. They can reply — the thread stays between you two.</div>
          <Card title="Direct message">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select className="compose" style={{ width: "100%" }}>
                <option>Mr. Saravanan — 8-A class teacher</option><option>Mrs. Geetha — Maths</option><option>Ms. Rachel — English</option>
              </select>
              <textarea className="compose" style={{ width: "100%", minHeight: 80 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Why is 8-A maths average dropping?" />
              <button className="btn" onClick={send}>Send privately</button>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="ct">Sent</div>
              {msgs.teacherInbox.map((m, i) => (
                <div key={i}>
                  <Message m={{ ...m, from: "You → Mr. Saravanan" }} />
                  {m.reply
                    ? <div className="msg" style={{ marginLeft: 30, background: "var(--panel)" }}><div className="av" style={{ background: "var(--warn)" }}>S</div><div style={{ flex: 1 }}><div className="from">Mr. Saravanan replied</div><div className="text">{m.reply}</div></div></div>
                    : <div className="mini" style={{ marginLeft: 30 }}>No reply yet</div>}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function Fees() {
  const students = api.listStudents();
  return (
    <>
      <PageHead title="Fees Status" sub="Collection overview · class-wise paid status" />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Target" value="₹21.0L" delta="term" />
        <Stat label="Collected" value="₹14.2L" delta="68%" dir="up" />
        <Stat label="Pending" value="₹6.8L" delta="32%" dir="down" />
        <Stat label="Defaulters" value="38" delta="students" dir="down" />
      </div>
      <Card title="Paid status — sample (Class 8-A)">
        <table>
          <thead><tr><th>Roll</th><th>Student</th><th>Guardian</th><th>Status</th><th>Phone</th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.roll}><td>{s.roll}</td><td><b>{s.name}</b></td><td>{s.guardian}</td><td><FeeBadge status={s.fee} /></td><td className="mini">{s.phone}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export const principalNav = [
  { key: "dashboard", label: "Dashboard",     icon: "📊", Component: Dashboard },
  { key: "attendance", label: "Attendance",   icon: "🗓️", Component: Attendance },
  { key: "students", label: "Students",       icon: "🎓", Component: Students },
  { key: "results", label: "Exam Results",    icon: "📋", Component: Results },
  { key: "messages", label: "Messages",       icon: "💬", Component: Messages },
  { key: "fees", label: "Fees Status",        icon: "💰", Component: Fees },
];
