// PRINCIPAL / ADMIN role screens — live data from the API.
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Bar, Tabs, FeeBadge, Message, Loading } from "../components/ui.jsx";

const { classes } = config.academics;

function Dashboard() {
  const { setView } = useApp();
  const catt = useApi(() => api.getClassAttendance(), []);
  const data = catt.data || {};
  const top4 = Object.keys(data).slice(0, 6);
  return (
    <>
      <PageHead title="School Dashboard" sub={`${config.school.name} · AY ${config.school.academicYear}`}
        right={<span className="pill">🟢 Live overview</span>} />
      <div className="notice">💡 Items marked <span className="sugg">Suggested</span> are proposed widgets — tell us which to keep.</div>
      <div className="grid g4">
        <Stat label="Classes" value={Object.keys(data).length || "—"} delta="with attendance today" />
        <Stat label="Avg attendance" value={avg(data) + "%"} delta="across classes" dir="up" />
        <Stat label="Fees collected" value="—" delta="wire fees summary" suffix={<span className="sugg" style={{ position: "relative", top: 6 }}>Suggested</span>} />
        <Stat label="Teachers" value="—" delta="from users table" />
      </div>
      <div className="grid g2" style={{ marginTop: 15 }}>
        <Card title={<>Attendance by class — today <a className="mini" style={{ cursor: "pointer" }} onClick={() => setView("attendance")}>Full report ›</a></>}>
          <Loading state={catt}>
            {top4.map((c) => <Bar key={c} name={"Class " + c} pct={data[c]} />)}
          </Loading>
        </Card>
        <Card title={<>⚠️ Needs attention <span className="sugg">Suggested</span></>}>
          <div className="msg"><div className="av" style={{ background: "var(--bad)" }}>!</div>
            <div style={{ flex: 1 }}><div className="from">Low-attendance classes auto-flag here</div><div className="text mini">wire from /attendance data</div></div></div>
          <div className="msg"><div className="av" style={{ background: "var(--warn)" }}>₹</div>
            <div style={{ flex: 1 }}><div className="from">Fee defaulters</div><div className="text mini">wire from /fees</div></div></div>
        </Card>
      </div>
    </>
  );
}
const avg = (obj) => {
  const v = Object.values(obj);
  return v.length ? Math.round(v.reduce((a, b) => a + Number(b), 0) / v.length) : 0;
};

