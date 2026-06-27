// STUDENT role screens — live data from the API (read-only, except posting).
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Bar, Tabs, FeeBadge, Message, Calendar, Loading, money } from "../components/ui.jsx";

const SID = api.DEMO_STUDENT_ID;

function Dashboard() {
  const { setView } = useApp();
  const events = useApi(() => api.getEvents(), []);
  const msgs = useApi(() => api.getMessages(), []);
  return (
    <>
      <PageHead title="Hi, Aarav 👋" sub="Class 8-A · Roll 12 · read-only access"
        right={<span className="pill">🟢 Tue, 23 Jun 2026</span>} />
      <div className="grid g2" style={{ marginTop: 4 }}>
        <Card title={<>Upcoming events <a className="mini" style={{ cursor: "pointer" }} onClick={() => setView("events")}>View all ›</a></>}>
          <Loading state={events}>
            {(events.data || []).slice(0, 4).map((e, i) => (
              <div className="event" key={i}>
                <div className="dt"><div className="d">{e.d}</div><div className="m">{e.m}</div></div>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{e.t}</div><div className="mini">{e.s}</div></div>
              </div>
            ))}
          </Loading>
        </Card>
        <Card title={<>Latest from school 💬 <a className="mini" style={{ cursor: "pointer" }} onClick={() => setView("messages")}>Open ›</a></>}>
          <Loading state={msgs}>
            {((msgs.data && msgs.data.studentFeed) || []).map((m, i) => <Message m={m} key={i} />)}
          </Loading>
        </Card>
      </div>
    </>
  );
}

function Attendance() {
  const att = useApi(() => api.getStudentAttendance(SID), []);
  const rows = att.data || [];
  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const late = rows.filter((r) => r.status === "late").length;
  const pct = rows.length ? Math.round((present / rows.length) * 100) : 0;
  const absentDaysJune = rows
    .filter((r) => r.status === "absent" && r.date.startsWith("2026-06"))
    .map((r) => Number(r.date.slice(8, 10)));
  return (
    <>
      <PageHead title="My Attendance" sub="Calendar view — June 2026"
        right={<span className="pill">Term: {pct}%</span>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Present" value={present} delta="days" dir="up" />
        <Stat label="Absent" value={absent} delta="days" dir="down" />
        <Stat label="Late" value={late} delta="days" />
        <Stat label="Term %" value={pct + "%"} delta="overall" dir="up" />
      </div>
      <Card title="June 2026">
        <Loading state={att}>
          <Calendar absent={absentDaysJune} />
          <div className="legend">
            <span><span className="sq" style={{ background: "rgba(74,222,128,.4)" }} /> Present</span>
            <span><span className="sq" style={{ background: "rgba(255,92,124,.4)" }} /> Absent</span>
            <span><span className="sq" style={{ background: "var(--panel)" }} /> Holiday / weekend</span>
          </div>
        </Loading>
      </Card>
    </>
  );
}

function Results() {
  const exams = useApi(() => api.getExams(), []);
  const [examId, setExamId] = useState(null);
  const current = examId || (exams.data && exams.data.length ? exams.data[exams.data.length - 1].id : null);
  const marks = useApi(() => (current ? api.getMarks(current, SID) : Promise.resolve([])), [current]);

  const rows = marks.data || [];
  const total = rows.reduce((a, r) => a + Number(r.mark), 0);
  const pct = rows.length ? Math.round(total / rows.length) : 0;
  return (
    <>
      <PageHead title="Exam Results" sub={`All exams · Academic Year ${config.school.academicYear}`} />
      <Loading state={exams}>
        <Tabs items={(exams.data || []).map((e) => ({ id: e.id, name: e.name }))} value={current} onChange={setExamId} />
        <div className="grid g2">
          <Card title="Subject marks">
            <Loading state={marks}>
              <table>
                <thead><tr><th>Subject</th><th>Marks</th><th>/100</th><th>Grade</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const m = Number(r.mark);
                    const cls = m >= 80 ? "b-good" : m >= 60 ? "b-warn" : "b-bad";
                    return <tr key={r.subjectId}><td>{r.subject}</td><td><b>{m}</b></td><td className="mini">100</td><td><span className={`badge ${cls}`}>{config.academics.grade(m)}</span></td></tr>;
                  })}
                  <tr><td><b>Overall</b></td><td colSpan={2}></td><td><span className="badge b-pri">{pct}%</span></td></tr>
                </tbody>
              </table>
            </Loading>
          </Card>
          <Card title="Performance">
            <Loading state={marks}>
              {rows.map((r) => <Bar key={r.subjectId} name={r.subject} pct={Number(r.mark)} />)}
            </Loading>
          </Card>
        </div>
      </Loading>
    </>
  );
}

