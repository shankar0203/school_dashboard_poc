// TEACHER role screens — live data from the API.
import React, { useState, Fragment } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Tabs, Message, Loading, Donut } from "../components/ui.jsx";
import StudentForm from "../components/StudentForm.jsx";
import StudentProfile from "../components/StudentProfile.jsx";

const { classes } = config.academics;
const MY_CLASS = "8-A";
const MY_CLASS_ID = classes.indexOf(MY_CLASS) + 1; // seeded class ids match config order

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
  const today = getLocalDateStr();
  const todayLabel = getLocalDateLabel();

  // API calls
  const list      = useApi(() => api.listStudents(MY_CLASS), []);
  const exams     = useApi(() => api.getExams(), []);
  const todayAtt  = useApi(() => api.getAttendanceByDate(MY_CLASS_ID, today), [today]);

  const students  = list.data || [];
  const examList  = exams.data || [];
  const latestExam = examList.length ? examList[examList.length - 1] : null;

  const results = useApi(
    () => latestExam ? api.getClassResults(latestExam.id, MY_CLASS_ID) : Promise.resolve([]),
    [latestExam && latestExam.id]
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
  const [date, setDate] = useState(getLocalDateStr());
  const day = useApi(() => api.getAttendanceByDate(MY_CLASS_ID, date), [date]);
  const rows = day.data || [];
  const [marks, setMarks] = useState({});        // studentId -> 'present'|'absent'
  // current status = local edit, else loaded status, else default present
  const statusOf = (r) => marks[r.studentId] || r.status || "present";
  const toggle = (r) => setMarks({ ...marks, [r.studentId]: statusOf(r) === "present" ? "absent" : "present" });
  const present = rows.filter((r) => statusOf(r) === "present").length;

  const save = async () => {
    const records = rows.map((r) => ({ studentId: r.studentId, status: statusOf(r) }));
    const res = await api.saveAttendance(MY_CLASS_ID, date, records);
    setMarks({}); day.reload();
    alert(`Saved attendance for ${date} (${res.saved} students).`);
  };

  return (
    <>
      <PageHead title={`Attendance — ${MY_CLASS}`} sub="Pick a date, tap to toggle, Save (stored for the year)"
        right={<span className="pill">{present} present · {rows.length - present} absent</span>} />
      <Card title={
        <>
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
  const exams = useApi(() => api.getExams(), []);
  const subs = useApi(() => api.getSubjects(), []);
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
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
    const r = await api.saveMarks(examId, subjectId, marks);
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
            {classes.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}
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
  const tt   = useApi(() => api.getTimetableDB(MY_CLASS_ID), []);
  const subs = useApi(() => api.getSubjects(), []);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(null);

  const schedule = (editing ? draft : tt.data) || [];
  const allSubs  = (subs.data || []).map((s) => s.name);
  const PERIODS  = ["P1","P2","P3","P4","P5","P6"];

  const startEdit = () => { setDraft(JSON.parse(JSON.stringify(tt.data || []))); setEditing(true); };
  const cancelEdit = () => { setDraft(null); setEditing(false); };
  const setCell = (di, pi, val) =>
    setDraft(draft.map((row, i) => i !== di ? row : { ...row, subjects: row.subjects.map((s, j) => j !== pi ? s : val) }));
  const save = async () => {
    await api.saveTimetable(MY_CLASS_ID, draft);
    setEditing(false); setDraft(null); tt.reload();
    alert("Timetable saved.");
  };

  return (
    <>
      <PageHead
        title={`Timetable — ${MY_CLASS}`}
        sub="Weekly class schedule — editable"
        right={
          editing ? (
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn ghost sm" onClick={cancelEdit}>Cancel</button>
              <button className="btn sm" onClick={save}>Save changes</button>
            </div>
          ) : (
            <button className="btn sm" onClick={startEdit}>✏️ Edit timetable</button>
          )
        }
      />
      <Card>
        <Loading state={tt}>
          <div className="ttg">
            <div className="h">Day</div>
            {PERIODS.map((p) => <div className="h" key={p}>{p}</div>)}
            {schedule.map((row, di) => (
              <Fragment key={row.day}>
                <div className="dd">{row.day}</div>
                {(row.subjects || []).map((sub, pi) => (
                  <div className="c" key={pi}>
                    {editing ? (
                      <select
                        value={sub}
                        onChange={(e) => setCell(di, pi, e.target.value)}
                        style={{ background:"var(--panel2)", border:"1px solid var(--line)", color:"var(--txt)", borderRadius:6, padding:"4px 5px", fontSize:11, width:"100%" }}
                      >
                        {allSubs.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <b style={{ color: sc(sub), fontSize:12 }}>{sub}</b>
                    )}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
          {editing && <div className="mini" style={{ marginTop:10 }}>Select subjects from dropdowns, then Save changes.</div>}
        </Loading>
      </Card>
    </>
  );
}

// ─── Student Report (sub-component for Reports screen) ───────────────────────
function StudentReport({ studentId, onBack }) {
  const student    = useApi(() => api.getStudent(studentId), [studentId]);
  const attendance = useApi(() => api.getStudentAttendance(studentId), [studentId]);
  const allMarks   = useApi(() => api.getStudentMarksAll(studentId), [studentId]);

  const s        = student.data;
  const attRows  = attendance.data || [];
  const totalDays   = attRows.length;
  const presentDays = attRows.filter((r) => r.status === "present").length;
  const absentDays  = totalDays - presentDays;
  const attPct      = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;
  const examData    = allMarks.data || [];
  const initials    = s ? s.name.split(" ").map((w) => w[0]).join("").slice(0, 2) : "??";

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
              {/* Header card */}
              <Card style={{ marginBottom:16 }}>
                <div style={{ display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,var(--accent),#34d1bf)", color:"#fff", fontWeight:800, fontSize:22, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {initials}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:20, fontWeight:800 }}>{s.name}</div>
                    <div className="mini" style={{ marginTop:3 }}>
                      Class {s.class_name} · Roll {s.roll_no} · {s.gender || "—"} · Blood {s.blood_group || "—"}
                    </div>
                    <div className="mini" style={{ marginTop:2 }}>
                      Guardian: {s.guardian_name || "—"} ({s.guardian_relation || "—"}) · {s.guardian_phone || "—"}
                    </div>
                    {s.notes && (
                      <div style={{ marginTop:8, fontSize:12, background:"rgba(255,180,84,0.1)", border:"1px solid rgba(255,180,84,0.3)", borderRadius:8, padding:"6px 12px" }}>
                        📝 Remarks: {s.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:28, fontWeight:800, color: attPct >= 85 ? "var(--good)" : attPct >= 75 ? "var(--warn)" : "var(--bad)" }}>
                      {attPct}%
                    </div>
                    <div className="mini">attendance</div>
                    <div className="mini" style={{ marginTop:4 }}>{presentDays}P · {absentDays}A · {totalDays} days</div>
                  </div>
                </div>
              </Card>

              {/* Attendance calendar */}
              <Card title="📅 Attendance Record" style={{ marginBottom:16 }}>
                <Loading state={attendance}>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", padding:"4px 0" }}>
                    {attRows.map((r) => {
                      const day = new Date(r.date).getDate();
                      const p   = r.status === "present";
                      return (
                        <div key={r.date} title={r.date} style={{
                          width:34, height:34, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:11, fontWeight:600,
                          background: p ? "rgba(74,222,128,0.15)" : "rgba(255,92,124,0.15)",
                          color: p ? "var(--good)" : "var(--bad)",
                          border: `1px solid ${p ? "rgba(74,222,128,0.35)" : "rgba(255,92,124,0.35)"}`,
                        }}>
                          {day}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex", gap:14, marginTop:10, fontSize:12 }}>
                    <span style={{ color:"var(--good)" }}>● Present: {presentDays}</span>
                    <span style={{ color:"var(--bad)" }}>● Absent: {absentDays}</span>
                    <span style={{ color:"var(--muted)" }}>Total: {totalDays} days</span>
                  </div>
                </Loading>
              </Card>

              {/* Marks per exam */}
              <Card title="📊 Exam Results" style={{ marginBottom:16 }}>
                <Loading state={allMarks}>
                  {examData.length === 0 ? (
                    <div className="mini">No exam results yet.</div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                      {examData.map((exam) => {
                        const valid = exam.marks.filter((m) => m.mark != null);
                        const avg   = valid.length ? Math.round(valid.reduce((a, m) => a + m.mark, 0) / valid.length) : null;
                        const grade = avg != null ? config.academics.grade(avg) : "—";
                        return (
                          <div key={exam.examId}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                              <b style={{ fontSize:13 }}>{exam.examName}</b>
                              {avg != null && (
                                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                                  <span className="mini">Avg: {avg}%</span>
                                  <span className={`badge ${avg >= 80 ? "b-good" : avg >= 35 ? "b-warn" : "b-bad"}`}>{grade}</span>
                                </div>
                              )}
                            </div>
                            {exam.marks.map((m) => {
                              const val   = m.mark != null ? m.mark : 0;
                              const color = val >= 80 ? "#4ade80" : val >= 60 ? "#34d1bf" : val >= 35 ? "#ffb454" : "#ff5c7c";
                              return (
                                <div key={m.subject} className="subline">
                                  <div className="s-nm" style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ width:8, height:8, borderRadius:2, background:sc(m.subject), display:"inline-block" }} />
                                    {m.subject}
                                  </div>
                                  <div className="bar" style={{ flex:1 }}>
                                    <i style={{ width:(m.mark != null ? m.mark : 0) + "%", background:color }} />
                                  </div>
                                  <div className="s-mk" style={{ color }}>
                                    {m.mark != null ? m.mark : "—"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Loading>
              </Card>

              {/* Fee summary */}
              {s.fees && (
                <Card title="💳 Fee Status">
                  <div style={{ display:"flex", gap:24, alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:22, fontWeight:800, color: s.fees.pending > 0 ? "var(--bad)" : "var(--good)" }}>
                        ₹{s.fees.paid.toLocaleString("en-IN")}
                      </div>
                      <div className="mini">paid of ₹{s.fees.total.toLocaleString("en-IN")}</div>
                    </div>
                    {s.fees.pending > 0
                      ? <span className="badge b-bad">₹{s.fees.pending.toLocaleString("en-IN")} pending</span>
                      : <span className="badge b-good">Fully paid</span>}
                  </div>
                </Card>
              )}
            </>
          )}
        </Loading>
      </div>

      <style>{`
        @media print {
          .no-print, .left-nav, .top-bar, .layout-shell > *:not(#student-report) { display: none !important; }
          #student-report { padding: 24px; }
          body, .layout-shell { background: white !important; color: #111 !important; }
        }
      `}</style>
    </>
  );
}

// ─── Reports ─────────────────────────────────────────────────────────────────
function Reports() {
  const list = useApi(() => api.listStudents(MY_CLASS), []);
  const [selectedId, setSelectedId] = useState(null);

  if (selectedId) {
    return <StudentReport studentId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <>
      <PageHead title="Student Reports" sub="Select a student to view full profile and download PDF" />
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
