// PRINCIPAL role screens — live data from the API.
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Bar, Tabs, FeeBadge, Message, Loading, Donut } from "../components/ui.jsx";
import StudentForm from "../components/StudentForm.jsx";
import StudentProfile from "../components/StudentProfile.jsx";

const { classes } = config.academics;

// ─── helpers ────────────────────────────────────────────────────────────────
function getLocalDateLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
const schoolAvg = (obj) => {
  const v = Object.values(obj);
  return v.length ? Math.round(v.reduce((a, b) => a + Number(b), 0) / v.length) : 0;
};

// Color-coded horizontal bar (green ≥85, orange 75-84, red <75)
function ColorBar({ name, pct }) {
  const n = Number(pct);
  const color = n >= 85 ? "#4ade80" : n >= 75 ? "#ffb454" : "#ff5c7c";
  return (
    <div className="subline">
      <div className="s-nm">{name}</div>
      <div className="bar" style={{ flex: 1 }}>
        <i style={{ width: pct + "%", background: color }} />
      </div>
      <div className="s-mk" style={{ color }}>{pct}%</div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard() {
  const { setView } = useApp();
  const today = getLocalDateLabel();

  const catt    = useApi(() => api.getClassAttendance(), []);
  const exams   = useApi(() => api.getExams(), []);

  const data    = catt.data || {};
  const entries = Object.entries(data).sort(([, a], [, b]) => Number(a) - Number(b));
  const classCount    = entries.length;
  const avgAtt        = schoolAvg(data);
  const lowAtt        = entries.filter(([, v]) => Number(v) < 75);
  const warnAtt       = entries.filter(([, v]) => Number(v) >= 75 && Number(v) < 85);

  const examList   = exams.data || [];
  const latestExam = examList.length ? examList[examList.length - 1] : null;
  const openExams  = examList.filter((e) => e.status === "open");

  const summary = useApi(
    () => latestExam ? api.getResultsSummary(latestExam.id) : Promise.resolve(null),
    [latestExam && latestExam.id]
  );
  const s = summary.data;

  // Fee overview from class 8-A (demo class with seeded data)
  const feeList = useApi(() => api.listStudents("8-A"), []);
  const fstudents = feeList.data || [];
  const feeBands = [
    { label: "Paid",    value: fstudents.filter((s) => s.fee === "Paid").length,    color: "#4ade80" },
    { label: "Partial", value: fstudents.filter((s) => s.fee === "Partial").length, color: "#ffb454" },
    { label: "Pending", value: fstudents.filter((s) => s.fee === "Pending").length, color: "#ff5c7c" },
  ];

  return (
    <>
      {/* ── Banner ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(52,209,191,0.12) 0%, rgba(124,92,255,0.08) 100%)",
        border: "1px solid rgba(52,209,191,0.25)",
        borderRadius: 16, padding: "16px 22px", marginBottom: 18,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>{today}</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>🏫 {config.school.name} — Principal Overview</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            {classCount} classes · AY {config.school.academicYear}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {lowAtt.length > 0 ? (
            <>
              <span className="badge b-bad">⚠ {lowAtt.length} class{lowAtt.length > 1 ? "es" : ""} below 75%</span>
              <div className="mini" style={{ marginTop: 4, color: "var(--bad)" }}>
                {lowAtt.map(([c]) => c).join(", ")}
              </div>
            </>
          ) : warnAtt.length > 0 ? (
            <span className="badge b-warn">⚠ {warnAtt.length} class{warnAtt.length > 1 ? "es" : ""} below 85%</span>
          ) : (
            <span className="badge b-good">✓ All classes above 85%</span>
          )}
        </div>
      </div>

      {/* ── Open exam alert ──────────────────────────────────────────────── */}
      {openExams.length > 0 && (
        <div style={{
          background: "rgba(255,180,84,0.08)", border: "1px solid rgba(255,180,84,0.35)",
          borderRadius: 12, padding: "10px 18px", marginBottom: 18,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>📋</span>
          <div style={{ flex: 1, fontSize: 13 }}>
            <b>{openExams.map((e) => e.name).join(", ")}</b> — marks entry open. Lock exam once all teachers have submitted.
          </div>
          <span className="badge b-warn" style={{ cursor: "pointer" }} onClick={() => setView("results")}>
            Review →
          </span>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat label="Classes Reporting" value={classCount} delta="today" />
        <Stat
          label="School Avg Att."
          value={avgAtt + "%"}
          delta="all classes"
          dir={avgAtt >= 85 ? "up" : "down"}
        />
        <Stat
          label="Below 75%"
          value={lowAtt.length}
          delta="classes flagged"
          dir={lowAtt.length > 0 ? "down" : "up"}
        />
        <Stat
          label="Open Exams"
          value={openExams.length}
          delta={openExams.length ? "marks pending" : "none pending"}
          dir={openExams.length > 0 ? "down" : "up"}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid g3" style={{ marginBottom: 18 }}>
        {/* Attendance bars */}
        <Card title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Class-wise Attendance
            <span className="mini" style={{ fontWeight: 400 }}>sorted: lowest first</span>
          </span>
        }>
          <Loading state={catt}>
            {entries.length === 0
              ? <div className="mini">No attendance data yet.</div>
              : entries.map(([c, p]) => <ColorBar key={c} name={"Class " + c} pct={Number(p)} />)}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#4ade80", display: "inline-block" }} />≥85%
              </span>
              <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ffb454", display: "inline-block" }} />75–84%
              </span>
              <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ff5c7c", display: "inline-block" }} />&lt;75%
              </span>
            </div>
          </Loading>
        </Card>

        {/* Exam summary */}
        <Card title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Latest Exam
            {latestExam && <span className="mini" style={{ fontWeight: 400 }}>{latestExam.name}</span>}
          </span>
        }>
          <Loading state={summary}>
            {!s ? (
              <div className="mini" style={{ padding: 8 }}>No exam results yet.</div>
            ) : (
              <>
                <div className="grid g2" style={{ gap: 10, marginBottom: 14 }}>
                  <div style={{ background: "rgba(74,222,128,0.1)", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>{s.passRate}%</div>
                    <div className="mini">Pass rate</div>
                  </div>
                  <div style={{ background: "rgba(90,169,255,0.1)", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#5aa9ff" }}>{s.avg}%</div>
                    <div className="mini">School avg</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="badge b-good">{s.distinctions} distinctions</span>
                  <span className="badge" style={{ background: "rgba(90,169,255,0.15)", color: "var(--info)" }}>{s.appeared} appeared</span>
                </div>
              </>
            )}
          </Loading>
        </Card>

        {/* Fee status donut — class 8-A demo */}
        <Card title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Fee Collection
            <span className="mini" style={{ fontWeight: 400 }}>class 8-A</span>
          </span>
        }>
          <Loading state={feeList}>
            <Donut
              segments={feeBands}
              centerLabel={feeBands[0].value}
              centerSub="paid"
            />
            {feeBands[2].value > 0 && (
              <div className="mini" style={{ marginTop: 10, color: "var(--bad)" }}>
                ⚠ {feeBands[2].value} student{feeBands[2].value > 1 ? "s" : ""} fee pending
              </div>
            )}
          </Loading>
        </Card>
      </div>

      {/* ── Class-wise exam performance ──────────────────────────────────── */}
      {s && s.classes && s.classes.length > 0 && (
        <Card title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Class-wise Exam Performance
            <span className="mini" style={{ fontWeight: 400 }}>{latestExam && latestExam.name}</span>
          </span>
        }>
          <Loading state={summary}>
            <div className="grid g2" style={{ gap: "4px 30px" }}>
              {s.classes.map((row) => (
                <div key={row.cls} className="subline">
                  <div className="s-nm">Class {row.cls}</div>
                  <div className="bar" style={{ flex: 1 }}>
                    <i style={{ width: row.avg + "%", background: row.avg >= 60 ? "#34d1bf" : "#ffb454" }} />
                  </div>
                  <div className="s-mk" style={{ color: row.avg >= 60 ? "#34d1bf" : "#ffb454" }}>{row.avg}%</div>
                  <div style={{ width: 52, textAlign: "right", fontSize: 11, color: "var(--muted)" }}>
                    {row.pass}% pass
                  </div>
                </div>
              ))}
            </div>
          </Loading>
        </Card>
      )}
    </>
  );
}

// ─── Attendance ──────────────────────────────────────────────────────────────
function Attendance() {
  const catt = useApi(() => api.getClassAttendance(), []);
  const data = catt.data || {};
  const entries = Object.entries(data);
  const best = entries.reduce((a, b) => (Number(b[1]) > Number(a[1]) ? b : a), ["—", 0]);
  const low  = entries.reduce((a, b) => (Number(b[1]) < Number(a[1]) ? b : a), ["—", 100]);
  return (
    <>
      <PageHead title="Attendance Report" sub="Class-wise · today"
        right={<span className="pill">Avg: {schoolAvg(data)}%</span>} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Classes" value={entries.length} delta="reporting" />
        <Stat label="Average" value={schoolAvg(data) + "%"} delta="all classes" dir="up" />
        <Stat label="Best class" value={best[0]} delta={best[1] + "%"} dir="up" />
        <Stat label="Lowest class" value={low[0]} delta={low[1] + "%"} dir="down" />
      </div>
      <Card title="Class-wise attendance">
        <Loading state={catt}>
          <div className="grid g2" style={{ gap: "4px 30px" }}>
            {entries.map(([c, p]) => <ColorBar key={c} name={"Class " + c} pct={Number(p)} />)}
          </div>
        </Loading>
      </Card>
    </>
  );
}

// ─── Students ─────────────────────────────────────────────────────────────────
function Students() {
  const [cls, setCls] = useState("8-A");
  const list = useApi(() => api.listStudents(cls), [cls]);
  const [form, setForm] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const done = () => { setForm(null); list.reload(); };
  return (
    <>
      <PageHead title="Students" sub="Class-wise · view, add & edit · parent contact"
        right={<button className="btn" onClick={() => setForm({ student: null })}>＋ Add student</button>} />
      <Tabs items={classes.map((c) => ({ id: c, name: c }))} value={cls} onChange={setCls} />
      <Card title={<>Class {cls}</>}>
        <Loading state={list}>
          <table>
            <thead><tr><th>Roll</th><th>Name</th><th>Attendance</th><th>Guardian</th><th>Phone</th><th>Fees</th><th></th></tr></thead>
            <tbody>
              {(list.data || []).map((s) => (
                <tr key={s.id}><td>{s.roll}</td>
                  <td><b style={{ cursor: "pointer" }} onClick={() => setProfileId(s.id)}>{s.name}</b></td>
                  <td><span className={`badge ${Number(s.att) >= 85 ? "b-good" : Number(s.att) >= 75 ? "b-warn" : "b-bad"}`}>{s.att}%</span></td>
                  <td>{s.guardian}</td><td className="mini">{s.phone}</td><td><FeeBadge status={s.fee} /></td>
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
        <StudentForm student={form.student} classes={classes}
          lockedClass={form.student ? null : cls}
          onClose={() => setForm(null)} onSaved={done} />
      )}
      {profileId && (
        <StudentProfile id={profileId} onClose={() => setProfileId(null)}
          onEdit={(s) => { setProfileId(null); setForm({ student: s }); }} />
      )}
    </>
  );
}

// ─── Results ─────────────────────────────────────────────────────────────────
function Results() {
  const exams = useApi(() => api.getExams(), []);
  const [examId, setExamId] = useState(null);
  const current = examId || (exams.data && exams.data.length ? exams.data[0].id : null);
  const currentExam = (exams.data || []).find((e) => e.id === current);
  const summary = useApi(() => (current ? api.getResultsSummary(current) : Promise.resolve(null)), [current]);
  const s = summary.data;
  const toggleLock = async () => {
    if (!currentExam) return;
    await api.setExamStatus(currentExam.id, currentExam.status === "locked" ? "open" : "locked");
    exams.reload();
  };
  return (
    <>
      <PageHead title="Exam Results" sub="Select an exam · lock once marks are finalised"
        right={currentExam && (
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className={`badge ${currentExam.status === "locked" ? "b-good" : "b-warn"}`}>{currentExam.status}</span>
            <button className="btn sm" onClick={toggleLock}>{currentExam.status === "locked" ? "Unlock" : "Lock exam"}</button>
          </span>
        )} />
      <Loading state={exams}>
        <Tabs items={(exams.data || []).map((e) => ({ id: e.id, name: e.name }))} value={current} onChange={setExamId} />
        <div className="grid g4" style={{ marginBottom: 16 }}>
          <Stat label="Appeared"     value={s ? s.appeared     : "—"} delta="students" />
          <Stat label="Pass rate"    value={s ? s.passRate + "%" : "—"} delta="≥35" dir="up" />
          <Stat label="School avg"   value={s ? s.avg + "%"     : "—"} delta="all subjects" dir="up" />
          <Stat label="Distinctions" value={s ? s.distinctions  : "—"} delta="≥75%" dir="up" />
        </div>
        <Card title="Class averages">
          <Loading state={summary}>
            {s && s.classes.length ? (
              <table>
                <thead><tr><th>Class</th><th>Avg %</th><th>Pass %</th></tr></thead>
                <tbody>
                  {s.classes.map((row) => (
                    <tr key={row.cls}>
                      <td><b>{row.cls}</b></td>
                      <td><span className={`badge ${row.avg >= 60 ? "b-good" : "b-warn"}`}>{row.avg}%</span></td>
                      <td>{row.pass}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="mini">No marks entered for this exam yet.</div>}
          </Loading>
        </Card>
      </Loading>
    </>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────
function Messages() {
  const [mode, setMode] = useState("students");
  const [draft, setDraft] = useState("");
  const msgs = useApi(() => api.getMessages(), []);
  const tabs = [
    { id: "students", name: "📣 To students" },
    { id: "teachers", name: "👩‍🏫 To all teachers" },
    { id: "direct",   name: "📩 Direct to teacher" },
  ];
  const send = async () => {
    const t = draft.trim(); if (!t) return;
    if (mode === "students") await api.principalBroadcastStudents(t);
    if (mode === "teachers") await api.principalBroadcastTeachers(t);
    if (mode === "direct")   await api.principalDirectMessage(t);
    setDraft(""); msgs.reload();
  };
  const d = msgs.data || {};
  return (
    <>
      <PageHead title="Messages" sub="Broadcast to students or teachers, or message one teacher privately" />
      <Tabs items={tabs} value={mode} onChange={(m) => { setMode(m); setDraft(""); }} />
      {mode === "students" && (
        <Card title="Announcement → appears on every student's page">
          <div className="compose">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. School closed Monday" />
            <button className="btn" onClick={send}>Publish</button>
          </div>
          <div style={{ marginTop: 14 }}>
            <Loading state={msgs}>
              {(d.studentFeed || []).filter((m) => m.role === "principal").map((m, i) => <Message m={m} key={i} />)}
            </Loading>
          </div>
        </Card>
      )}
      {mode === "teachers" && (
        <Card title="General message → all teachers only">
          <div className="compose">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Staff meeting Friday 4 PM" />
            <button className="btn" onClick={send}>Send to all</button>
          </div>
          <div style={{ marginTop: 14 }}>
            <Loading state={msgs}>
              {(d.teacherGeneral || []).map((m, i) => <Message m={m} key={i} />)}
            </Loading>
          </div>
        </Card>
      )}
      {mode === "direct" && (
        <>
          <div className="notice">Private message to one teacher's inbox. They can reply.</div>
          <Card title="Direct message">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select className="compose" style={{ width: "100%" }}>
                <option>Mr. Saravanan — 8-A class teacher</option>
                <option>Mrs. Geetha — Maths</option>
              </select>
              <textarea className="compose" style={{ width: "100%", minHeight: 80 }} value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. Why is 8-A maths average dropping?" />
              <button className="btn" onClick={send}>Send privately</button>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="ct">Sent</div>
              <Loading state={msgs}>
                {(d.teacherInbox || []).map((m) => (
                  <div key={m.id}>
                    <Message m={{ ...m, from: "You → " + m.from }} />
                    {m.reply
                      ? <div className="msg" style={{ marginLeft: 30, background: "var(--panel)" }}>
                          <div className="av" style={{ background: "var(--warn)" }}>T</div>
                          <div style={{ flex: 1 }}><div className="from">Teacher replied</div><div className="text">{m.reply}</div></div>
                        </div>
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

// ─── Fees ─────────────────────────────────────────────────────────────────────
function Fees() {
  const list = useApi(() => api.listStudents("8-A"), []);
  const students = list.data || [];
  const paid    = students.filter((s) => s.fee === "Paid").length;
  const pending = students.filter((s) => s.fee !== "Paid").length;
  return (
    <>
      <PageHead title="Fees Status" sub="Paid status by student · class 8-A" />
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
                <tr key={s.id}><td>{s.roll}</td><td><b>{s.name}</b></td>
                  <td>{s.guardian}</td><td><FeeBadge status={s.fee} /></td>
                  <td className="mini">{s.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Loading>
      </Card>
    </>
  );
}

export const principalNav = [
  { key: "dashboard",  label: "Dashboard",   icon: "📊", Component: Dashboard  },
  { key: "attendance", label: "Attendance",   icon: "🗓️", Component: Attendance },
  { key: "students",   label: "Students",     icon: "🎓", Component: Students   },
  { key: "results",    label: "Exam Results", icon: "📋", Component: Results    },
  { key: "messages",   label: "Messages",     icon: "💬", Component: Messages   },
  { key: "fees",       label: "Fees Status",  icon: "💰", Component: Fees       },
];
