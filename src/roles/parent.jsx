// PARENT role screens — read-only view of their child's data.
// Demo child: Aarav Anand, Student ID 1, Class 8-A, Roll 12.
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { Card, Stat, PageHead, Tabs, FeeBadge, Message, Calendar, Loading, Donut } from "../components/ui.jsx";

const SID        = api.DEMO_STUDENT_ID;
const CHILD_NAME = "Aarav Anand";
const CHILD_CLS  = "8-A";
const CHILD_ROLL = "12";
const CLASS_ID   = config.academics.classes.indexOf(CHILD_CLS) + 1;

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

const SUBJECT_COLORS = {
  Tamil:   "#ff5c7c",
  English: "#5aa9ff",
  Maths:   "#7c5cff",
  Science: "#34d1bf",
  Social:  "#ffb454",
};
const subjectColor = (name) => SUBJECT_COLORS[name] || "#9b7bff";

// Horizontal marks bar for subjects
function MarkBar({ subject, mark }) {
  const m = Number(mark);
  const color = m >= 80 ? "#4ade80" : m >= 60 ? "#34d1bf" : m >= 35 ? "#ffb454" : "#ff5c7c";
  const grade = config.academics.grade(m);
  return (
    <div className="subline">
      <div className="s-nm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: subjectColor(subject), flexShrink: 0 }} />
        {subject}
      </div>
      <div className="bar" style={{ flex: 1 }}><i style={{ width: m + "%", background: color }} /></div>
      <div className="s-mk" style={{ color }}>{m}</div>
      <span className={`badge ${m >= 80 ? "b-good" : m >= 35 ? "b-warn" : "b-bad"}`} style={{ fontSize: 10, marginLeft: 6, minWidth: 28 }}>{grade}</span>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard() {
  const today = getLocalDateStr();

  const att   = useApi(() => api.getStudentAttendance(SID), []);
  const exams = useApi(() => api.getExams(), []);
  const fees  = useApi(() => api.getFees(SID), []);
  const msgs  = useApi(() => api.getMessages(), []);

  // Attendance stats
  const attRows  = att.data || [];
  const present  = attRows.filter((r) => r.status === "present").length;
  const absent   = attRows.filter((r) => r.status === "absent").length;
  const attPct   = attRows.length ? Math.round((present / attRows.length) * 100) : 0;
  const todayRecord   = attRows.find((r) => r.date === today);
  const todayStatus   = todayRecord ? todayRecord.status : "not recorded";

  // Latest exam marks
  const examList   = exams.data || [];
  const latestExam = examList.length ? examList[examList.length - 1] : null;
  const marks = useApi(
    () => latestExam ? api.getMarks(latestExam.id, SID) : Promise.resolve([]),
    [latestExam && latestExam.id]
  );
  const markRows = marks.data || [];
  const examAvg  = markRows.length
    ? Math.round(markRows.reduce((a, r) => a + Number(r.mark), 0) / markRows.length)
    : null;

  // Fee status
  const f        = fees.data || { total: 0, paid: 0, terms: [] };
  const feeDue   = f.total - f.paid;
  const feeOk    = feeDue <= 0;

  // Notices
  const notices  = ((msgs.data && msgs.data.studentFeed) || []).slice(0, 3);
  const notes    = ((msgs.data && msgs.data.studentFeed) || []).filter((m) => m.role === "teacher").slice(0, 2);

  // Attendance donut
  const attBands = [
    { label: "Present", value: present, color: "#4ade80" },
    { label: "Absent",  value: absent,  color: "#ff5c7c" },
  ];

  return (
    <>
      {/* ── Banner ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(90,169,255,0.12) 0%, rgba(124,92,255,0.08) 100%)",
        border: "1px solid rgba(90,169,255,0.25)",
        borderRadius: 16, padding: "16px 22px", marginBottom: 18,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>{getLocalDateLabel()}</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>👨‍👩‍👦 {CHILD_NAME}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            Class {CHILD_CLS} · Roll {CHILD_ROLL} · {config.school.name}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {todayStatus === "present" && <span className="badge b-good">✓ Present today</span>}
          {todayStatus === "absent"  && <span className="badge b-bad">✗ Absent today</span>}
          {todayStatus === "not recorded" && <span className="badge" style={{ background: "rgba(107,113,168,0.2)", color: "var(--muted)" }}>Attendance not recorded yet</span>}
          {!feeOk && (
            <div className="mini" style={{ marginTop: 4, color: "var(--bad)" }}>
              ₹{Number(feeDue).toLocaleString("en-IN")} fee pending
            </div>
          )}
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat
          label="Attendance"
          value={attPct + "%"}
          delta="this term"
          dir={attPct >= 85 ? "up" : attPct >= 75 ? "flat" : "down"}
        />
        <Stat
          label="Today"
          value={todayStatus === "present" ? "✓ Present" : todayStatus === "absent" ? "✗ Absent" : "—"}
          delta={todayStatus === "not recorded" ? "not recorded" : ""}
          dir={todayStatus === "present" ? "up" : todayStatus === "absent" ? "down" : "flat"}
        />
        <Stat
          label="Latest Exam"
          value={examAvg != null ? examAvg + "%" : "—"}
          delta={latestExam ? latestExam.name : "no exams yet"}
          dir={examAvg != null ? (examAvg >= 60 ? "up" : "down") : "flat"}
        />
        <Stat
          label="Fees Due"
          value={feeDue > 0 ? config.app.currency + Number(feeDue).toLocaleString("en-IN") : "Nil"}
          delta={feeOk ? "all paid" : "pending"}
          dir={feeOk ? "up" : "down"}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid g2" style={{ marginBottom: 18 }}>
        {/* Attendance donut */}
        <Card title="Term Attendance">
          <Loading state={att}>
            <Donut segments={attBands} centerLabel={attPct + "%"} centerSub="present" />
            {attPct < 75 && (
              <div className="mini" style={{ marginTop: 10, color: "var(--bad)" }}>
                ⚠ Below 75% — please speak with class teacher
              </div>
            )}
          </Loading>
        </Card>

        {/* Subject marks */}
        <Card title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Latest Exam Marks
            {latestExam && <span className="mini" style={{ fontWeight: 400 }}>{latestExam.name}</span>}
          </span>
        }>
          <Loading state={marks}>
            {markRows.length === 0 ? (
              <div className="mini">No marks available yet.</div>
            ) : (
              <>
                {markRows.map((r) => <MarkBar key={r.subjectId} subject={r.subject} mark={r.mark} />)}
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <span className="badge b-pri">Overall: {examAvg}%</span>
                  <span className={`badge ${config.academics.grade(examAvg) === "F" ? "b-bad" : "b-good"}`}>
                    Grade {config.academics.grade(examAvg)}
                  </span>
                </div>
              </>
            )}
          </Loading>
        </Card>
      </div>

      {/* ── Teacher notes + School notices ──────────────────────────────── */}
      <div className="grid g2">
        <Card title="📝 Notes from Teacher">
          <Loading state={msgs}>
            {notes.length === 0
              ? <div className="mini">No recent notes from the teacher.</div>
              : notes.map((m, i) => <Message m={m} key={i} />)}
          </Loading>
        </Card>
        <Card title="📢 School Notices">
          <Loading state={msgs}>
            {notices.length === 0
              ? <div className="mini">No school notices.</div>
              : notices.map((m, i) => <Message m={m} key={i} />)}
          </Loading>
        </Card>
      </div>
    </>
  );
}

// ─── Attendance ───────────────────────────────────────────────────────────────
function Attendance() {
  const att   = useApi(() => api.getStudentAttendance(SID), []);
  const rows  = att.data || [];
  const present = rows.filter((r) => r.status === "present").length;
  const absent  = rows.filter((r) => r.status === "absent").length;
  const late    = rows.filter((r) => r.status === "late").length;
  const pct     = rows.length ? Math.round((present / rows.length) * 100) : 0;
  const absentDaysJune = rows
    .filter((r) => r.status === "absent" && r.date && r.date.startsWith("2026-06"))
    .map((r) => Number(r.date.slice(8, 10)));

  return (
    <>
      <PageHead
        title={`${CHILD_NAME}'s Attendance`}
        sub="Calendar view — June 2026"
        right={
          <span className={`pill ${pct < 75 ? "b-bad" : ""}`}>
            Term: {pct}% {pct < 75 ? "⚠ Below 75%" : ""}
          </span>
        }
      />
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

// ─── Marks ────────────────────────────────────────────────────────────────────
function Marks() {
  const exams = useApi(() => api.getExams(), []);
  const [examId, setExamId] = useState(null);
  const current = examId || (exams.data && exams.data.length ? exams.data[exams.data.length - 1].id : null);
  const marks   = useApi(() => (current ? api.getMarks(current, SID) : Promise.resolve([])), [current]);

  const rows  = marks.data || [];
  const total = rows.reduce((a, r) => a + Number(r.mark), 0);
  const avg   = rows.length ? Math.round(total / rows.length) : 0;
  const fails = rows.filter((r) => Number(r.mark) < config.academics.passMark).length;

  return (
    <>
      <PageHead
        title={`${CHILD_NAME}'s Exam Results`}
        sub={`Academic Year ${config.school.academicYear}`}
      />
      <Loading state={exams}>
        <Tabs items={(exams.data || []).map((e) => ({ id: e.id, name: e.name }))} value={current} onChange={setExamId} />
        <div className="grid g3" style={{ marginBottom: 16 }}>
          <Stat label="Average" value={avg + "%"}  delta="overall" dir={avg >= 60 ? "up" : "down"} />
          <Stat label="Passed"  value={rows.length - fails} delta={`of ${rows.length} subjects`} dir="up" />
          <Stat label="Failed"  value={fails} delta="subjects" dir={fails > 0 ? "down" : "up"} />
        </div>
        <div className="grid g2">
          <Card title="Subject marks">
            <Loading state={marks}>
              <table>
                <thead><tr><th>Subject</th><th>Marks</th><th>/100</th><th>Grade</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const m = Number(r.mark);
                    const cls = m >= 80 ? "b-good" : m >= 35 ? "b-warn" : "b-bad";
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
                  <tr>
                    <td><b>Overall</b></td>
                    <td colSpan={2}></td>
                    <td><span className="badge b-pri">{avg}%</span></td>
                  </tr>
                </tbody>
              </table>
            </Loading>
          </Card>
          <Card title="Performance chart">
            <Loading state={marks}>
              {rows.map((r) => <MarkBar key={r.subjectId} subject={r.subject} mark={r.mark} />)}
            </Loading>
          </Card>
        </div>
      </Loading>
    </>
  );
}

// ─── Fees ─────────────────────────────────────────────────────────────────────
function Fees() {
  const fees = useApi(() => api.getFees(SID), []);
  const f    = fees.data || { total: 0, paid: 0, terms: [] };
  const due  = f.total - f.paid;
  const pct  = f.total ? Math.round((f.paid / f.total) * 100) : 0;

  return (
    <>
      <PageHead
        title="Fee Status"
        sub={`${CHILD_NAME} · AY ${config.school.academicYear}`}
        right={<span className={`pill ${due > 0 ? "b-bad" : "b-good"}`}>{due > 0 ? `Due: ₹${Number(due).toLocaleString("en-IN")}` : "✓ All paid"}</span>}
      />
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label="Total fee"  value={config.app.currency + Number(f.total).toLocaleString("en-IN")} delta="for the year" />
        <Stat label="Paid"       value={config.app.currency + Number(f.paid).toLocaleString("en-IN")}  delta={pct + "% of total"} dir="up" />
        <Stat label="Pending"    value={config.app.currency + Number(due).toLocaleString("en-IN")}      delta="remaining"           dir={due > 0 ? "down" : "up"} />
      </div>
      <Card title="Fee breakdown">
        <Loading state={fees}>
          <table>
            <thead><tr><th>Item</th><th>Amount</th><th>Paid</th><th>Status</th><th>Due date</th></tr></thead>
            <tbody>
              {f.terms.map((t, i) => {
                const st = Number(t.paid) >= Number(t.due) ? "Paid" : Number(t.paid) > 0 ? "Partial" : "Pending";
                return (
                  <tr key={i}>
                    <td>{t.term}</td>
                    <td>{config.app.currency}{Number(t.due).toLocaleString("en-IN")}</td>
                    <td>{config.app.currency}{Number(t.paid).toLocaleString("en-IN")}</td>
                    <td><FeeBadge status={st} /></td>
                    <td className="mini">{t.date}</td>
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

// ─── Notices ──────────────────────────────────────────────────────────────────
function Notices() {
  const msgs    = useApi(() => api.getMessages(), []);
  const events  = useApi(() => api.getEvents(), []);
  const feed    = (msgs.data && msgs.data.studentFeed) || [];
  const teacher = feed.filter((m) => m.role === "teacher");
  const circulars = events.data || [];

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
      <PageHead title="Notices & Notes" sub="School announcements and teacher notes for your child" />
      <div className="grid g2">
        <Card title="📢 School Circulars">
          <Loading state={events}>
            {circulars.length === 0
              ? <div className="mini">No circulars posted yet.</div>
              : circulars.map((ev) => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ minWidth: 40, textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{ev.d}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>{ev.m}</div>
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                        <span>{TYPE_ICON(ev.t)}</span>
                        <b style={{ fontSize: 13 }}>{ev.t}</b>
                      </div>
                      {ev.s && <div className="mini" style={{ color: "var(--muted)" }}>{ev.s}</div>}
                    </div>
                  </div>
                ))
            }
          </Loading>
        </Card>
        <Card title="📝 From Class Teacher">
          <Loading state={msgs}>
            {teacher.length === 0
              ? <div className="mini">No teacher notes yet.</div>
              : teacher.map((m, i) => <Message m={m} key={i} />)}
          </Loading>
        </Card>
      </div>
    </>
  );
}

// ─── Timetable ───────────────────────────────────────────────────────────────
function Timetable() {
  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayDay  = DAY_NAMES[new Date().getDay()];
  const tt        = useApi(() => api.getTimetableDB(CLASS_ID), []);
  const schedule  = tt.data || [];
  return (
    <>
      <PageHead title={`${CHILD_NAME}'s Timetable`} sub={`Class ${CHILD_CLS} · weekly schedule`} />
      <Card>
        <Loading state={tt}>
          <div className="ttg">
            <div className="h">Day</div>
            {["P1","P2","P3","P4","P5","P6"].map((p) => <div className="h" key={p}>{p}</div>)}
            {schedule.map((row) => (
              <React.Fragment key={row.day}>
                <div className="dd" style={{
                  background: row.day === todayDay ? "rgba(52,209,191,0.15)" : "",
                  fontWeight: row.day === todayDay ? 700 : 400,
                }}>
                  {row.day === todayDay ? "▶ " : ""}{row.day}
                </div>
                {(row.subjects || []).map((c, i) => (
                  <div className="c" key={i} style={{ background: row.day === todayDay ? `${subjectColor(c)}18` : "" }}>
                    <b style={{ color: row.day === todayDay ? subjectColor(c) : "inherit", fontSize:12 }}>{c}</b>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          {schedule.length === 0 && <div className="mini">Timetable not yet set.</div>}
        </Loading>
      </Card>
    </>
  );
}

export const parentNav = [
  { key: "dashboard",  label: "My Child",   icon: "🏠", Component: Dashboard  },
  { key: "attendance", label: "Attendance",  icon: "📅", Component: Attendance },
  { key: "marks",      label: "Marks",       icon: "📊", Component: Marks      },
  { key: "timetable",  label: "Timetable",   icon: "🕐", Component: Timetable  },
  { key: "fees",       label: "Fees",        icon: "💳", Component: Fees       },
  { key: "notices",    label: "Notices",     icon: "📢", Component: Notices    },
];