function Attendance() {
  const catt = useApi(() => api.getClassAttendance(), []);
  const data = catt.data || {};
  const entries = Object.entries(data);
  const best = entries.reduce((a, b) => (Number(b[1]) > Number(a[1]) ? b : a), ["—", 0]);
  const low = entries.reduce((a, b) => (Number(b[1]) < Number(a[1]) ? b : a), ["—", 100]);
  return (
    <>
      <PageHead title="Attendance Report" sub="Class-wise · today"
        right={<span className="pill">Avg: {avg(data)}%</span>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Classes" value={entries.length} delta="reporting" />
        <Stat label="Average" value={avg(data) + "%"} delta="all classes" dir="up" />
        <Stat label="Best class" value={best[0]} delta={best[1] + "%"} dir="up" />
        <Stat label="Lowest class" value={low[0]} delta={low[1] + "%"} dir="down" />
      </div>
      <Card title="Class-wise attendance">
        <Loading state={catt}>
          <div className="grid g2" style={{ gap: "4px 30px" }}>
            {entries.map(([c, p]) => <Bar key={c} name={"Class " + c} pct={p} />)}
          </div>
        </Loading>
      </Card>
    </>
  );
}

function Students() {
  const [cls, setCls] = useState("8-A");
  const list = useApi(() => api.listStudents(cls), [cls]);
  return (
    <>
      <PageHead title="Students" sub="Class-wise · open a student to get parent contact" />
      <Tabs items={classes.map((c) => ({ id: c, name: c }))} value={cls} onChange={setCls} />
      <Card title={<>Class {cls}</>}>
        <Loading state={list}>
          <table>
            <thead><tr><th>Roll</th><th>Name</th><th>Attendance</th><th>Guardian</th><th>Phone</th><th>Fees</th></tr></thead>
            <tbody>
              {(list.data || []).map((s) => (
                <tr key={s.id}><td>{s.roll}</td><td><b>{s.name}</b></td><td>{s.att}%</td>
                  <td>{s.guardian}</td><td className="mini">{s.phone}</td><td><FeeBadge status={s.fee} /></td></tr>
              ))}
            </tbody>
          </table>
        </Loading>
      </Card>
    </>
  );
}

function Results() {
  const exams = useApi(() => api.getExams(), []);
  const [examId, setExamId] = useState(null);
  const current = examId || (exams.data && exams.data.length ? exams.data[0].id : null);
  return (
    <>
      <PageHead title="Exam Results" sub="Select an exam to view school-wide results" />
      <Loading state={exams}>
        <Tabs items={(exams.data || []).map((e) => ({ id: e.id, name: e.name }))} value={current} onChange={setExamId} />
        <Card title="Class averages">
          <table>
            <thead><tr><th>Class</th><th>Avg %</th><th>Pass %</th><th>Top subject</th><th>Weakest</th></tr></thead>
            <tbody>
              {["6-A", "7-A", "8-A", "9-A", "10-A", "12-A"].map((c, i) => (
                <tr key={c}><td><b>{c}</b></td><td>{82 - i * 2}%</td><td>{98 - i}%</td><td>Science</td><td>{i % 2 ? "Maths" : "Social"}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mini" style={{ marginTop: 10 }}>Aggregates are sample figures — wire to a /results summary endpoint next.</div>
        </Card>
      </Loading>
    </>
  );
}

function Messages() {
  const [mode, setMode] = useState("students");
  const [draft, setDraft] = useState("");
  const msgs = useApi(() => api.getMessages(), []);
  const tabs = [
    { id: "students", name: "📣 To students" },
    { id: "teachers", name: "👩‍🏫 To all teachers" },
    { id: "direct", name: "📩 Direct to a teacher" },
  ];
  const send = async () => {
    const t = draft.trim(); if (!t) return;
    if (mode === "students") await api.principalBroadcastStudents(t);
    if (mode === "teachers") await api.principalBroadcastTeachers(t);
    if (mode === "direct") await api.principalDirectMessage(t);
    setDraft(""); msgs.reload();
  };
  const d = msgs.data || {};
  return (
    <>
      <PageHead title="Messages" sub="Broadcast to students, broadcast to teachers, or message one teacher privately" />
      <Tabs items={tabs} value={mode} onChange={(m) => { setMode(m); setDraft(""); }} />
      {mode === "students" && (
        <Card title="Announcement → appears on every student's page">
          <div className="compose">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. School closed Monday" />
            <button className="btn" onClick={send}>Publish</button>
          </div>
          <div style={{ marginTop: 14 }}><Loading state={msgs}>{(d.studentFeed || []).filter((m) => m.role === "principal").map((m, i) => <Message m={m} key={i} />)}</Loading></div>
        </Card>
      )}
      {mode === "teachers" && (
        <Card title="General message → all teachers only">
          <div className="compose">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Staff meeting Friday 4 PM" />
            <button className="btn" onClick={send}>Send to all</button>
          </div>
          <div style={{ marginTop: 14 }}><Loading state={msgs}>{(d.teacherGeneral || []).map((m, i) => <Message m={m} key={i} />)}</Loading></div>
        </Card>
      )}
      {mode === "direct" && (
        <>
          <div className="notice">Private message to one teacher's inbox. They can reply.</div>
          <Card title="Direct message">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select className="compose" style={{ width: "100%" }}>
                <option>Mr. Saravanan — 8-A class teacher</option><option>Mrs. Geetha — Maths</option>
              </select>
              <textarea className="compose" style={{ width: "100%", minHeight: 80 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Why is 8-A maths average dropping?" />
              <button className="btn" onClick={send}>Send privately</button>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="ct">Sent</div>
              <Loading state={msgs}>
                {(d.teacherInbox || []).map((m) => (
                  <div key={m.id}>
                    <Message m={{ ...m, from: "You → " + m.from }} />
                    {m.reply
                      ? <div className="msg" style={{ marginLeft: 30, background: "var(--panel)" }}><div className="av" style={{ background: "var(--warn)" }}>T</div><div style={{ flex: 1 }}><div className="from">Teacher replied</div><div className="text">{m.reply}</div></div></div>
                      : <div className="mini" style={{ marginLeft: 30 }}>No reply yet</div>}
                  </div>
                ))}
              </Loading>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function Fees() {
  const list = useApi(() => api.listStudents("8-A"), []);
  const students = list.data || [];
  const paid = students.filter((s) => s.fee === "Paid").length;
  const pending = students.filter((s) => s.fee !== "Paid").length;
  return (
    <>
      <PageHead title="Fees Status" sub="Paid status by student" />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Students" value={students.length} delta="class 8-A" />
        <Stat label="Paid" value={paid} delta="fully paid" dir="up" />
        <Stat label="Pending/Partial" value={pending} delta="needs follow-up" dir="down" />
        <Stat label="Collection" value={students.length ? Math.round((paid / students.length) * 100) + "%" : "—"} delta="of class" dir="up" />
      </div>
      <Card title="Paid status — Class 8-A">
        <Loading state={list}>
          <table>
            <thead><tr><th>Roll</th><th>Student</th><th>Guardian</th><th>Status</th><th>Phone</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}><td>{s.roll}</td><td><b>{s.name}</b></td><td>{s.guardian}</td><td><FeeBadge status={s.fee} /></td><td className="mini">{s.phone}</td></tr>
              ))}
            </tbody>
          </table>
        </Loading>
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
