// STUDENT role screens — live data from the API (read-only, except posting).
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Bar, Tabs, FeeBadge, Message, Calendar, Loading, Donut, money } from "../components/ui.jsx";

// SID is resolved from /auth/me at runtime; falls back to demo ID if not linked yet.
// Each component calls useSID() to get the live value.
function useSID() {
  const { meData } = useApp();
  return meData?.studentId || api.DEMO_STUDENT_ID;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function getLocalDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getLocalDateLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const SUBJECT_COLORS = {
  Tamil:   "#ff5c7c",
  English: "#5aa9ff",
  Maths:   "#7c5cff",
  Science: "#34d1bf",
  Social:  "#ffb454",
  Drawing: "#4ade80",
  PT:      "#ff8c42",
};
const subjectColor = (name) => SUBJECT_COLORS[name] || "#9b7bff";

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard() {
  const { setView, meData } = useApp();
  const SID = useSID();
  const today    = getLocalDateStr();
  const todayDay = DAY_NAMES[new Date().getDay()];

  const att    = useApi(() => api.getStudentAttendance(SID), [SID]);
  const exams  = useApi(() => api.getExams(), []);
  const fees   = useApi(() => api.getFees(SID), [SID]);
  const msgs   = useApi(() => api.getMessages(), []);
  const events = useApi(() => api.getEvents(), []);

  // Attendance
  const attRows     = att.data || [];
  const present     = attRows.filter((r) => r.status === "present").length;
  const attPct      = attRows.length ? Math.round((present / attRows.length) * 100) : 0;
  const todayRecord = attRows.find((r) => r.date === today);
  const todayStatus = todayRecord ? todayRecord.status : null;

  // Latest exam avg
  const examList   = exams.data || [];
  const latestExam = examList.length ? examList[examList.length - 1] : null;
  const marks = useApi(
    () => latestExam ? api.getMarks(latestExam.id, SID) : Promise.resolve([]),
    [latestExam && latestExam.id, SID]
  );
  const markRows = marks.data || [];
  const examAvg  = markRows.length
    ? Math.round(markRows.reduce((a, r) => a + Number(r.mark), 0) / markRows.length)
    : null;

  // Fees
  const f      = fees.data || { total: 0, paid: 0, terms: [] };
  const feeDue = f.total - f.paid;

  // Today's timetable (from DB)
  const CLASS_ID_VAL = meData?.classId || (config.academics.classes.indexOf("8-A") + 1);
  const ttData       = useApi(() => api.getTimetableDB(CLASS_ID_VAL), [CLASS_ID_VAL]);
  const ttSchedule   = ttData.data || [];
  const todayRow     = ttSchedule.find((r) => r.day === todayDay);
  const todayPeriods = todayRow ? todayRow.subjects : [];
  const isWeekend    = todayDay === "Saturday" || todayDay === "Sunday";

  // Upcoming events (next 3)
  const upcomingEvents = (events.data || []).slice(0, 3);

  // Notices from school
  const notices = ((msgs.data && msgs.data.studentFeed) || []).slice(0, 3);

  return (
    <>
      {/* ── Banner ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(155,123,255,0.12) 0%, rgba(90,169,255,0.08) 100%)",
        border: "1px solid rgba(155,123,255,0.25)",
        borderRadius: 16, padding: "16px 22px", marginBottom: 18,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>{getLocalDateLabel()}</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>👋 Hi, {meData?.name?.split(" ")[0] || "there"}!</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            {meData?.className ? `Class ${meData.className}` : ""}
            {meData?.roll ? ` · Roll ${meData.roll}` : ""}
            {` · ${config.school.name}`}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {todayStatus === "present" && <span className="badge b-good">✓ Marked present today</span>}
          {todayStatus === "absent"  && <span className="badge b-bad">✗ Marked absent today</span>}
          {!todayStatus && <span className="badge" style={{ background: "rgba(107,113,168,0.2)", color: "var(--muted)" }}>Attendance not yet marked</span>}
          {feeDue > 0 && (
            <div className="mini" style={{ marginTop: 4, color: "var(--bad)", cursor: "pointer" }} onClick={() => setView("fees")}>
              Fee due: {config.app.currency}{Number(feeDue).toLocaleString("en-IN")} →
            </div>
          )}
        </div>
      </div>

      {/* ── Today's timetable ────────────────────────────────────────────── */}
      <Card title={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          📅 Today's Schedule
          <span className="mini" style={{ fontWeight: 400 }}>{todayDay}</span>
        </span>
      } style={{ marginBottom: 18 }}>
        {isWeekend ? (
          <div style={{ padding: "14px 6px", fontSize: 14, color: "var(--muted)" }}>
            🎉 It's the weekend — no classes today!
          </div>
        ) : todayPeriods.length === 0 ? (
          <div className="mini">No timetable for today.</div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "6px 0" }}>
            {todayPeriods.map((sub, i) => (
              <div key={i} style={{
                background: `${subjectColor(sub)}22`,
                border: `1px solid ${subjectColor(sub)}55`,
                borderRadius: 10, padding: "10px 14px", minWidth: 80, textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>P{i + 1}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: subjectColor(sub) }}>{sub}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat
          label="Attendance"
          value={attPct + "%"}
          delta="this term"
          dir={attPct >= 85 ? "up" : attPct >= 75 ? "flat" : "down"}
        />
        <Stat
          label="Latest Exam"
          value={examAvg != null ? examAvg + "%" : "—"}
          delta={latestExam ? latestExam.name : "no exam yet"}
          dir={examAvg != null ? (examAvg >= 60 ? "up" : "down") : "flat"}
        />
        <Stat
          label="Fees Due"
          value={feeDue > 0 ? config.app.currency + Number(feeDue).toLocaleString("en-IN") : "Nil"}
          delta={feeDue > 0 ? "pending" : "all clear"}
          dir={feeDue > 0 ? "down" : "up"}
        />
        <Stat
          label="Upcoming Events"
          value={upcomingEvents.length}
          delta="this month"
        />
      </div>

      {/* ── Bottom row ───────────────────────────────────────────────────── */}
      <div className="grid g2">
        {/* Latest exam subject chart */}
        <Card title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            📊 Latest Exam
            {latestExam && <span className="mini" style={{ fontWeight: 400 }}>{latestExam.name}</span>}
            <a className="mini" style={{ cursor: "pointer", marginLeft: "auto" }} onClick={() => setView("results")}>Full results ›</a>
          </span>
        }>
          <Loading state={marks}>
            {markRows.length === 0 ? (
              <div className="mini">No results yet.</div>
            ) : (
              markRows.map((r) => (
                <div key={r.subjectId} className="subline">
                  <div className="s-nm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: subjectColor(r.subject), flexShrink: 0 }} />
                    {r.subject}
                  </div>
                  <div className="bar" style={{ flex: 1 }}>
                    <i style={{ width: r.mark + "%", background: Number(r.mark) >= 60 ? "#4ade80" : Number(r.mark) >= 35 ? "#ffb454" : "#ff5c7c" }} />
                  </div>
                  <div className="s-mk">{r.mark}</div>
                  <span className={`badge ${Number(r.mark) >= 80 ? "b-good" : Number(r.mark) >= 35 ? "b-warn" : "b-bad"}`} style={{ fontSize: 10, marginLeft: 6 }}>
                    {config.academics.grade(Number(r.mark))}
                  </span>
                </div>
              ))
            )}
          </Loading>
        </Card>

        {/* Notices + Events */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title={<>📢 From School <a className="mini" style={{ cursor: "pointer", marginLeft: "auto" }} onClick={() => setView("messages")}>All ›</a></>}>
            <Loading state={msgs}>
              {notices.length === 0
                ? <div className="mini">No notices.</div>
                : notices.map((m, i) => <Message m={m} key={i} />)}
            </Loading>
          </Card>
          <Card title={<>🗓️ Upcoming <a className="mini" style={{ cursor: "pointer", marginLeft: "auto" }} onClick={() => setView("events")}>All ›</a></>}>
            <Loading state={events}>
              {upcomingEvents.map((e, i) => (
                <div className="event" key={i}>
                  <div className="dt"><div className="d">{e.d}</div><div className="m">{e.m}</div></div>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{e.t}</div><div className="mini">{e.s}</div></div>
                </div>
              ))}
            </Loading>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Attendance ───────────────────────────────────────────────────────────────
function Attendance() {
  const SID = useSID();
  const att = useApi(() => api.getStudentAttendance(SID), [SID]);
  const rows = att.data || [];
  const present = rows.filter((r) => r.status === "present").length;
  const absent  = rows.filter((r) => r.status === "absent").length;
  const late    = rows.filter((r) => r.status === "late").length;
  const pct     = rows.length ? Math.round((present / rows.length) * 100) : 0;
  const absentDaysJune = rows
    .filter((r) => r.status === "absent" && r.date && r.date.startsWith("2026-06"))
    .map((r) => Number(r.date.slice(8, 10)));
  return (
    <>
      <PageHead title="My Attendance" sub="Calendar view — June 2026"
        right={<span className="pill">Term: {pct}%</span>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Present" value={present} delta="days" dir="up" />
        <Stat label="Absent"  value={absent}  delta="days" dir="down" />
        <Stat label="Late"    value={late}    delta="days" />
        <Stat label="Term %"  value={pct + "%"} delta="overall" dir={pct >= 75 ? "up" : "down"} />
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

// ─── Results ─────────────────────────────────────────────────────────────────
function Results() {
  const SID = useSID();
  const exams = useApi(() => api.getExams(), []);
  const [examId, setExamId] = useState(null);
  const current = examId || (exams.data && exams.data.length ? exams.data[exams.data.length - 1].id : null);
  const marks = useApi(() => (current ? api.getMarks(current, SID) : Promise.resolve([])), [current, SID]);

  const rows  = marks.data || [];
  const total = rows.reduce((a, r) => a + Number(r.mark), 0);
  const pct   = rows.length ? Math.round(total / rows.length) : 0;
  return (
    <>
      <PageHead title="Exam Results" sub={`All exams · AY ${config.school.academicYear}`} />
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
                    return (
                      <tr key={r.subjectId}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 9, height: 9, borderRadius: 2, background: subjectColor(r.subject) }} />
                            {r.subject}
                          </span>
                        </td>
                        <td><b>{m}</b></td>
                        <td className="mini">100</td>
                        <td><span className={`badge ${cls}`}>{config.academics.grade(m)}</span></td>
                      </tr>
                    );
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

// ─── Timetable ────────────────────────────────────────────────────────────────
function Timetable() {
  const { meData } = useApp();
  const CLASS_ID_VAL = meData?.classId || (config.academics.classes.indexOf("8-A") + 1);
  const tt       = useApi(() => api.getTimetableDB(CLASS_ID_VAL), [CLASS_ID_VAL]);
  const todayDay = DAY_NAMES[new Date().getDay()];
  const schedule = tt.data || [];

  const maxPeriods = schedule.length
    ? Math.min(8, Math.max(6, ...schedule.map((r) => (r.subjects || []).length)))
    : 6;
  const PERIODS = Array.from({ length: maxPeriods }, (_, i) => `P${i + 1}`);

  return (
    <>
      <PageHead title="My Timetable" sub={`${meData?.className ? `Class ${meData.className}` : "My class"} · weekly`} />
      <Card>
        <Loading state={tt}>
          <div style={{ overflowX: "auto" }}>
            <div className="ttg" style={{ gridTemplateColumns: `80px repeat(${maxPeriods}, 1fr)` }}>
              <div className="h">Day</div>
              {PERIODS.map((p) => <div className="h" key={p}>{p}</div>)}
              {schedule.map((row) => (
                <React.Fragment key={row.day}>
                  <div className="dd" style={{ background: row.day === todayDay ? "rgba(124,92,255,0.15)" : "", fontWeight: row.day === todayDay ? 700 : 400 }}>
                    {row.day === todayDay ? "▶ " : ""}{row.day}
                  </div>
                  {Array.from({ length: maxPeriods }, (_, i) => {
                    const c = (row.subjects || [])[i];
                    return (
                      <div className="c" key={i} style={{ background: row.day === todayDay && c ? `${subjectColor(c)}18` : "" }}>
                        {c ? <b style={{ color: row.day === todayDay ? subjectColor(c) : "inherit" }}>{c}</b> : <span className="mini" style={{ opacity: 0.4 }}>—</span>}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </Loading>
      </Card>
    </>
  );
}

// ─── Events ───────────────────────────────────────────────────────────────────
function Events() {
  const events = useApi(() => api.getEvents(), []);
  const TYPE_ICON = (t) => {
    const lo = (t || "").toLowerCase();
    if (lo.includes("exam") || lo.includes("test"))   return "📝";
    if (lo.includes("holiday") || lo.includes("off")) return "🏖️";
    if (lo.includes("meeting") || lo.includes("ptm")) return "👥";
    if (lo.includes("sport") || lo.includes("match")) return "🏆";
    if (lo.includes("fee") || lo.includes("pay"))     return "💳";
    return "📢";
  };
  return (
    <>
      <PageHead title="Events & Circulars" sub="Announcements posted by the school" />
      <Card>
        <Loading state={events}>
          {(events.data || []).length === 0
            ? <div className="mini">No events posted yet.</div>
            : (events.data || []).map((e) => (
                <div className="event" key={e.id || e.t}>
                  <div className="dt"><div className="d">{e.d}</div><div className="m">{e.m}</div></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{TYPE_ICON(e.t)} {e.t}</div>
                    {e.s && <div className="mini">{e.s}</div>}
                  </div>
                </div>
              ))
          }
        </Loading>
      </Card>
    </>
  );
}

// ─── Profile row helper ───────────────────────────────────────────────────────
function ProfileRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ width: 140, color: "var(--muted)", fontSize: 12, flexShrink: 0, paddingTop: 2 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

// ─── My Profile ──────────────────────────────────────────────────────────────
function MyProfile() {
  const SID     = useSID();
  const student = useApi(() => api.getStudent(SID), [SID]);
  const s       = student.data;

  return (
    <>
      <PageHead title="My Profile" sub="Your personal details" />
      <Loading state={student}>
        {s && (
          <div className="grid g2">
            <Card title="👤 Personal Details">
              <ProfileRow label="Full Name"    value={s.name} />
              <ProfileRow label="Class"        value={s.class_name} />
              <ProfileRow label="Roll No"      value={s.roll_no} />
              <ProfileRow label="Gender"       value={s.gender && s.gender.charAt(0).toUpperCase() + s.gender.slice(1)} />
              <ProfileRow label="Date of Birth" value={s.dob ? new Date(s.dob).toLocaleDateString("en-IN") : null} />
              <ProfileRow label="Blood Group"  value={s.blood_group} />
              <ProfileRow label="Phone"        value={s.student_phone} />
              <ProfileRow label="Email"        value={s.student_email} />
              <ProfileRow label="Address"      value={s.address} />
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card title="👨‍👩‍👦 Guardian Details">
                <ProfileRow label="Name"     value={s.guardian_name} />
                <ProfileRow label="Relation" value={s.guardian_relation} />
                <ProfileRow label="Phone"    value={s.guardian_phone} />
                <ProfileRow label="Email"    value={s.guardian_email} />
              </Card>
              <Card title="🎓 Admission Info">
                <ProfileRow label="Admission No"   value={s.admission_no} />
                <ProfileRow label="Admission Date"
                  value={s.admission_date ? new Date(s.admission_date).toLocaleDateString("en-IN") : null} />
                {s.notes && <ProfileRow label="Notes" value={s.notes} />}
              </Card>
            </div>
          </div>
        )}
      </Loading>
    </>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────
function Notes() {
  const msgs  = useApi(() => api.getMessages(), []);
  const notes = ((msgs.data && msgs.data.studentFeed) || []).filter((m) => m.role === "teacher");
  return (
    <>
      <PageHead title="Teacher Notes" sub="Notes posted by your teachers" />
      <Card><Loading state={msgs}>{notes.map((m, i) => <Message m={m} key={i} />)}</Loading></Card>
    </>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────
function Messages() {
  const [text, setText] = useState("");
  const msgs  = useApi(() => api.getMessages(), []);
  const send  = async () => { if (!text.trim()) return; await api.postStudentMessage(text.trim()); setText(""); msgs.reload(); };
  return (
    <>
      <PageHead title="Messages" sub="From school · and your posts to teacher/parent" />
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

// ─── Fees ─────────────────────────────────────────────────────────────────────
function Fees() {
  const SID = useSID();
  const fees = useApi(() => api.getFees(SID), [SID]);
  const f    = fees.data || { total: 0, paid: 0, terms: [] };
  const due  = f.total - f.paid;
  return (
    <>
      <PageHead title="Fees" sub={`AY ${config.school.academicYear}`} />
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label="Total fee" value={money(f.total)} delta="for the year" />
        <Stat label="Paid"      value={money(f.paid)}  delta="received"     dir="up" />
        <Stat label="Pending"   value={money(due)}     delta="due"          dir={due > 0 ? "down" : "up"} />
      </div>
      <Card title="Breakdown">
        <Loading state={fees}>
          <table>
            <thead><tr><th>Item</th><th>Amount</th><th>Paid</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {f.terms.map((t, i) => {
                const st = Number(t.paid) >= Number(t.due) ? "Paid" : Number(t.paid) > 0 ? "Partial" : "Pending";
                return (
                  <tr key={i}>
                    <td>{t.term}</td><td>{money(t.due)}</td><td>{money(t.paid)}</td>
                    <td><FeeBadge status={st} /></td><td className="mini">{t.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Loading>
      </Card>
    </>
  );
}

export const studentNav = [
  { key: "dashboard",  label: "Dashboard",      icon: "🏠", Component: Dashboard  },
  { key: "attendance", label: "Attendance",      icon: "🗓️", Component: Attendance },
  { key: "results",    label: "Exam Results",    icon: "📊", Component: Results    },
  { key: "timetable",  label: "Timetable",       icon: "🕐", Component: Timetable  },
  { key: "events",     label: "Events",          icon: "📣", Component: Events     },
  { key: "notes",      label: "Teacher Notes",   icon: "📝", Component: Notes      },
  { key: "messages",   label: "Messages",        icon: "💬", Component: Messages   },
  { key: "fees",       label: "Fees",            icon: "💰", Component: Fees       },
  { key: "myprofile",  label: "My Profile",      icon: "👤", Component: MyProfile  },
];
