// SCHOOL ADMIN role screens — office staff managing fees, enrollment.
import React, { useState, Fragment } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { useApp } from "../context.js";
import { Card, Stat, PageHead, Tabs, FeeBadge, Loading, Donut } from "../components/ui.jsx";
import StudentForm from "../components/StudentForm.jsx";
import StudentProfile from "../components/StudentProfile.jsx";

const { classes } = config.academics;

// ─── helpers ─────────────────────────────────────────────────────────────────
function getLocalDateLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard() {
  // Use class 8-A as demo fee data (seeded)
  const list = useApi(() => api.listStudents("8-A"), []);
  const students = list.data || [];

  const paid     = students.filter((s) => s.fee === "Paid").length;
  const partial  = students.filter((s) => s.fee === "Partial").length;
  const pending  = students.filter((s) => s.fee === "Pending").length;
  const total    = students.length;
  const collectPct = total ? Math.round((paid / total) * 100) : 0;

  const feeBands = [
    { label: "Paid",    value: paid,    color: "#4ade80" },
    { label: "Partial", value: partial, color: "#ffb454" },
    { label: "Pending", value: pending, color: "#ff5c7c" },
  ];

  // Students needing follow-up (Pending or Partial)
  const followUp = students.filter((s) => s.fee !== "Paid");

  return (
    <>
      {/* ── Banner ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255,92,124,0.10) 0%, rgba(255,180,84,0.08) 100%)",
        border: "1px solid rgba(255,92,124,0.25)",
        borderRadius: 16, padding: "16px 22px", marginBottom: 18,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>{getLocalDateLabel()}</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>🏢 {config.school.name} — Admin Office</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            AY {config.school.academicYear} · Fee management & enrollment
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {pending > 0 ? (
            <>
              <span className="badge b-bad">⚠ {pending} fee{pending > 1 ? "s" : ""} pending</span>
              <div className="mini" style={{ marginTop: 4, color: "var(--warn)" }}>
                {partial > 0 ? `+ ${partial} partial` : ""}
              </div>
            </>
          ) : (
            <span className="badge b-good">✓ All fees collected (class 8-A)</span>
          )}
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat label="Students" value={total} delta="class 8-A" />
        <Stat label="Fully Paid" value={paid} delta="students" dir="up" />
        <Stat label="Pending / Partial" value={pending + partial} delta="needs follow-up" dir={(pending + partial) > 0 ? "down" : "up"} />
        <Stat label="Collection Rate" value={collectPct + "%"} delta="class 8-A" dir={collectPct >= 80 ? "up" : "down"} />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <Card title="Fee Collection Status — Class 8-A">
          <Loading state={list}>
            <Donut segments={feeBands} centerLabel={paid} centerSub="paid" />
          </Loading>
        </Card>

        {/* Fee status bars by percentage */}
        <Card title="Collection Breakdown">
          <Loading state={list}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" }}>
              {feeBands.map((b) => (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color }} />
                      {b.label}
                    </span>
                    <b style={{ color: b.color }}>{b.value} students</b>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "var(--panel2)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: total ? `${(b.value / total) * 100}%` : "0%", background: b.color, borderRadius: 4, transition: "width .4s" }} />
                  </div>
                </div>
              ))}
            </div>
          </Loading>
        </Card>
      </div>

      {/* ── Fee follow-up list ───────────────────────────────────────────── */}
      {followUp.length > 0 && (
        <Card title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            📞 Follow-up Required
            <span className="mini" style={{ fontWeight: 400 }}>{followUp.length} student{followUp.length > 1 ? "s" : ""}</span>
          </span>
        }>
          <Loading state={list}>
            <table>
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student</th>
                  <th>Guardian</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {followUp.map((s) => (
                  <tr key={s.id}>
                    <td>{s.roll}</td>
                    <td><b>{s.name}</b></td>
                    <td>{s.guardian || "—"}</td>
                    <td className="mini">{s.phone || "—"}</td>
                    <td><FeeBadge status={s.fee} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Loading>
        </Card>
      )}
    </>
  );
}

