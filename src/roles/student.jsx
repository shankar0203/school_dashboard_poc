// STUDENT role screens (read-only, except posting a message).
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Bar, Tabs, FeeBadge, Message, Calendar, money } from "../components/ui.jsx";

const { subjects, exams, grade } = config.academics;

function Dashboard() {
  const { setView } = useApp();
  const events = api.getEvents();
  const feed = api.getMessages().studentFeed;
  return (
    <>
      <PageHead title="Hi, Aarav 👋" sub="Class 8-A · Roll 12 · read-only access"
        right={<span className="pill">🟢 Tue, 23 Jun 2026</span>} />
      <div className="grid g4">
        <Stat label="Attendance" value="94%" delta="this term" dir="up" />
        <Stat label="Latest exam" value="85%" delta="Half-Yearly overall" dir="up" />
        <Stat label="Fees" value={money(16000)} delta="pending" dir="down" />
        <Stat label="Next exam" value="Unit Test 2" delta="in 12 days" />
      </div>
      <div className="grid g2" style={{ marginTop: 15 }}>
        <Card title={<>Upcoming events <a className="mini" style={{ cursor: "pointer" }} onClick={() => setView("events")}>View all ›</a></>}>
          {events.slice(0, 3).map((e, i) => (
            <div className="event" key={i}>
              <div className="dt"><div className="d">{e.d}</div><div className="m">{e.m}</div></div>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{e.t}</div><div className="mini">{e.s}</div></div>
            </div>
          ))}
        </Card>
        <Card title={<>Latest from school 💬 <a className="mini" style={{ cursor: "pointer" }} onClick={() => setView("messages")}>Open ›</a></>}>
          {feed.map((m, i) => <Message m={m} key={i} />)}
        </Card>
      </div>
    </>
  );
}

function Attendance() {
  return (
    <>
      <PageHead title="My Attendance" sub="Calendar view — June 2026"
        right={<span className="pill">Term total: 142 / 151 · 94%</span>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Present" value="142" delta="days" dir="up" />
        <Stat label="Absent" value="9" delta="days" dir="down" />
        <Stat label="Late" value="2" delta="days" />
        <Stat label="This month" value="21 / 23" delta="June" dir="up" />
      </div>
      <Card title="June 2026">
        <Calendar absent={[5, 12, 19]} />
        <div className="legend">
          <span><span className="sq" style={{ background: "rgba(74,222,128,.4)" }} /> Present</span>
          <span><span className="sq" style={{ background: "rgba(255,92,124,.4)" }} /> Absent</span>
          <span><span className="sq" style={{ background: "var(--panel)" }} /> Holiday / weekend</span>
        </div>
      </Card>
    </>
  );
}

function Results() {
  const [exam, setExam] = useState("hy");
  const marks = api.getMyMarks(exam);
  const total = marks.reduce((a, b) => a + b, 0);
  const pct = Math.round(total / subjects.length);
  return (
    <>
      <PageHead title="Exam Results" sub={`All exams · Academic Year ${config.school.academicYear}`} />
      <Tabs items={exams} value={exam} onChange={setExam} />
      <div className="grid g2">
        <Card title={`${exams.find((x) => x.id === exam).name} — subject marks`}>
          <table>
            <thead><tr><th>Subject</th><th>Marks</th><th>/100</th><th>Grade</th></tr></thead>
            <tbody>
              {subjects.map((s, i) => {
                const m = marks[i];
                const cls = m >= 80 ? "b-good" : m >= 60 ? "b-warn" : "b-bad";
                return <tr key={s}><td>{s}</td><td><b>{m}</b></td><td className="mini">100</td><td><span className={`badge ${cls}`}>{grade(m)}</span></td></tr>;
              })}
              <tr><td><b>Total</b></td><td><b>{total}</b></td><td className="mini">500</td><td><span className="badge b-pri">{pct}%</span></td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="Performance">
          {subjects.map((s, i) => <Bar key={s} name={s} pct={marks[i]} />)}
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <div className="card" style={{ flex: 1, padding: 12, textAlign: "center" }}>
              <div className="mini">Overall</div><div style={{ fontSize: 22, fontWeight: 800, color: "var(--good)" }}>{pct}%</div>
            </div>
            <div className="card" style={{ flex: 1, padding: 12, textAlign: "center" }}>
              <div className="mini">Class rank</div><div style={{ fontSize: 22, fontWeight: 800 }}>6 / 42</div>
            </div>
          </div>
        </Card>
      </div>
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
  const events = api.getEvents();
  return (
    <>
      <PageHead title="Events & News" sub="Announcements from the school" />
      <Card>
        {events.map((e, i) => (
          <div className="event" key={i}>
            <div className="dt"><div className="d">{e.d}</div><div className="m">{e.m}</div></div>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{e.t}</div><div className="mini">{e.s}</div></div>
          </div>
        ))}
      </Card>
    </>
  );
}

function Notes() {
  const notes = api.getMessages().studentFeed.filter((m) => m.role === "teacher");
  return (
    <>
      <PageHead title="Teacher Notes" sub="Notes posted by your teachers" />
      <Card>{notes.map((m, i) => <Message m={m} key={i} />)}</Card>
    </>
  );
}

function Messages() {
  const { bump } = useApp();
  const [text, setText] = useState("");
  const msgs = api.getMessages();
  const send = () => { if (!text.trim()) return; api.postStudentMessage(text.trim()); setText(""); bump(); };
  return (
    <>
      <PageHead title="Messages" sub="From school · and your posts to teacher/parent (visible to teacher & principal)" />
      <div className="grid g2">
        <Card title="📥 From school">{msgs.studentFeed.map((m, i) => <Message m={m} key={i} />)}</Card>
        <Card title={<>📤 My messages <span className="mini">seen by class teacher & principal</span></>}>
          {msgs.studentPosts.map((m, i) => <Message m={m} key={i} />)}
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
  const f = api.getFees();
  const pending = f.total - f.paid;
  return (
    <>
      <PageHead title="Fees" sub={`Academic Year ${config.school.academicYear}`} />
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label="Total fee" value={money(f.total)} delta="for the year" />
        <Stat label="Paid" value={money(f.paid)} delta="received" dir="up" />
        <Stat label="Pending" value={money(pending)} delta="due 30 Jun" dir="down" />
      </div>
      <Card title="Breakdown">
        <table>
          <thead><tr><th>Item</th><th>Amount</th><th>Paid</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {f.terms.map((t, i) => {
              const st = t.paid >= t.due ? "Paid" : t.paid > 0 ? "Partial" : "Pending";
              return <tr key={i}><td>{t.term}</td><td>{money(t.due)}</td><td>{money(t.paid)}</td><td><FeeBadge status={st} /></td><td className="mini">{t.date}</td></tr>;
            })}
          </tbody>
        </table>
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
