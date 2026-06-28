// TEACHER role screens — live data from the API.
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Tabs, Message, Loading } from "../components/ui.jsx";
import StudentForm from "../components/StudentForm.jsx";
import StudentProfile from "../components/StudentProfile.jsx";

const { classes } = config.academics;
const MY_CLASS = "8-A";

// Read-only overview (no editing here).
function Dashboard() {
  const list = useApi(() => api.listStudents(MY_CLASS), []);
  const exams = useApi(() => api.getExams(), []);
  const msgs = useApi(() => api.getMessages(), []);
  const students = list.data || [];
  const strength = students.length;
  const avgAtt = strength ? Math.round(students.reduce((a, s) => a + Number(s.att), 0) / strength) : 0;
  const low = students.filter((s) => Number(s.att) < 75).length;
  const pending = students.filter((s) => s.fee !== "Paid").length;
  const openExam = (exams.data || []).find((e) => e.status === "open");
  const notes = ((msgs.data && msgs.data.studentFeed) || []).filter((m) => m.role === "teacher");
  return (
    <>
      <PageHead title={`My Class — ${MY_CLASS}`} sub="Overview" right={<span className="pill">🟢 Tue, 23 Jun 2026</span>} />
      <div className="grid g4">
        <Stat label="Class strength" value={strength} delta={MY_CLASS} />
        <Stat label="Avg attendance" value={avgAtt + "%"} delta="term" dir={avgAtt >= 85 ? "up" : "down"} />
        <Stat label="Below 75%" value={low} delta="need follow-up" dir={low ? "down" : "up"} />
        <Stat label="Fees pending" value={pending} delta="students" dir={pending ? "down" : "up"} />
      </div>
      <div className="grid g2" style={{ marginTop: 15 }}>
        <Card title="At a glance">
          <div className="subline"><div style={{ flex: 1 }} className="mini">Active exam</div><b>{openExam ? openExam.name : "—"}</b></div>
          <div className="subline"><div style={{ flex: 1 }} className="mini">Total students</div><b>{strength}</b></div>
          <div className="subline"><div style={{ flex: 1 }} className="mini">Low-attendance students</div><b>{low}</b></div>
          <div className="subline"><div style={{ flex: 1 }} className="mini">Fees pending</div><b>{pending}</b></div>
          <div className="mini" style={{ marginTop: 8 }}>Take attendance and enter marks from the left menu.</div>
        </Card>
        <Card title="Recent notes to parents">
          <Loading state={msgs}>
            {notes.length ? notes.slice(0, 4).map((m, i) => <Message m={m} key={i} />) : <div className="mini">No notes yet.</div>}
          </Loading>
        </Card>
      </div>
      <Card title="Students who need attention" className="" >
        <Loading state={list}>
          {students.filter((s) => Number(s.att) < 75 || s.fee !== "Paid").length === 0
            ? <div className="mini">All students on track. 🎉</div>
            : (
              <table>
                <thead><tr><th>Roll</th><th>Name</th><th>Attendance</th><th>Fees</th></tr></thead>
                <tbody>
                  {students.filter((s) => Number(s.att) < 75 || s.fee !== "Paid").map((s) => (
                    <tr key={s.id}><td>{s.roll}</td><td><b>{s.name}</b></td>
                      <td style={{ color: Number(s.att) < 75 ? "var(--bad)" : undefined }}>{s.att}%</td>
                      <td><span className={`badge ${s.fee === "Paid" ? "b-good" : s.fee === "Partial" ? "b-warn" : "b-bad"}`}>{s.fee}</span></td>
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

// Attendance taking — moved to its own menu item.
function AttendanceEntry() {
  const list = useApi(() => api.listStudents(MY_CLASS), []);
  const students = list.data || [];
  const [present, setPresent] = useState({});
  const initial = Object.keys(present).length === 0 && students.length
    ? Object.fromEntries(students.map((s) => [s.roll, Number(s.att) >= 70])) : present;
  const toggle = (roll) => setPresent({ ...initial, [roll]: !initial[roll] });
  const count = Object.values(initial).filter(Boolean).length;
  return (
    <>
      <PageHead title={`Attendance — ${MY_CLASS}`} sub="Tap a card to toggle present / absent"
        right={<span className="pill">{count} present · {students.length - count} absent</span>} />
      <Card title={<>Today <button className="btn sm" onClick={() => alert("Attendance saved (POC)")}>Save</button></>}>
        <Loading state={list}>
          <div className="grid g4" style={{ gap: 9 }}>
            {students.map((s) => {
              const p = initial[s.roll];
              return (
                <div className="att-cell" key={s.roll} onClick={() => toggle(s.roll)}>
                  <div><div className="nm">{s.name}</div><div className="rn">Roll {s.roll}</div></div>
                  <div className={`pres ${p ? "p-yes" : "p-no"}`}>{p ? "P" : "A"}</div>
                </div>
              );
            })}
          </div>
        </Loading>
      </Card>
    </>
  );
}

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
            <thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Attendance</th><th>Guardian</th><th>Phone</th><th></th></tr></thead>
            <tbody>
              {(list.data || []).map((s) => (
                <tr key={s.id}>
                  <td>{s.roll}</td>
                  <td><b style={{ cursor: "pointer" }} onClick={() => setProfileId(s.id)}>{s.name}</b></td>
                  <td>{s.cls}</td><td>{s.att}%</td><td>{s.guardian}</td><td className="mini">{s.phone}</td>
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

export const teacherNav = [
  { key: "dashboard", label: "My Class",        icon: "🏠", Component: Dashboard },
  { key: "attendance", label: "Attendance",     icon: "🗓️", Component: AttendanceEntry },
  { key: "students", label: "Students",         icon: "🎓", Component: Students },
  { key: "results", label: "Exam Results",      icon: "📊", Component: Results },
  { key: "notes", label: "Notes to Parent",     icon: "📝", Component: Notes },
  { key: "messages", label: "Messages",         icon: "💬", Component: Messages },
];