// ─── Fees ─────────────────────────────────────────────────────────────────────
function Fees() {
  const [cls, setCls]     = useState("8-A");
  const [selectedId, setSelectedId] = useState(null);
  const list = useApi(() => api.listStudents(cls), [cls]);
  const students = list.data || [];

  const paid    = students.filter((s) => s.fee === "Paid").length;
  const pending = students.filter((s) => s.fee !== "Paid").length;

  return (
    <>
      <PageHead
        title="Fee Management"
        sub="Track and collect student fee payments · class-wise"
        right={<span className="pill">{paid} paid · {pending} pending</span>}
      />
      <Tabs items={classes.map((c) => ({ id: c, name: c }))} value={cls} onChange={(c) => { setCls(c); setSelectedId(null); }} />

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Stat label="Students"   value={students.length} delta={cls} />
        <Stat label="Paid"       value={paid}    delta="fully paid" dir="up" />
        <Stat label="Pending"    value={students.filter((s) => s.fee === "Pending").length}  delta="not paid" dir="down" />
        <Stat label="Partial"    value={students.filter((s) => s.fee === "Partial").length}  delta="partial" dir="down" />
      </div>

      <Card>
        <Loading state={list}>
          {students.length === 0 ? (
            <div className="mini">No students in this class.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student</th>
                  <th>Guardian</th>
                  <th>Phone</th>
                  <th>Fee Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.roll}</td>
                    <td><b>{s.name}</b></td>
                    <td>{s.guardian || "—"}</td>
                    <td className="mini">{s.phone || "—"}</td>
                    <td><FeeBadge status={s.fee} /></td>
                    <td>
                      <span
                        className="mini link"
                        onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                      >
                        {selectedId === s.id ? "Close ▲" : "Details ▼"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Loading>
      </Card>

      {selectedId && <FeeDetail studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  );
}

// Inline fee detail + payment recording
function FeeDetail({ studentId, onClose }) {
  const fees   = useApi(() => api.getFees(studentId), [studentId]);
  const f      = fees.data || { total: 0, paid: 0, terms: [] };
  const due    = f.total - f.paid;
  const [paying, setPaying] = useState(null);
  const [amount, setAmount] = useState("");

  const recordPayment = async (feeId) => {
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) { alert("Enter a valid amount"); return; }
    await api.recordFeePayment(feeId, amt);
    setAmount(""); setPaying(null); fees.reload();
    alert(`Payment of ₹${amt} recorded.`);
  };

  return (
    <Card title={
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        💳 Fee Details
        <button className="btn sm ghost" onClick={onClose} style={{ marginLeft: "auto" }}>Close</button>
      </span>
    }>
      <Loading state={fees}>
        <div className="grid g3" style={{ marginBottom: 14 }}>
          <Stat label="Total" value={config.app.currency + Number(f.total).toLocaleString("en-IN")} delta="for year" />
          <Stat label="Paid"  value={config.app.currency + Number(f.paid).toLocaleString("en-IN")}  delta="received" dir="up" />
          <Stat label="Due"   value={config.app.currency + Number(due).toLocaleString("en-IN")}      delta="pending"  dir={due > 0 ? "down" : "up"} />
        </div>
        <table>
          <thead>
            <tr><th>Item</th><th>Amount</th><th>Paid</th><th>Status</th><th>Due date</th><th></th></tr>
          </thead>
          <tbody>
            {f.terms.map((t, i) => {
              const st = Number(t.paid) >= Number(t.due) ? "Paid" : Number(t.paid) > 0 ? "Partial" : "Pending";
              return (
                <Fragment key={i}>
                  <tr>
                    <td>{t.term}</td>
                    <td>{config.app.currency}{Number(t.due).toLocaleString("en-IN")}</td>
                    <td>{config.app.currency}{Number(t.paid).toLocaleString("en-IN")}</td>
                    <td><FeeBadge status={st} /></td>
                    <td className="mini">{t.date}</td>
                    <td>
                      {st !== "Paid" && (
                        <button className="btn sm" onClick={() => setPaying(paying === t.id ? null : t.id)}>
                          Collect
                        </button>
                      )}
                    </td>
                  </tr>
                  {paying === t.id && (
                    <tr>
                      <td colSpan={6}>
                        <div style={{ display: "flex", gap: 8, padding: "8px 0", alignItems: "center" }}>
                          <span className="mini">Amount: </span>
                          <input
                            type="number" min="1"
                            value={amount} onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            style={{ width: 140, background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--txt)", borderRadius: 7, padding: "6px 9px" }}
                          />
                          <button className="btn sm" onClick={() => recordPayment(t.id)}>Record</button>
                          <button className="btn sm ghost" onClick={() => setPaying(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </Loading>
    </Card>
  );
}

// ─── Students ─────────────────────────────────────────────────────────────────
function Students() {
  const [cls, setCls]     = useState("8-A");
  const list = useApi(() => api.listStudents(cls), [cls]);
  const [form, setForm]   = useState(null);
  const [profileId, setProfileId] = useState(null);
  const done = () => { setForm(null); list.reload(); };

  return (
    <>
      <PageHead
        title="Student Records"
        sub="Enrollment management · all classes"
        right={<button className="btn" onClick={() => setForm({ student: null })}>＋ Enroll student</button>}
      />
      <Tabs items={classes.map((c) => ({ id: c, name: c }))} value={cls} onChange={setCls} />
      <Card title={<>Class {cls} — {(list.data || []).length} students</>}>
        <Loading state={list}>
          <table>
            <thead><tr><th>Roll</th><th>Name</th><th>Attendance</th><th>Guardian</th><th>Phone</th><th>Fee</th><th></th></tr></thead>
            <tbody>
              {(list.data || []).map((s) => (
                <tr key={s.id}>
                  <td>{s.roll}</td>
                  <td><b style={{ cursor: "pointer" }} onClick={() => setProfileId(s.id)}>{s.name}</b></td>
                  <td><span className={`badge ${Number(s.att) >= 85 ? "b-good" : Number(s.att) >= 75 ? "b-warn" : "b-bad"}`}>{s.att}%</span></td>
                  <td>{s.guardian}</td>
                  <td className="mini">{s.phone}</td>
                  <td><FeeBadge status={s.fee} /></td>
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

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports() {
  const exams = useApi(() => api.getExams(), []);
  const list  = useApi(() => api.listStudents("8-A"), []);
  const students = list.data || [];

  const paid    = students.filter((s) => s.fee === "Paid").length;
  const partial = students.filter((s) => s.fee === "Partial").length;
  const pending = students.filter((s) => s.fee === "Pending").length;
  const total   = students.length;

  return (
    <>
      <PageHead title="Reports" sub="Fee and enrollment summary" />
      <div className="grid g2">
        <Card title="📊 Fee Summary — Class 8-A">
          <Loading state={list}>
            <table>
              <tbody>
                <tr><td>Total students</td><td><b>{total}</b></td></tr>
                <tr><td>Fully paid</td><td><b style={{ color: "#4ade80" }}>{paid}</b></td></tr>
                <tr><td>Partial</td><td><b style={{ color: "#ffb454" }}>{partial}</b></td></tr>
                <tr><td>Pending</td><td><b style={{ color: "#ff5c7c" }}>{pending}</b></td></tr>
                <tr><td>Collection rate</td><td><b>{total ? Math.round((paid / total) * 100) : 0}%</b></td></tr>
              </tbody>
            </table>
          </Loading>
        </Card>
        <Card title="📋 Exams on Record">
          <Loading state={exams}>
            {(exams.data || []).length === 0 ? (
              <div className="mini">No exams created yet.</div>
            ) : (
              <table>
                <thead><tr><th>Exam</th><th>Status</th></tr></thead>
                <tbody>
                  {(exams.data || []).map((e) => (
                    <tr key={e.id}>
                      <td><b>{e.name}</b></td>
                      <td><span className={`badge ${e.status === "locked" ? "b-good" : "b-warn"}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Loading>
        </Card>
      </div>
    </>
  );
}

// ─── Link Users ───────────────────────────────────────────────────────────────
// Admin assigns a Cognito login email to a student or teacher record.
// This is how "Shankar" gets linked to Class 8-A student Aarav, etc.
function LinkUsers() {
  const { reloadMe } = useApp();
  const [cls, setCls] = useState(classes[0]);

  // All students in selected class
  const list = useApi(() => api.listStudents(cls), [cls]);
  const students = list.data || [];

  // Per-student link form state
  const [emailMap, setEmailMap]   = useState({});   // studentId -> typed email
  const [statusMap, setStatusMap] = useState({});   // studentId -> 'ok'|'err'|'busy'

  // Teacher link form
  const [teacherCls, setTeacherCls]     = useState(classes[0]);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherStatus, setTeacherStatus] = useState("");

  const setEmail = (id, val) => setEmailMap((m) => ({ ...m, [id]: val }));

  const linkStudent = async (studentId) => {
    const email = (emailMap[studentId] || "").trim();
    if (!email) return;
    setStatusMap((m) => ({ ...m, [studentId]: "busy" }));
    try {
      await api.linkUserToStudent(email, studentId);
      setStatusMap((m) => ({ ...m, [studentId]: "ok" }));
      setEmailMap((m) => ({ ...m, [studentId]: "" }));
      list.reload();
      reloadMe();
    } catch {
      setStatusMap((m) => ({ ...m, [studentId]: "err" }));
    }
  };

  const unlinkStudent = async (studentId) => {
    if (!confirm("Remove the login link for this student?")) return;
    await api.unlinkStudent(studentId);
    list.reload();
  };

  const linkTeacher = async () => {
    const email = teacherEmail.trim();
    if (!email || !teacherCls) return;
    setTeacherStatus("busy");
    try {
      const classId = classes.indexOf(teacherCls) + 1;
      await api.linkUserToTeacher(email, classId);
      setTeacherStatus("ok");
      setTeacherEmail("");
    } catch {
      setTeacherStatus("err");
    }
  };

  const inputStyle = {
    background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--txt)",
    borderRadius: 7, padding: "6px 10px", fontSize: 12, width: 220,
  };

  return (
    <>
      <PageHead
        title="Link User Accounts"
        sub="Assign a Cognito login email to each student or teacher record"
      />

      {/* ── HOW IT WORKS banner ─────────────────────────────────────────── */}
      <div style={{
        background: "rgba(124,92,255,0.08)", border: "1px solid rgba(124,92,255,0.25)",
        borderRadius: 12, padding: "14px 18px", marginBottom: 18, fontSize: 13,
      }}>
        <b>How it works:</b> When a user signs in via Cognito, they need to be linked to a DB record so the app can show their data.
        Enter the user's <b>Cognito email</b> next to the matching student record and click <b>Link</b>.
        After linking, that user's login will show their own attendance, marks, and fees automatically.
      </div>

      {/* ── Teacher section ─────────────────────────────────────────────── */}
      <Card title="🧑‍🏫 Link Teacher to Class">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "4px 0" }}>
          <span className="mini">Class:</span>
          <select
            value={teacherCls}
            onChange={(e) => setTeacherCls(e.target.value)}
            style={{ ...inputStyle, width: 100 }}
          >
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="mini">Cognito email:</span>
          <input
            type="email"
            value={teacherEmail}
            onChange={(e) => setTeacherEmail(e.target.value)}
            placeholder="teacher@example.com"
            style={inputStyle}
          />
          <button
            className="btn sm"
            onClick={linkTeacher}
            disabled={teacherStatus === "busy"}
          >
            {teacherStatus === "busy" ? "Linking…" : "Link Teacher"}
          </button>
          {teacherStatus === "ok" && <span className="badge b-good">✓ Linked</span>}
          {teacherStatus === "err" && <span className="badge b-bad">✗ Failed</span>}
        </div>
        <div className="mini" style={{ marginTop: 8, color: "var(--muted)" }}>
          This sets the class_teacher_id for the selected class. The teacher's dashboard will show that class automatically.
        </div>
      </Card>

      {/* ── Student section ─────────────────────────────────────────────── */}
      <Card
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            👥 Link Students
            <Tabs
              items={classes.map((c) => ({ id: c, name: c }))}
              value={cls}
              onChange={(c) => { setCls(c); setEmailMap({}); setStatusMap({}); }}
            />
          </span>
        }
        style={{ marginTop: 18 }}
      >
        <Loading state={list}>
          {students.length === 0 ? (
            <div className="mini">No students in this class.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student Name</th>
                  <th>Linked Account</th>
                  <th>Cognito Email to Link</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.roll}</td>
                    <td><b>{s.name}</b></td>
                    <td>
                      {s.user_email ? (
                        <span className="badge b-good" style={{ fontSize: 11 }}>✓ {s.user_email}</span>
                      ) : (
                        <span className="badge" style={{ background: "var(--panel2)", fontSize: 11 }}>Not linked</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="email"
                        value={emailMap[s.id] || ""}
                        onChange={(e) => setEmail(s.id, e.target.value)}
                        placeholder="user@school.com"
                        style={inputStyle}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn sm"
                        onClick={() => linkStudent(s.id)}
                        disabled={statusMap[s.id] === "busy" || !emailMap[s.id]}
                      >
                        {statusMap[s.id] === "busy" ? "…" : "Link"}
                      </button>
                      {statusMap[s.id] === "ok" && <span className="badge b-good" style={{ marginLeft: 6 }}>✓</span>}
                      {statusMap[s.id] === "err" && <span className="badge b-bad" style={{ marginLeft: 6 }}>✗</span>}
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

// ─── Teachers ─────────────────────────────────────────────────────────────────
function Teachers() {
  const list    = useApi(() => api.getTeachers(), []);
  const teachers = list.data || [];

  const [editing, setEditing] = useState(null); // user id being edited
  const [form,    setForm]    = useState({ name: "", phone: "" });
  const [saving,  setSaving]  = useState(false);

  const startEdit = (t) => {
    setEditing(t.id);
    setForm({ name: t.name || "", phone: t.phone || "" });
  };
  const save = async () => {
    setSaving(true);
    try { await api.updateUser(editing, form); } catch (_) {}
    setSaving(false);
    setEditing(null);
    list.reload();
  };

  return (
    <>
      <PageHead title="Teachers" sub={`${teachers.length} teachers · ${config.school.name}`} />
      <Card>
        <Loading state={list}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Class</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  {editing === t.id ? (
                    <>
                      <td>
                        <input
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          style={{ width: "100%", background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px" }}
                        />
                      </td>
                      <td className="mini">{t.class_name || "—"}</td>
                      <td className="mini">{t.email}</td>
                      <td>
                        <input
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="Phone"
                          style={{ width: "100%", background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px" }}
                        />
                      </td>
                      <td><span className={`badge ${t.status === "active" ? "b-good" : "b-bad"}`}>{t.status}</span></td>
                      <td style={{ display: "flex", gap: 4 }}>
                        <button className="btn" style={{ fontSize: 12, padding: "3px 10px" }} onClick={save} disabled={saving}>
                          {saving ? "…" : "Save"}
                        </button>
                        <button className="btn" style={{ fontSize: 12, padding: "3px 8px", background: "var(--line)", color: "var(--muted)" }} onClick={() => setEditing(null)}>
                          ✕
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td>{t.class_name ? <span className="badge" style={{ background: "rgba(124,92,255,0.15)", color: "var(--primary)" }}>Class {t.class_name}</span> : <span className="mini">—</span>}</td>
                      <td className="mini">{t.email}</td>
                      <td className="mini">{t.phone || <span style={{ opacity: 0.4 }}>—</span>}</td>
                      <td><span className={`badge ${t.status === "active" ? "b-good" : "b-bad"}`}>{t.status}</span></td>
                      <td>
                        <button className="btn" style={{ fontSize: 12, padding: "3px 10px" }} onClick={() => startEdit(t)}>
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Loading>
      </Card>
    </>
  );
}

export const schoolAdminNav = [
  { key: "dashboard", label: "Dashboard",   icon: "🏠", Component: Dashboard  },
  { key: "fees",      label: "Fees",         icon: "💰", Component: Fees       },
  { key: "students",  label: "Students",     icon: "👥", Component: Students   },
  { key: "teachers",  label: "Teachers",     icon: "🧑‍🏫", Component: Teachers  },
  { key: "reports",   label: "Reports",      icon: "📋", Component: Reports    },
  { key: "linkusers", label: "Link Users",   icon: "🔗", Component: LinkUsers  },
];