function Timetable() {
  const tt = api.getTimetable();
  return (
    <>
      <PageHead title="My Timetable" sub="Class 8-A · weekly" />
      <Card>
        <div className="ttg">
          <div className="h">Day</div>
          {["P1", "P2", "P3", "P4", "P5", "P6"].map((p) => <div className="h" key={p}>{p}</div>)}
          {tt.map((r) => (
            <React.Fragment key={r[0]}>
              <div className="dd">{r[0]}</div>
              {r.slice(1).map((c, i) => <div className="c" key={i}><b>{c}</b></div>)}
            </React.Fragment>
          ))}
        </div>
      </Card>
    </>
  );
}

function Events() {
  const events = useApi(() => api.getEvents(), []);
  return (
    <>
      <PageHead title="Events & News" sub="Announcements from the school" />
      <Card>
        <Loading state={events}>
          {(events.data || []).map((e, i) => (
            <div className="event" key={i}>
              <div className="dt"><div className="d">{e.d}</div><div className="m">{e.m}</div></div>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{e.t}</div><div className="mini">{e.s}</div></div>
            </div>
          ))}
        </Loading>
      </Card>
    </>
  );
}

function Notes() {
  const msgs = useApi(() => api.getMessages(), []);
  const notes = ((msgs.data && msgs.data.studentFeed) || []).filter((m) => m.role === "teacher");
  return (
    <>
      <PageHead title="Teacher Notes" sub="Notes posted by your teachers" />
      <Card><Loading state={msgs}>{notes.map((m, i) => <Message m={m} key={i} />)}</Loading></Card>
    </>
  );
}

function Messages() {
  const [text, setText] = useState("");
  const msgs = useApi(() => api.getMessages(), []);
  const send = async () => { if (!text.trim()) return; await api.postStudentMessage(text.trim()); setText(""); msgs.reload(); };
  return (
    <>
      <PageHead title="Messages" sub="From school · and your posts to teacher/parent (visible to teacher & principal)" />
      <div className="grid g2">
        <Card title="📥 From school">
          <Loading state={msgs}>{((msgs.data && msgs.data.studentFeed) || []).map((m, i) => <Message m={m} key={i} />)}</Loading>
        </Card>
        <Card title={<>📤 My messages <span className="mini">seen by class teacher & principal</span></>}>
          <Loading state={msgs}>{((msgs.data && msgs.data.studentPosts) || []).map((m, i) => <Message m={m} key={i} />)}</Loading>
          <div className="compose">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message to your teacher / parent…" />
            <button className="btn" onClick={send}>Send</button>
          </div>
        </Card>
      </div>
    </>
  );
}

function Fees() {
  const fees = useApi(() => api.getFees(SID), []);
  const f = fees.data || { total: 0, paid: 0, terms: [] };
  const pending = f.total - f.paid;
  return (
    <>
      <PageHead title="Fees" sub={`Academic Year ${config.school.academicYear}`} />
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label="Total fee" value={money(f.total)} delta="for the year" />
        <Stat label="Paid" value={money(f.paid)} delta="received" dir="up" />
        <Stat label="Pending" value={money(pending)} delta="due" dir="down" />
      </div>
      <Card title="Breakdown">
        <Loading state={fees}>
          <table>
            <thead><tr><th>Item</th><th>Amount</th><th>Paid</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {f.terms.map((t, i) => {
                const st = Number(t.paid) >= Number(t.due) ? "Paid" : Number(t.paid) > 0 ? "Partial" : "Pending";
                return <tr key={i}><td>{t.term}</td><td>{money(t.due)}</td><td>{money(t.paid)}</td><td><FeeBadge status={st} /></td><td className="mini">{t.date}</td></tr>;
              })}
            </tbody>
          </table>
        </Loading>
      </Card>
    </>
  );
}

export const studentNav = [
  { key: "dashboard", label: "Dashboard",    icon: "🏠", Component: Dashboard },
  { key: "attendance", label: "Attendance",  icon: "🗓️", Component: Attendance },
  { key: "results", label: "Exam Results",   icon: "📊", Component: Results },
  { key: "timetable", label: "Timetable",    icon: "🕐", Component: Timetable },
  { key: "events", label: "Events & News",   icon: "📣", Component: Events },
  { key: "notes", label: "Teacher Notes",    icon: "📝", Component: Notes },
  { key: "messages", label: "Messages",      icon: "💬", Component: Messages },
  { key: "fees", label: "Fees",              icon: "💰", Component: Fees },
];
