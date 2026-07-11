// TEACHER role screens — live data from the API.
import React, { useState, Fragment } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Tabs, Message, Loading, Donut } from "../components/ui.jsx";
import StudentForm from "../components/StudentForm.jsx";
import StudentProfile from "../components/StudentProfile.jsx";

// Resolve class identity from /auth/me.
// Returns the primary class plus the full list of classes this teacher can access.
function useMyClass() {
  const { meData } = useApp();
  const cls      = meData?.className || null;
  const clsId    = meData?.classId   || null;
  // meData.classes = [{id, name}] — all classes this teacher is assigned to
  const myClasses = meData?.classes?.length
    ? meData.classes
    : (cls ? [{ id: clsId, name: cls }] : []);
  return { MY_CLASS: cls, MY_CLASS_ID: clsId, myClasses };
}

// ─── helpers ────────────────────────────────────────────────────────────────
const GRADE_COLORS = {
  "A+": "#4ade80",
  "A":  "#34d1bf",
  "B":  "#5aa9ff",
  "C":  "#ffb454",
  "D":  "#ff8c42",
  "F":  "#ff5c7c",
};
const GRADE_ORDER = ["A+", "A", "B", "C", "D", "F"];

function getLocalDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getLocalDateLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// Vertical bar chart — no deps, pure CSS
function GradeBar({ gradeMap, total }) {
  const maxVal = Math.max(...GRADE_ORDER.map((g) => gradeMap[g] || 0), 1);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 100, padding: "0 2px" }}>
      {GRADE_ORDER.map((g) => {
        const count = gradeMap[g] || 0;
        const barH = Math.max(Math.round((count / maxVal) * 84), count ? 4 : 2);
        return (
          <div key={g} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: count ? GRADE_COLORS[g] : "var(--muteder)" }}>
              {count || ""}
            </span>
            <div style={{
              width: "100%", height: barH,
              background: GRADE_COLORS[g],
              borderRadius: "4px 4px 0 0",
              opacity: count ? 1 : 0.15,
              transition: "height .3s",
            }} />
            <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{g}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard() {
  const { setView } = useApp();
  const { MY_CLASS, MY_CLASS_ID } = useMyClass();
  const today = getLocalDateStr();
  const todayLabel = getLocalDateLabel();

  // API calls
  const list      = useApi(() => api.listStudents(MY_CLASS), [MY_CLASS]);
  const exams     = useApi(() => api.getExams(), []);
  const todayAtt  = useApi(() => api.getAttendanceByDate(MY_CLASS_ID, today), [MY_CLASS_ID, today]);

  const students  = list.data || [];
  const examList  = exams.data || [];
  const latestExam = examList.length ? examList[examList.length - 1] : null;

  const results = useApi(
    () => latestExam ? api.getClassResults(latestExam.id, MY_CLASS_ID) : Promise.resolve([]),
    [latestExam && latestExam.id, MY_CLASS_ID]
  );

  // ── today's attendance
  const todayRows      = todayAtt.data || [];
  const attMarkedToday = todayRows.length > 0 && todayRows.some((r) => r.status);
  const presentToday   = todayRows.filter((r) => r.status === "present").length;
  const absentToday    = todayRows.filter((r) => r.status === "absent").length;
  const todayPct       = todayRows.length ? Math.round((presentToday / todayRows.length) * 100) : 0;

  // ── monthly attendance from student records
  const strength = students.length;
  const avgAtt   = strength
    ? Math.round(students.reduce((a, s) => a + Number(s.att), 0) / strength)
    : 0;
  const attBands = [
    { label: "≥ 90%",  value: students.filter((s) => Number(s.att) >= 90).length,                              color: "#4ade80" },
    { label: "75–89%", value: students.filter((s) => Number(s.att) >= 75 && Number(s.att) < 90).length,        color: "#ffb454" },
    { label: "< 75%",  value: students.filter((s) => Number(s.att) < 75).length,                               color: "#ff5c7c" },
  ];

  // ── exam results
  const allResults  = results.data || [];
  const failStudents = allResults.filter((r) => r.fails > 0);
  const gradeMap    = {};
  allResults.forEach((r) => {
    const g = config.academics.grade(Number(r.avg));
    gradeMap[g] = (gradeMap[g] || 0) + 1;
  });
  const excellentCount = (gradeMap["A+"] || 0) + (gradeMap["A"] || 0);

  // ── fee donut
  const feeBands = [
    { label: "Paid",    value: students.filter((s) => s.fee === "Paid").length,    color: "#4ade80" },
    { label: "Partial", value: students.filter((s) => s.fee === "Partial").length, color: "#ffb454" },
    { label: "Pending", value: students.filter((s) => s.fee === "Pending").length, color: "#ff5c7c" },
  ];

  // ── at-risk students (low attendance OR failed subjects)
  const chronicIds = new Set(students.filter((s) => Number(s.att) < 75).map((s) => s.id));
  const failIds    = new Set(failStudents.map((r) => r.studentId));
  const atRisk = students
    .filter((s) => chronicIds.has(s.id) || failIds.has(s.id))
    .map((s) => {
      const res = allResults.find((r) => r.studentId === s.id);
      return { ...s, fails: res ? res.fails : 0, avg: res ? res.avg : null };
    })
    .sort((a, b) => {
      // Sort: both risks first, then single
      const aScore = (chronicIds.has(a.id) ? 2 : 0) + (a.fails > 0 ? 1 : 0);
      const bScore = (chronicIds.has(b.id) ? 2 : 0) + (b.fails > 0 ? 1 : 0);
      return bScore - aScore;
    });

  // ── open exams
  const openExams = examList.filter((e) => e.status === "open");

  // ── absentees today (for the mini list)
  const absentStudentIds = new Set(todayRows.filter((r) => r.status === "absent").map((r) => r.studentId));
  const absentDetails = students.filter((s) => absentStudentIds.has(s.id));

  return (
    <>
      {/* ── Morning banner ─────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(124,92,255,0.12) 0%, rgba(52,209,191,0.08) 100%)",
        border: "1px solid rgba(124,92,255,0.25)",
        borderRadius: 16, padding: "16px 22px", marginBottom: 18,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>{todayLabel}</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>📚 {MY_CLASS} — Class Teacher Dashboard</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            {strength} students · {config.school.academicYear}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {attMarkedToday ? (
            <div style={{ textAlign: "right" }}>
              <span className="badge b-good" style={{ fontSize: 12 }}>✓ Attendance marked</span>
              <div className="mini" style={{ marginTop: 4 }}>
                {presentToday} present · {absentToday} absent · {todayPct}%
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "right" }}>
              <span className="badge b-bad" style={{ fontSize: 12 }}>⚠ Not marked today</span>
              <div
                className="mini link"
                style={{ marginTop: 4, color: "var(--warn)", cursor: "pointer" }}
                onClick={() => setView("attendance")}
              >
                Mark attendance now →
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Open exam alert ───────────────────────────────────────────────── */}
      {openExams.length > 0 && (
        <div style={{
          background: "rgba(255,180,84,0.08)", border: "1px solid rgba(255,180,84,0.35)",
          borderRadius: 12, padding: "10px 18px", marginBottom: 18,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>📝</span>
          <div style={{ flex: 1, fontSize: 13 }}>
            Marks entry open for: <b>{openExams.map((e) => e.name).join(", ")}</b>
          </div>
          <span
            className="badge b-warn"
            style={{ cursor: "pointer" }}
            onClick={() => setView("results")}
          >
            Enter marks →
          </span>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat label="Class Strength" value={strength} delta={MY_CLASS} />
        <Stat
          label="Today's Attendance"
          value={attMarkedToday ? `${presentToday}/${strength}` : "—"}
          delta={attMarkedToday ? `${todayPct}% present today` : "not marked yet"}
          dir={attMarkedToday ? (todayPct >= 85 ? "up" : "down") : "flat"}
        />
        <Stat
          label="Monthly Avg Att."
          value={avgAtt + "%"}
          delta="this term"
          dir={avgAtt >= 85 ? "up" : "down"}
        />
        <Stat
          label="At-Risk Students"
          value={atRisk.length}
          delta="low att. or failed"
          dir={atRisk.length > 0 ? "down" : "up"}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid g3" style={{ marginBottom: 18 }}>

        {/* Attendance health donut */}
        <Card title="Attendance Health">
          <Loading state={list}>
            <Donut segments={attBands} centerLabel={avgAtt + "%"} centerSub="monthly avg" />
            {attBands[2].value > 0 && (
              <div className="mini" style={{ marginTop: 10, color: "var(--bad)" }}>
                ⚠ {attBands[2].value} student{attBands[2].value > 1 ? "s" : ""} below 75%
              </div>
            )}
          </Loading>
        </Card>

        {/* Grade distribution */}
        <Card title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Grade Distribution
            {latestExam && (
              <span className="mini" style={{ fontWeight: 400 }}>{latestExam.name}</span>
            )}
          </span>
        }>
          <Loading state={results}>
            {allResults.length === 0 ? (
              <div className="mini" style={{ padding: 8 }}>No exam results yet.</div>
            ) : (
              <GradeBar gradeMap={gradeMap} total={allResults.length} />
            )}
            {allResults.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <span className="badge b-bad">{failStudents.length} failed</span>
                <span className="badge b-good">{excellentCount} A / A+</span>
                <span className="badge" style={{ background: "rgba(90,169,255,0.15)", color: "var(--info)" }}>
                  {allResults.length} submitted
                </span>
              </div>
            )}
          </Loading>
        </Card>

        {/* Fee status */}
        <Card title="Fee Collection">
          <Loading state={list}>
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

      {/* ── Absentees today ──────────────────────────────────────────────── */}
      {attMarkedToday && absentDetails.length > 0 && (
        <Card
          title={
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              🔴 Absent Today
              <span className="mini" style={{ fontWeight: 400 }}>call parents if unplanned</span>
            </span>
          }
          style={{ marginBottom: 18 }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "6px 0" }}>
            {absentDetails.map((s) => (
              <div key={s.id} style={{
                background: "rgba(255,92,124,0.1)", border: "1px solid rgba(255,92,124,0.3)",
                borderRadius: 10, padding: "8px 14px", fontSize: 13,
              }}>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div className="mini">Roll {s.roll} · {s.phone || "no phone"}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── At-risk students table ───────────────────────────────────────── */}
      <Card title={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          🚨 Students Needing Attention
          <span className="mini" style={{ fontWeight: 400 }}>
            {atRisk.length > 0
              ? `${atRisk.length} student${atRisk.length > 1 ? "s" : ""} flagged`
              : "all clear"}
          </span>
        </span>
      }>
        <Loading state={list}>
          {atRisk.length === 0 ? (
            <div style={{ padding: "14px 6px", color: "var(--good)", fontSize: 13 }}>
              🎉 No at-risk students — great work!
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th style={{ textAlign: "center" }}>Attendance</th>
                  <th style={{ textAlign: "center" }}>Fails</th>
                  <th style={{ textAlign: "center" }}>Avg Mark</th>
                  <th>Guardian</th>
                  <th>Phone</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b><span className="mini" style={{ marginLeft: 6, color: "var(--muted)" }}>Roll {s.roll}</span></td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${Number(s.att) < 75 ? "b-bad" : "b-warn"}`}>
                        {s.att}%
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {s.fails > 0
                        ? <span className="badge b-bad">{s.fails} subject{s.fails > 1 ? "s" : ""}</span>
                        : <span className="badge b-good">Pass</span>}
                    </td>
                    <td style={{ textAlign: "center", color: s.avg != null && s.avg < 50 ? "var(--bad)" : "inherit" }}>
                      {s.avg != null ? s.avg + "%" : "—"}
                    </td>
                    <td>{s.guardian || "—"}</td>
                    <td className="mini" style={{ color: "var(--muted)" }}>{s.phone || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {Number(s.att) < 75 && <span className="badge b-bad" style={{ fontSize: 10 }}>Low att.</span>}
                        {s.fails > 0   && <span className="badge b-bad" style={{ fontSize: 10 }}>Exam fail</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Loading>
      </Card>
    </>
  );
}

// ─── Attendance Entry ────────────────────────────────────────────────────────
function AttendanceEntry() {
  const { MY_CLASS, MY_CLASS_ID, myClasses } = useMyClass();
  const [date, setDate]       = useState(getLocalDateStr());
  const [activeClassId, setActiveClassId] = useState(MY_CLASS_ID);
  const [activeClassName, setActiveClassName] = useState(MY_CLASS);

  // Sync initial values once meData loads
  React.useEffect(() => {
    if (MY_CLASS_ID && !activeClassId) { setActiveClassId(MY_CLASS_ID); setActiveClassName(MY_CLASS); }
  }, [MY_CLASS_ID]);

  const day  = useApi(() => api.getAttendanceByDate(activeClassId, date), [activeClassId, date]);
  const rows = day.data || [];
  const [marks, setMarks] = useState({});
  const statusOf = (r) => marks[r.studentId] || r.status || "present";
  const toggle = (r) => setMarks({ ...marks, [r.studentId]: statusOf(r) === "present" ? "absent" : "present" });
  const present = rows.filter((r) => statusOf(r) === "present").length;

  const handleClassChange = (e) => {
    const id = Number(e.target.value);
    const cls = myClasses.find((c) => c.id === id);
    setActiveClassId(id);
    setActiveClassName(cls ? cls.name : "");
    setMarks({});
  };

  const save = async () => {
    const records = rows.map((r) => ({ studentId: r.studentId, status: statusOf(r) }));
    const res = await api.saveAttendance(activeClassId, date, records);
    setMarks({}); day.reload();
    alert(`Saved attendance for ${date} (${res.saved} students).`);
  };

  return (
    <>
      <PageHead title={`Attendance — ${activeClassName || "…"}`} sub="Pick a class & date, tap to toggle, Save (stored for the year)"
        right={<span className="pill">{present} present · {rows.length - present} absent</span>} />
      <Card title={
        <>
          <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {myClasses.length > 1 && (
              <select className="compose" style={{ maxWidth: 160 }} value={activeClassId || ""} onChange={handleClassChange}>
                {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--txt)", borderRadius: 8, padding: "6px 10px", fontSize: 13 }} />
          </span>
          <button className="btn sm" onClick={save}>Save attendance</button>
        </>
      }>
        <Loading state={day}>
          {rows.length === 0 ? <div className="mini">No students in this class.</div> : (
            <div className="grid g4" style={{ gap: 9 }}>
              {rows.map((r) => {
                const p = statusOf(r) === "present";
                return (
                  <div className="att-cell" key={r.studentId} onClick={() => toggle(r)}>
                    <div><div className="nm">{r.name}</div><div className="rn">Roll {r.roll}</div></div>
                    <div className={`pres ${p ? "p-yes" : "p-no"}`}>{p ? "P" : "A"}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mini" style={{ marginTop: 10 }}>Saved per date in the database — viewable any day, kept for the academic year.</div>
        </Loading>
      </Card>
    </>
  );
}

// ─── Students ────────────────────────────────────────────────────────────────
function Students() {
  const { MY_CLASS, MY_CLASS_ID, myClasses } = useMyClass();
  const [activeClass, setActiveClass] = useState(null); // {id, name}

  // Sync once meData loads
  React.useEffect(() => {
    if (!activeClass && MY_CLASS_ID) setActiveClass({ id: MY_CLASS_ID, name: MY_CLASS });
  }, [MY_CLASS_ID]);

  const cls = activeClass?.name || MY_CLASS;
  const list = useApi(() => api.listStudents(cls), [cls]);
  const [form, setForm] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const done = () => { setForm(null); list.reload(); };

  const handleClassChange = (e) => {
    const id = Number(e.target.value);
    const found = myClasses.find((c) => c.id === id);
    setActiveClass(found || null);
  };

  return (
    <>
      <PageHead title="Students"
        sub={myClasses.length > 1 ? "Select a class to view students" : `Class ${cls} (saved to the database)`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {myClasses.length > 1 && (
              <select className="compose" style={{ maxWidth: 160 }} value={activeClass?.id || ""} onChange={handleClassChange}>
                {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button className="btn" onClick={() => setForm({ student: null })}>＋ Add student</button>
          </div>
        } />
      <Card>
        <Loading state={list}>
          <table>
            <thead>
              <tr>
                <th>Roll</th><th>Name</th><th>Att.</th><th>Fee</th>
                <th>Remarks</th><th>Guardian</th><th>Phone</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(list.data || []).map((s) => (
                <tr key={s.id}>
                  <td>{s.roll}</td>
                  <td><b style={{ cursor: "pointer" }} onClick={() => setProfileId(s.id)}>{s.name}</b></td>
                  <td>
                    <span className={`badge ${Number(s.att) >= 85 ? "b-good" : Number(s.att) >= 75 ? "b-warn" : "b-bad"}`}>
                      {s.att}%
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${s.fee === "Paid" ? "b-good" : s.fee === "Partial" ? "b-warn" : "b-bad"}`}>
                      {s.fee}
                    </span>
                  </td>
                  <td className="mini" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: s.remarks ? "var(--txt)" : "var(--muted)" }}>
                    {s.remarks || "—"}
                  </td>
                  <td>{s.guardian}</td>
                  <td className="mini">{s.phone}</td>
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
          classes={myClasses.map((c) => c.name)}
          lockedClass={cls}
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

// ─── Results ─────────────────────────────────────────────────────────────────
function Results() {
  const [mode, setMode] = useState("enter");
  const tabs = [
    { id: "enter", name: "Enter marks" },
    { id: "create", name: "Create exam" },
  ];
  return (
    <>
      <PageHead title="Exam Results" sub="Enter marks for a class & subject · create exams" />
      <Tabs items={tabs} value={mode} onChange={setMode} />
      {mode === "enter" ? <EnterMarks /> : <CreateExam />}
    </>
  );
}

function EnterMarks() {
  const { myClasses } = useMyClass();
  const exams = useApi(() => api.getExams(), []);
  const subs = useApi(() => api.getSubjects(), []);
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  // Pre-select the first class once myClasses loads
  React.useEffect(() => {
    if (!classId && myClasses.length) setClassId(String(myClasses[0].id));
  }, [myClasses.length]);

  const ready = examId && classId && subjectId;
  const grid = useApi(
    () => (ready ? api.getMarksGrid(examId, classId, subjectId) : Promise.resolve([])),
    [examId, classId, subjectId]
  );
  const [edits, setEdits] = useState({});
  const rows = grid.data || [];

  const onChange = (sid, v) => setEdits({ ...edits, [sid]: v });
  const save = async () => {
    const marks = rows.map((r) => ({ studentId: r.studentId, mark: edits[r.studentId] ?? r.mark }));
    const r = await api.saveMarks(examId, subjectId, marks, classId);
    alert(`Saved ${r.saved} marks.`);
    setEdits({}); grid.reload();
  };

  return (
    <>
      <div className="notice">Pick an exam, class and subject, enter marks, and Save — they're written to the database.</div>
      <Card title="Select">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select className="compose" style={{ maxWidth: 220 }} value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">Exam…</option>
            {(exams.data || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <select className="compose" style={{ maxWidth: 160 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Class…</option>
            {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="compose" style={{ maxWidth: 180 }} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Subject…</option>
            {(subs.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </Card>
      {ready && (
        <Card title={<>Marks <button className="btn sm" onClick={save}>Save marks</button></>} className="">
          <Loading state={grid}>
            {rows.length === 0 ? <div className="mini">No students in this class.</div> : (
              <table>
                <thead><tr><th>Roll</th><th>Student</th><th>Mark / 100</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.studentId}><td>{r.roll}</td><td>{r.name}</td>
                      <td><input type="number" min="0" max="100"
                        style={{ width: 90, background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--txt)", borderRadius: 7, padding: "6px 9px" }}
                        value={edits[r.studentId] ?? (r.mark ?? "")}
                        onChange={(e) => onChange(r.studentId, e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Loading>
        </Card>
      )}
    </>
  );
}

function CreateExam() {
  const exams = useApi(() => api.getExams(), []);
  const subs = useApi(() => api.getSubjects(), []);
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState({});   // subjectId -> bool
  const allSubs = subs.data || [];

  const toggle = (id) => setChosen({ ...chosen, [id]: !chosen[id] });
  const selectedIds = allSubs.filter((s) => chosen[s.id]).map((s) => s.id);

  const addSub = async () => {
    const nm = prompt("New subject name (e.g. Hindi):");
    if (!nm) return;
    const r = await api.addSubject(nm.trim());
    await subs.reload();
    setChosen((c) => ({ ...c, [r.id]: true }));
  };
  const create = async () => {
    if (!name.trim()) { alert("Enter an exam name"); return; }
    const ids = selectedIds.length ? selectedIds : allSubs.map((s) => s.id);
    await api.createExam(name.trim(), ids);
    setName(""); setChosen({}); exams.reload();
    alert("Exam created.");
  };
  return (
    <div className="grid g2">
      <Card title="New exam">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="compose" style={{ width: "100%" }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Exam name, e.g. Mid Term 1" />
          <div className="mini">Choose subjects for this exam (e.g. Hindi only for classes that take it):</div>
          <Loading state={subs}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allSubs.map((s) => (
                <label key={s.id} className="chip" style={{ cursor: "pointer", fontSize: 12, background: chosen[s.id] ? "rgba(124,92,255,.25)" : "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 11px", display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={!!chosen[s.id]} onChange={() => toggle(s.id)} />{s.name}
                </label>
              ))}
              <button className="btn ghost sm" onClick={addSub}>＋ Add subject</button>
            </div>
          </Loading>
          <div className="mini">{selectedIds.length ? `${selectedIds.length} selected` : "none selected → all subjects will be used"}</div>
          <button className="btn" onClick={create}>Create exam</button>
        </div>
      </Card>
      <Card title="Existing exams">
        <Loading state={exams}>
          {(exams.data || []).map((x) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 0", borderBottom: "1px solid rgba(42,47,99,.5)" }}>
              <b style={{ flex: 1, fontSize: 13 }}>{x.name}</b>
              <span className={`badge ${x.status === "open" ? "b-warn" : "b-good"}`}>{x.status}</span>
            </div>
          ))}
        </Loading>
      </Card>
    </div>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────
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

// ─── Messages ─────────────────────────────────────────────────────────────────
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

// ─── Timetable ───────────────────────────────────────────────────────────────
const SUBJ_COLORS_TT = {
  Tamil:"#ff5c7c", English:"#5aa9ff", Maths:"#7c5cff",
  Science:"#34d1bf", Social:"#ffb454", Computer:"#ff8c42", "P.E.":"#4ade80", Library:"#9b7bff", Games:"#aaa",
};
const sc = (s) => SUBJ_COLORS_TT[s] || "#9b7bff";

function Timetable() {
  const { MY_CLASS, MY_CLASS_ID } = useMyClass();
  const tt   = useApi(() => api.getTimetableDB(MY_CLASS_ID), [MY_CLASS_ID]);
  const subs = useApi(() => api.getSubjects(), []);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(null);

  const schedule   = (editing ? draft : tt.data) || [];
  const allSubs    = (subs.data || []).map((s) => s.name);
  const maxPeriods = Math.min(8, Math.max(6, ...schedule.map((r) => (r.subjects || []).length)));
  const PERIODS    = Array.from({ length: maxPeriods }, (_, i) => `P${i + 1}`);

  const startEdit = () => { setDraft(JSON.parse(JSON.stringify(tt.data || []))); setEditing(true); };
  const cancelEdit = () => { setDraft(null); setEditing(false); };

  const setCell = (di, pi, val) =>
    setDraft(draft.map((row, i) => i !== di ? row : { ...row, subjects: row.subjects.map((s, j) => j !== pi ? s : val) }));

  const addPeriod = () => {
    if (maxPeriods >= 8) return alert("Max 8 periods per day.");
    setDraft(draft.map((row) => ({ ...row, subjects: [...(row.subjects || []), allSubs[0] || ""] })));
  };
  const removePeriod = () => {
    const cur = Math.max(6, ...draft.map((r) => (r.subjects || []).length));
    if (cur <= 6) return alert("Minimum 6 periods.");
    setDraft(draft.map((row) => ({ ...row, subjects: (row.subjects || []).slice(0, -1) })));
  };

  const save = async () => {
    await api.saveTimetable(MY_CLASS_ID, draft);
    setEditing(false); setDraft(null); tt.reload();
    alert("Timetable saved.");
  };

  return (
    <>
      <PageHead
        title={`Timetable — ${MY_CLASS}`}
        sub={`Weekly class schedule · ${maxPeriods} periods/day`}
        right={
          editing ? (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button className="btn ghost sm" onClick={removePeriod}>− Period</button>
              <button className="btn ghost sm" onClick={addPeriod}>+ Period</button>
              <button className="btn ghost sm" onClick={cancelEdit}>Cancel</button>
              <button className="btn sm" onClick={save}>Save</button>
            </div>
          ) : (
            <button className="btn sm" onClick={startEdit}>✏️ Edit timetable</button>
          )
        }
      />
      <Card>
        <Loading state={tt}>
          <div style={{ overflowX:"auto" }}>
            <div className="ttg" style={{ gridTemplateColumns: `80px repeat(${maxPeriods}, 1fr)`, minWidth: maxPeriods > 6 ? 700 : "unset" }}>
              <div className="h">Day</div>
              {PERIODS.map((p) => <div className="h" key={p}>{p}</div>)}
              {schedule.map((row, di) => (
                <Fragment key={row.day}>
                  <div className="dd">{row.day}</div>
                  {Array.from({ length: maxPeriods }, (_, pi) => {
                    const sub = (row.subjects || [])[pi] || "";
                    return (
                      <div className="c" key={pi}>
                        {editing ? (
                          <select
                            value={sub}
                            onChange={(e) => setCell(di, pi, e.target.value)}
                            style={{ background:"var(--panel2)", border:"1px solid var(--line)", color:"var(--txt)", borderRadius:6, padding:"4px 5px", fontSize:11, width:"100%" }}
                          >
                            <option value="">—</option>
                            {allSubs.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <b style={{ color: sub ? sc(sub) : "var(--muted)", fontSize:12 }}>{sub || "—"}</b>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          {editing && (
            <div className="mini" style={{ marginTop:10 }}>
              Use + / − Period buttons to add or remove periods (6–8). Select subjects then Save.
            </div>
          )}
        </Loading>
      </Card>
    </>
  );
}

// ─── Student Report (sub-component for Reports screen) ───────────────────────
function StudentReport({ studentId, onBack }) {
  const student    = useApi(() => api.getStudent(studentId),        [studentId]);
  const attendance = useApi(() => api.getStudentAttendance(studentId), [studentId]);
  const allMarks   = useApi(() => api.getStudentMarksAll(studentId), [studentId]);
  const feesDetail = useApi(() => api.getFees(studentId),           [studentId]);

  const s           = student.data;
  const attRows     = attendance.data || [];
  const totalDays   = attRows.length;
  const presentDays = attRows.filter((r) => r.status === "present").length;
  const absentDays  = totalDays - presentDays;
  const lateDays    = attRows.filter((r) => r.status === "late").length;
  const attPct      = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;
  const absentDates = attRows.filter((r) => r.status === "absent").map((r) => {
    const d = new Date(r.date);
    return d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
  });

  const examData = allMarks.data || [];
  const feeTerms = (feesDetail.data && feesDetail.data.terms) || [];
  const initials = s ? s.name.split(" ").map((w) => w[0]).join("").slice(0, 2) : "??";

  // Subject matrix
  const subjects = examData.length ? [...new Set(examData.flatMap((e) => e.marks.map((m) => m.subject)))] : [];
  const subjectMatrix = {};
  subjects.forEach((sub) => {
    subjectMatrix[sub] = {};
    examData.forEach((exam) => {
      const m = exam.marks.find((x) => x.subject === sub);
      subjectMatrix[sub][exam.examId] = m ? m.mark : null;
    });
  });

  // Per-exam averages + pass/fail counts
  const PASS_MARK = 35;
  const examAvgs = examData.map((exam) => {
    const valid   = exam.marks.filter((m) => m.mark != null);
    const avg     = valid.length ? Math.round(valid.reduce((a, m) => a + m.mark, 0) / valid.length) : null;
    const passed  = valid.filter((m) => m.mark >= PASS_MARK).length;
    const failed  = valid.filter((m) => m.mark < PASS_MARK).length;
    const total   = valid.reduce((a, m) => a + m.mark, 0);
    const maxPoss = valid.length * 100;
    return { name: exam.examName, avg, passed, failed, total, maxPoss };
  });

  // Best / weakest subject (by best score across all exams)
  const subjectBest = subjects.map((sub) => {
    const marks = examData.map((e) => subjectMatrix[sub][e.examId]).filter((m) => m != null);
    return { subject: sub, best: marks.length ? Math.max(...marks) : null, avg: marks.length ? Math.round(marks.reduce((a,b) => a+b,0)/marks.length) : null };
  }).filter((x) => x.best != null);
  const bestSubj  = subjectBest.length ? subjectBest.reduce((a, b) => a.best > b.best ? a : b) : null;
  const worstSubj = subjectBest.length ? subjectBest.reduce((a, b) => a.avg < b.avg ? a : b) : null;

  // Overall totals
  const allValidMarks = examData.flatMap((e) => e.marks.filter((m) => m.mark != null).map((m) => m.mark));
  const totalEarned   = allValidMarks.reduce((a, b) => a + b, 0);
  const totalPossible = allValidMarks.length * 100;
  const overallPct    = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

  const latestAvg    = examAvgs.length ? examAvgs[examAvgs.length - 1].avg : null;
  const overallGrade = latestAvg != null ? config.academics.grade(latestAvg) : "—";

  const trend      = examAvgs.length >= 2 ? (examAvgs[examAvgs.length-1].avg||0) - (examAvgs[examAvgs.length-2].avg||0) : 0;
  const trendIcon  = trend > 2 ? "↑" : trend < -2 ? "↓" : "→";
  const trendColor = trend > 2 ? "var(--good)" : trend < -2 ? "var(--bad)" : "var(--muted)";

  const markColor = (v) => v >= 80 ? "#4ade80" : v >= 60 ? "#34d1bf" : v >= PASS_MARK ? "#ffb454" : "#ff5c7c";
  const markBg    = (v) => v == null ? "transparent" : v >= 80 ? "rgba(74,222,128,0.15)" : v >= 60 ? "rgba(52,209,191,0.12)" : v >= PASS_MARK ? "rgba(255,180,84,0.15)" : "rgba(255,92,124,0.15)";
  const money     = (v) => "₹" + Number(v||0).toLocaleString("en-IN");
  const fmtDate   = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

  // ── Month-wise attendance ──────────────────────────────────────────────────
  const monthMap = {};
  attRows.forEach((r) => {
    const m = r.date.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = { present:0, absent:0, late:0 };
    monthMap[m][r.status] = (monthMap[m][r.status] || 0) + 1;
  });
  const months = Object.entries(monthMap).map(([key, v]) => {
    const total = (v.present||0) + (v.absent||0) + (v.late||0);
    const pct   = total ? Math.round(((v.present||0) / total) * 100) : 0;
    const d     = new Date(key + "-01");
    return { key, label: d.toLocaleDateString("en-IN", { month:"short", year:"numeric" }), ...v, total, pct };
  }).sort((a, b) => a.key.localeCompare(b.key));

  // ── Consecutive absences (runs of 3+) ─────────────────────────────────────
  const sortedAbsent = attRows.filter((r) => r.status === "absent").map((r) => r.date).sort();
  const consecutiveRuns = [];
  let _run = [];
  sortedAbsent.forEach((d, i) => {
    if (i === 0) { _run = [d]; return; }
    const diff = (new Date(d) - new Date(sortedAbsent[i - 1])) / 86400000;
    if (diff === 1) { _run.push(d); }
    else { if (_run.length >= 3) consecutiveRuns.push([..._run]); _run = [d]; }
  });
  if (_run.length >= 3) consecutiveRuns.push(_run);

  // ── Per-subject trend (↑↓→ comparing last two exams) ─────────────────────
  const subjectTrends = {};
  subjects.forEach((sub) => {
    const marks = examData.map((e) => subjectMatrix[sub][e.examId]).filter((m) => m != null);
    if (marks.length >= 2) {
      const diff = marks[marks.length - 1] - marks[marks.length - 2];
      subjectTrends[sub] = diff > 3 ? "up" : diff < -3 ? "down" : "stable";
    }
  });

  // ── Risk flags ─────────────────────────────────────────────────────────────
  const riskFlags = [];
  if (attPct < 75)
    riskFlags.push({ level:"bad",  msg: `Attendance ${attPct}% — below 75% minimum. Urgent follow-up needed.` });
  else if (attPct < 85)
    riskFlags.push({ level:"warn", msg: `Attendance ${attPct}% — below recommended 85%.` });
  if (consecutiveRuns.length > 0)
    riskFlags.push({ level:"warn", msg: `${consecutiveRuns.length} instance(s) of 3+ consecutive absences detected.` });
  const failedSubs = subjects.filter((sub) => {
    const last = examData[examData.length - 1];
    const m    = last ? subjectMatrix[sub][last.examId] : null;
    return m != null && m < PASS_MARK;
  });
  if (failedSubs.length > 0)
    riskFlags.push({ level:"bad",  msg: `Failed in ${failedSubs.length} subject${failedSubs.length > 1 ? "s" : ""}: ${failedSubs.join(", ")}.` });
  if (s && s.fees && s.fees.pending > 0)
    riskFlags.push({ level:"warn", msg: `Fee pending: ${money(s.fees.pending)}.` });

  // ── Auto-narrative ─────────────────────────────────────────────────────────
  const narrative = s ? (() => {
    const parts = [];
    parts.push(`${s.name} is enrolled in Class ${s.class_name} (Roll ${s.roll_no}${s.admission_no ? `, Adm. No. ${s.admission_no}` : ""}).`);
    if (totalDays > 0) {
      const attLabel = attPct >= 85 ? "Good" : attPct >= 75 ? "Satisfactory — needs improvement" : "Poor — immediate attention required";
      parts.push(`Attendance this term is ${attPct}% (${presentDays}/${totalDays} days) — ${attLabel}.`);
    }
    if (latestAvg != null) {
      const perfLabel = latestAvg >= 80 ? "Excellent" : latestAvg >= 60 ? "Good" : latestAvg >= PASS_MARK ? "Satisfactory" : "Below passing — needs support";
      parts.push(`Academic performance is ${perfLabel} with a latest exam average of ${latestAvg}% (Grade ${overallGrade}).`);
    }
    if (bestSubj && worstSubj && bestSubj.subject !== worstSubj.subject)
      parts.push(`Strongest in ${bestSubj.subject} (${bestSubj.best}/100); needs focus on ${worstSubj.subject} (avg ${worstSubj.avg}/100).`);
    if (s.fees)
      parts.push(`Fee status: ${s.fees.pending > 0 ? `${money(s.fees.pending)} pending out of ${money(s.fees.total)} total` : "Fully paid"}.`);
    return parts.join(" ");
  })() : "";

  return (
    <>
      <div className="no-print" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <button className="btn ghost sm" onClick={onBack}>← Back to list</button>
        <button className="btn sm" onClick={() => window.print()}>⬇ Download PDF</button>
      </div>

      <div id="student-report">
        <Loading state={student}>
          {s && (
            <>
              {/* ── Print header ──────────────────────────────────────────── */}
              <div className="print-only" style={{ textAlign:"center", marginBottom:20, paddingBottom:16, borderBottom:"2px solid #ddd" }}>
                <div style={{ fontSize:22, fontWeight:800 }}>{config.school.name}</div>
                <div style={{ fontSize:13, color:"#555" }}>Student Progress Report · Academic Year {config.school.academicYear}</div>
              </div>

              {/* ── Hero identity card ────────────────────────────────────── */}
              <div style={{ background:"linear-gradient(135deg,rgba(124,92,255,0.1),rgba(52,209,191,0.06))", border:"1px solid rgba(124,92,255,0.25)", borderRadius:16, padding:"20px 24px", marginBottom:16 }}>
                <div style={{ display:"flex", gap:20, alignItems:"flex-start", flexWrap:"wrap" }}>
                  {/* Avatar */}
                  <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#7c5cff,#34d1bf)", color:"#fff", fontWeight:800, fontSize:26, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 16px rgba(124,92,255,0.35)" }}>
                    {initials}
                  </div>

                  {/* Name + details grid */}
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>{s.name}</div>

                    {/* Row 1 — academic */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"4px 16px", fontSize:12, marginBottom:6 }}>
                      <span><span style={{ color:"var(--muted)" }}>Class: </span><b>{s.class_name}</b></span>
                      <span><span style={{ color:"var(--muted)" }}>Roll No: </span><b>{s.roll_no}</b></span>
                      {s.admission_no && <span><span style={{ color:"var(--muted)" }}>Adm No: </span><b>{s.admission_no}</b></span>}
                      {s.admission_date && <span><span style={{ color:"var(--muted)" }}>Admitted: </span><b>{fmtDate(s.admission_date)}</b></span>}
                    </div>

                    {/* Row 2 — personal */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"4px 16px", fontSize:12, marginBottom:6 }}>
                      {s.gender     && <span><span style={{ color:"var(--muted)" }}>Gender: </span><b style={{ textTransform:"capitalize" }}>{s.gender}</b></span>}
                      {s.dob        && <span><span style={{ color:"var(--muted)" }}>DOB: </span><b>{fmtDate(s.dob)}</b></span>}
                      {s.blood_group && <span><span style={{ color:"var(--muted)" }}>Blood: </span><b>{s.blood_group}</b></span>}
                    </div>

                    {/* Row 3 — contact */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"4px 16px", fontSize:12, marginBottom:6 }}>
                      {s.student_phone && <span><span style={{ color:"var(--muted)" }}>Phone: </span><b>{s.student_phone}</b></span>}
                      {s.student_email && <span><span style={{ color:"var(--muted)" }}>Email: </span><b>{s.student_email}</b></span>}
                    </div>
                    {s.address && (
                      <div style={{ fontSize:12, marginBottom:6 }}>
                        <span style={{ color:"var(--muted)" }}>Address: </span><b>{s.address}</b>
                      </div>
                    )}

                    {/* Row 4 — guardian */}
                    <div style={{ background:"rgba(124,92,255,0.06)", borderRadius:8, padding:"8px 12px", marginTop:4 }}>
                      <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4, fontWeight:600, letterSpacing:0.5 }}>GUARDIAN</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"4px 16px", fontSize:12 }}>
                        <span><span style={{ color:"var(--muted)" }}>Name: </span><b>{s.guardian_name || "—"}</b>{s.guardian_relation && <span style={{ color:"var(--muted)" }}> ({s.guardian_relation})</span>}</span>
                        {s.guardian_phone && <span><span style={{ color:"var(--muted)" }}>Phone: </span><b>{s.guardian_phone}</b></span>}
                        {s.guardian_email && <span><span style={{ color:"var(--muted)" }}>Email: </span><b>{s.guardian_email}</b></span>}
                      </div>
                    </div>
                  </div>

                  {/* Stat pills */}
                  <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end", flexShrink:0 }}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
                      {[
                        { val: attPct + "%", label: "Attendance", color: attPct >= 85 ? "var(--good)" : attPct >= 75 ? "var(--warn)" : "var(--bad)" },
                        ...(latestAvg != null ? [{ val: latestAvg, label: "Latest avg", color: markColor(latestAvg) }] : []),
                        { val: overallGrade, label: "Grade", color: overallGrade === "F" ? "var(--bad)" : overallGrade.includes("A") ? "var(--good)" : "var(--warn)" },
                        ...(s.fees ? [{ val: s.fees.pending > 0 ? "Due" : "Paid", label: "Fees", color: s.fees.pending > 0 ? "var(--bad)" : "var(--good)" }] : []),
                      ].map((p, i) => (
                        <div key={i} style={{ textAlign:"center", background:"var(--panel2)", borderRadius:12, padding:"10px 16px", minWidth:72 }}>
                          <div style={{ fontSize:22, fontWeight:800, color:p.color }}>{p.val}</div>
                          <div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{p.label}</div>
                        </div>
                      ))}
                    </div>
                    {overallPct != null && (
                      <div style={{ fontSize:11, color:"var(--muted)" }}>
                        Total: {totalEarned}/{totalPossible} marks ({overallPct}%)
                      </div>
                    )}
                    {trend !== 0 && (
                      <div style={{ fontSize:12, color:trendColor, fontWeight:700 }}>{trendIcon} {Math.abs(trend)} pts vs prev exam</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Risk flags ───────────────────────────────────────────── */}
              {riskFlags.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
                  {riskFlags.map((f, i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:10, padding:"9px 14px", borderRadius:10, fontSize:13,
                      background: f.level === "bad" ? "rgba(255,92,124,0.08)" : "rgba(255,180,84,0.08)",
                      border: `1px solid ${f.level === "bad" ? "rgba(255,92,124,0.3)" : "rgba(255,180,84,0.3)"}`,
                      color: f.level === "bad" ? "var(--bad)" : "var(--warn)",
                    }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{f.level === "bad" ? "🔴" : "🟡"}</span>
                      <span>{f.msg}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Auto narrative ────────────────────────────────────────── */}
              {narrative && (
                <div style={{
                  background:"var(--panel2)", border:"1px solid var(--line)", borderRadius:12,
                  padding:"14px 18px", marginBottom:16, fontSize:13, lineHeight:1.8, color:"var(--txt)",
                }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", marginBottom:6, letterSpacing:0.5 }}>📋 SUMMARY</div>
                  {narrative}
                </div>
              )}

              {/* ── Highlights row ────────────────────────────────────────── */}
              {subjectBest.length > 0 && (
                <div className="grid g3" style={{ marginBottom:16, gap:12 }}>
                  {bestSubj && (
                    <div style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.25)", borderRadius:12, padding:"12px 16px" }}>
                      <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>🏆 STRONGEST SUBJECT</div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{bestSubj.subject}</div>
                      <div style={{ fontSize:20, fontWeight:800, color:"var(--good)", marginTop:2 }}>Best {bestSubj.best}/100</div>
                      <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>Avg {bestSubj.avg}/100</div>
                    </div>
                  )}
                  {worstSubj && worstSubj.subject !== bestSubj?.subject && (
                    <div style={{ background:"rgba(255,92,124,0.08)", border:"1px solid rgba(255,92,124,0.25)", borderRadius:12, padding:"12px 16px" }}>
                      <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>⚠ NEEDS ATTENTION</div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{worstSubj.subject}</div>
                      <div style={{ fontSize:20, fontWeight:800, color:"var(--bad)", marginTop:2 }}>Best {worstSubj.best}/100</div>
                      <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>Avg {worstSubj.avg}/100</div>
                    </div>
                  )}
                  <div style={{ background:"rgba(90,169,255,0.08)", border:"1px solid rgba(90,169,255,0.25)", borderRadius:12, padding:"12px 16px" }}>
                    <div style={{ fontSize:11, color:"var(--muted)", marginBottom:6 }}>📈 EXAM TREND</div>
                    <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:44 }}>
                      {examAvgs.map((e, i) => {
                        const h = e.avg != null ? Math.max(6, Math.round((e.avg / 100) * 40)) : 4;
                        return (
                          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                            <div style={{ fontSize:9, color: e.avg != null ? markColor(e.avg) : "var(--muted)", fontWeight:700 }}>{e.avg ?? "—"}</div>
                            <div style={{ width:"100%", height:h, background: e.avg != null ? markColor(e.avg) : "var(--line)", borderRadius:"3px 3px 0 0", opacity:0.85 }} />
                            <div style={{ fontSize:8, color:"var(--muted)", textAlign:"center", lineHeight:1.2 }}>{e.name.split(" ").slice(0,2).join(" ")}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Performance matrix ────────────────────────────────────── */}
              {examData.length > 0 && subjects.length > 0 && (
                <Card title="📊 Subject-wise Performance" style={{ marginBottom:16 }}>
                  <Loading state={allMarks}>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ fontSize:13 }}>
                        <thead>
                          <tr>
                            <th style={{ minWidth:100 }}>Subject</th>
                            {examData.map((e) => <th key={e.examId} style={{ textAlign:"center", minWidth:80 }}>{e.examName}</th>)}
                            <th style={{ textAlign:"center" }}>Best</th>
                            <th style={{ textAlign:"center" }}>Avg</th>
                            <th style={{ textAlign:"center" }}>Trend</th>
                            <th style={{ textAlign:"center" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map((sub) => {
                            const marks   = examData.map((e) => subjectMatrix[sub][e.examId]);
                            const valid   = marks.filter((m) => m != null);
                            const best    = valid.length ? Math.max(...valid) : null;
                            const avg     = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
                            const passing = valid.every((m) => m >= PASS_MARK);
                            return (
                              <tr key={sub}>
                                <td>
                                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ width:8, height:8, borderRadius:2, background:sc(sub), display:"inline-block", flexShrink:0 }} />
                                    <b>{sub}</b>
                                  </div>
                                </td>
                                {marks.map((m, i) => (
                                  <td key={i} style={{ textAlign:"center", background:markBg(m), fontWeight:600, color: m != null ? markColor(m) : "var(--muted)" }}>
                                    {m != null ? m : "—"}
                                  </td>
                                ))}
                                <td style={{ textAlign:"center", fontWeight:700, color: best != null ? markColor(best) : "var(--muted)" }}>{best ?? "—"}</td>
                                <td style={{ textAlign:"center", color: avg != null ? markColor(avg) : "var(--muted)" }}>{avg ?? "—"}</td>
                                <td style={{ textAlign:"center", fontSize:16, fontWeight:700 }}>
                                  {subjectTrends[sub] === "up"     ? <span style={{ color:"var(--good)" }}>↑</span>
                                  : subjectTrends[sub] === "down"  ? <span style={{ color:"var(--bad)" }}>↓</span>
                                  : subjectTrends[sub] === "stable"? <span style={{ color:"var(--muted)" }}>→</span>
                                  : <span className="mini">—</span>}
                                </td>
                                <td style={{ textAlign:"center" }}>
                                  {valid.length > 0
                                    ? <span className={`badge ${passing ? "b-good" : "b-bad"}`}>{passing ? "Pass" : "Fail"}</span>
                                    : <span className="mini">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Totals row */}
                          <tr style={{ borderTop:"2px solid var(--line)", background:"var(--panel2)" }}>
                            <td><b>Class avg</b></td>
                            {examAvgs.map((e, i) => (
                              <td key={i} style={{ textAlign:"center", fontWeight:700, color: e.avg != null ? markColor(e.avg) : "var(--muted)" }}>{e.avg ?? "—"}</td>
                            ))}
                            <td />
                            <td style={{ textAlign:"center", fontWeight:800, color: latestAvg != null ? markColor(latestAvg) : "var(--muted)" }}>{latestAvg ?? "—"}</td>
                            <td /><td />
                          </tr>
                          {/* Pass/fail summary row */}
                          <tr style={{ background:"var(--panel2)" }}>
                            <td style={{ color:"var(--muted)", fontSize:11 }}>Pass / Fail</td>
                            {examAvgs.map((e, i) => (
                              <td key={i} style={{ textAlign:"center", fontSize:11 }}>
                                <span style={{ color:"var(--good)" }}>{e.passed}P</span>
                                {e.failed > 0 && <span style={{ color:"var(--bad)" }}> / {e.failed}F</span>}
                              </td>
                            ))}
                            <td colSpan={4} style={{ textAlign:"center", fontSize:11, color:"var(--muted)" }}>
                              Total {totalEarned}/{totalPossible} · {overallPct ?? "—"}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Loading>
                </Card>
              )}

              {/* ── Attendance ────────────────────────────────────────────── */}
              <Card title="📅 Attendance Record" style={{ marginBottom:16 }}>
                <Loading state={attendance}>
                  <div className="grid g2" style={{ gap:16 }}>
                    <div>
                      {/* Summary stats */}
                      <div style={{ display:"flex", gap:14, fontSize:12, marginBottom:10 }}>
                        <span style={{ color:"var(--good)" }}>✓ Present: <b>{presentDays}</b></span>
                        <span style={{ color:"var(--bad)" }}>✗ Absent: <b>{absentDays}</b></span>
                        {lateDays > 0 && <span style={{ color:"var(--warn)" }}>⏱ Late: <b>{lateDays}</b></span>}
                        <span style={{ color:"var(--muted)" }}>Total: <b>{totalDays}</b></span>
                      </div>
                      {/* Calendar dots */}
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        {attRows.map((r) => {
                          const day = new Date(r.date).getDate();
                          const p   = r.status === "present";
                          const l   = r.status === "late";
                          return (
                            <div key={r.date} title={`${r.date} — ${r.status}`} style={{
                              width:30, height:30, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:10, fontWeight:600,
                              background: p ? "rgba(74,222,128,0.15)" : l ? "rgba(255,180,84,0.15)" : "rgba(255,92,124,0.15)",
                              color: p ? "var(--good)" : l ? "var(--warn)" : "var(--bad)",
                              border: `1px solid ${p ? "rgba(74,222,128,0.3)" : l ? "rgba(255,180,84,0.3)" : "rgba(255,92,124,0.3)"}`,
                            }}>
                              {day}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display:"flex", gap:12, marginTop:8, fontSize:11 }}>
                        <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"rgba(74,222,128,0.4)", marginRight:4 }}/>Present</span>
                        <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"rgba(255,92,124,0.4)", marginRight:4 }}/>Absent</span>
                        {lateDays > 0 && <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"rgba(255,180,84,0.4)", marginRight:4 }}/>Late</span>}
                      </div>
                    </div>
                    {/* Absent dates + consecutive runs + month table */}
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:8, color:"var(--bad)" }}>
                        Absent dates ({absentDates.length})
                      </div>
                      {absentDates.length === 0 ? (
                        <div style={{ fontSize:13, color:"var(--good)", marginBottom:10 }}>🎉 No absences!</div>
                      ) : (
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                          {absentDates.map((d, i) => (
                            <span key={i} style={{ fontSize:11, background:"rgba(255,92,124,0.12)", color:"var(--bad)", border:"1px solid rgba(255,92,124,0.3)", borderRadius:6, padding:"3px 8px" }}>
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Consecutive absence alert */}
                      {consecutiveRuns.map((run, i) => (
                        <div key={i} style={{ marginBottom:6, fontSize:12, background:"rgba(255,92,124,0.08)", border:"1px solid rgba(255,92,124,0.25)", borderRadius:8, padding:"7px 12px", color:"var(--bad)" }}>
                          ⚠ {run.length} consecutive absences: {new Date(run[0]).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} – {new Date(run[run.length-1]).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                        </div>
                      ))}

                      {/* Month-wise breakdown */}
                      {months.length > 1 && (
                        <div style={{ marginTop:8 }}>
                          <div style={{ fontSize:11, fontWeight:600, color:"var(--muted)", marginBottom:6, letterSpacing:0.5 }}>MONTH-WISE BREAKDOWN</div>
                          <table style={{ fontSize:12, width:"100%" }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign:"left" }}>Month</th>
                                <th style={{ textAlign:"center" }}>Days</th>
                                <th style={{ textAlign:"center" }}>Present</th>
                                <th style={{ textAlign:"center" }}>Absent</th>
                                {months.some((m) => m.late > 0) && <th style={{ textAlign:"center" }}>Late</th>}
                                <th style={{ textAlign:"center" }}>%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {months.map((m) => (
                                <tr key={m.key}>
                                  <td><b>{m.label}</b></td>
                                  <td style={{ textAlign:"center" }}>{m.total}</td>
                                  <td style={{ textAlign:"center", color:"var(--good)" }}>{m.present||0}</td>
                                  <td style={{ textAlign:"center", color: m.absent > 0 ? "var(--bad)" : "var(--muted)" }}>{m.absent||0}</td>
                                  {months.some((x) => x.late > 0) && <td style={{ textAlign:"center", color:"var(--warn)" }}>{m.late||0}</td>}
                                  <td style={{ textAlign:"center" }}>
                                    <span style={{ fontWeight:700, color: m.pct >= 85 ? "var(--good)" : m.pct >= 75 ? "var(--warn)" : "var(--bad)" }}>{m.pct}%</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </Loading>
              </Card>

              {/* ── Fee detail ────────────────────────────────────────────── */}
              <Card title="💳 Fee Details" style={{ marginBottom:16 }}>
                <Loading state={feesDetail}>
                  {feeTerms.length === 0 ? (
                    <div className="mini">No fee records.</div>
                  ) : (
                    <>
                      {/* Summary bar */}
                      {s.fees && (
                        <div style={{ marginBottom:14 }}>
                          <div style={{ height:8, background:"var(--line)", borderRadius:4, overflow:"hidden", marginBottom:6 }}>
                            <div style={{ height:"100%", width:`${s.fees.total > 0 ? Math.round((s.fees.paid/s.fees.total)*100) : 0}%`, background:"var(--good)", borderRadius:4 }} />
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                            <span style={{ color:"var(--good)" }}>Paid {money(s.fees.paid)}</span>
                            <span style={{ color: s.fees.pending > 0 ? "var(--bad)" : "var(--muted)" }}>
                              {s.fees.pending > 0 ? `Due ${money(s.fees.pending)}` : "✓ Fully paid"}
                            </span>
                            <span style={{ color:"var(--muted)" }}>Total {money(s.fees.total)}</span>
                          </div>
                        </div>
                      )}
                      {/* Term table */}
                      <table style={{ fontSize:13 }}>
                        <thead>
                          <tr>
                            <th>Fee Item</th>
                            <th style={{ textAlign:"right" }}>Amount</th>
                            <th style={{ textAlign:"right" }}>Paid</th>
                            <th style={{ textAlign:"right" }}>Balance</th>
                            <th style={{ textAlign:"center" }}>Status</th>
                            <th>Due Date</th>
                            <th>Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feeTerms.map((t) => {
                            const bal = Number(t.due) - Number(t.paid);
                            const st  = bal <= 0 ? "Paid" : Number(t.paid) > 0 ? "Partial" : "Pending";
                            return (
                              <tr key={t.id}>
                                <td><b>{t.term}</b></td>
                                <td style={{ textAlign:"right" }}>{money(t.due)}</td>
                                <td style={{ textAlign:"right", color:"var(--good)" }}>{money(t.paid)}</td>
                                <td style={{ textAlign:"right", color: bal > 0 ? "var(--bad)" : "var(--muted)" }}>
                                  {bal > 0 ? money(bal) : "—"}
                                </td>
                                <td style={{ textAlign:"center" }}>
                                  <span className={`badge ${st === "Paid" ? "b-good" : st === "Partial" ? "b-warn" : "b-bad"}`}>{st}</span>
                                </td>
                                <td className="mini">{t.date || "—"}</td>
                                <td className="mini">{t.receipt || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </Loading>
              </Card>

              {/* ── Remarks ───────────────────────────────────────────────── */}
              {s.notes && (
                <Card title="📝 Teacher Remarks">
                  <div style={{ fontSize:14, lineHeight:1.7, padding:"4px 0" }}>{s.notes}</div>
                </Card>
              )}
            </>
          )}
        </Loading>
      </div>

      <style>{`
        .print-only { display: none; }
        @media print {
          .no-print, .left-nav, .top-bar { display: none !important; }
          .print-only { display: block !important; }
          #student-report { padding: 20px; }
          body, .layout-shell { background: white !important; color: #111 !important; }
          .card { border: 1px solid #ddd !important; box-shadow: none !important; }
        }
      `}</style>
    </>
  );
}

// ─── Reports ─────────────────────────────────────────────────────────────────
function Reports() {
  const { MY_CLASS, MY_CLASS_ID, myClasses } = useMyClass();
  const [activeClass, setActiveClass] = useState(null);
  React.useEffect(() => {
    if (!activeClass && MY_CLASS_ID) setActiveClass({ id: MY_CLASS_ID, name: MY_CLASS });
  }, [MY_CLASS_ID]);
  const cls = activeClass?.name || MY_CLASS;
  const list = useApi(() => api.listStudents(cls), [cls]);
  const [selectedId, setSelectedId] = useState(null);

  if (selectedId) {
    return <StudentReport studentId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <>
      <PageHead title="Student Reports" sub="Select a student to view full profile and download PDF"
        right={myClasses.length > 1 && (
          <select className="compose" style={{ maxWidth: 160 }} value={activeClass?.id || ""} onChange={(e) => {
            const found = myClasses.find((c) => c.id === Number(e.target.value));
            setActiveClass(found || null);
          }}>
            {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )} />
      <Card>
        <Loading state={list}>
          <div className="grid g4" style={{ gap:10 }}>
            {(list.data || []).map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                style={{ cursor:"pointer", padding:"14px 16px", background:"var(--panel2)", borderRadius:12, border:"1px solid var(--line)", transition:"border-color .2s" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--line)"}
              >
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(124,92,255,0.2)", color:"var(--accent)", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13 }}>{s.name}</div>
                    <div className="mini">Roll {s.roll}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  <span className={`badge ${Number(s.att) >= 85 ? "b-good" : Number(s.att) >= 75 ? "b-warn" : "b-bad"}`} style={{ fontSize:10 }}>
                    {s.att}% att
                  </span>
                  <span className={`badge ${s.fee === "Paid" ? "b-good" : s.fee === "Partial" ? "b-warn" : "b-bad"}`} style={{ fontSize:10 }}>
                    {s.fee}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Loading>
      </Card>
    </>
  );
}

export const teacherNav = [
  { key: "dashboard",  label: "My Class",        icon: "🏠", Component: Dashboard },
  { key: "attendance", label: "Attendance",       icon: "🗓️", Component: AttendanceEntry },
  { key: "students",   label: "Students",         icon: "🎓", Component: Students },
  { key: "timetable",  label: "Timetable",        icon: "🕐", Component: Timetable },
  { key: "results",    label: "Exam Results",     icon: "📊", Component: Results },
  { key: "reports",    label: "Reports",          icon: "📄", Component: Reports },
  { key: "notes",      label: "Notes to Parent",  icon: "📝", Component: Notes },
  { key: "messages",   label: "Messages",         icon: "💬", Component: Messages },
];
