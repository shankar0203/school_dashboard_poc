// Add/Edit student modal — full school detail fields.
// Props: student (null=add, object=edit), classes (list of names),
//        lockedClass (string|null = force a class, e.g. teacher's own),
//        onClose(), onSaved()
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";

const BLANK = {
  name: "", cls: "", roll: "", admission_no: "", gender: "", dob: "",
  blood_group: "", student_phone: "", student_email: "", address: "",
  guardian_name: "", guardian_relation: "", guardian_phone: "", guardian_email: "",
  admission_date: "", notes: "",
};

// dates from the API come as ISO strings; trim to yyyy-mm-dd for <input type=date>
const d = (v) => (v ? String(v).slice(0, 10) : "");

export default function StudentForm({ student, classes, lockedClass, onClose, onSaved }) {
  const editing = !!student;
  const [f, setF] = useState(
    editing
      ? {
          ...BLANK, ...student,
          cls: student.class_name || student.cls || lockedClass || "",
          roll: student.roll_no ?? student.roll ?? "",
          dob: d(student.dob), admission_date: d(student.admission_date),
        }
      : { ...BLANK, cls: lockedClass || (classes[0] || "") }
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.name.trim()) { setErr("Name is required"); return; }
    setBusy(true); setErr("");
    try {
      if (editing) await api.updateStudent(student.id, f);
      else await api.addStudent(f);
      onSaved();
    } catch (e) { setErr(e.message || "Save failed"); }
    finally { setBusy(false); }
  };

  const Field = ({ label, k, type = "text", full }) => (
    <label className={full ? "fld full" : "fld"}>
      <span>{label}</span>
      <input type={type} value={f[k]} onChange={set(k)} />
    </label>
  );

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{editing ? "Edit student" : "Add student"}</b>
          <span className="modal-x" onClick={onClose}>✕</span>
        </div>

        <div className="modal-body">
          <div className="fld-grid">
            <label className="fld"><span>Full name *</span><input value={f.name} onChange={set("name")} /></label>

            <label className="fld"><span>Class</span>
              {lockedClass ? (
                <input value={f.cls} disabled />
              ) : (
                <select value={f.cls} onChange={set("cls")}>
                  {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </label>

            <label className="fld"><span>Roll no</span><input value={f.roll} onChange={set("roll")} placeholder="auto if blank" /></label>
            <label className="fld"><span>Admission no</span><input value={f.admission_no} onChange={set("admission_no")} /></label>

            <label className="fld"><span>Gender</span>
              <select value={f.gender} onChange={set("gender")}>
                <option value="">—</option><option value="male">Male</option>
                <option value="female">Female</option><option value="other">Other</option>
              </select>
            </label>
            <label className="fld"><span>Date of birth</span><input type="date" value={f.dob} onChange={set("dob")} /></label>

            <label className="fld"><span>Blood group</span><input value={f.blood_group} onChange={set("blood_group")} placeholder="e.g. O+" /></label>
            <label className="fld"><span>Admission date</span><input type="date" value={f.admission_date} onChange={set("admission_date")} /></label>

            <label className="fld"><span>Student phone</span><input value={f.student_phone} onChange={set("student_phone")} /></label>
            <label className="fld"><span>Student email</span><input value={f.student_email} onChange={set("student_email")} /></label>

            <label className="fld full"><span>Address</span><input value={f.address} onChange={set("address")} /></label>

            <label className="fld"><span>Guardian name</span><input value={f.guardian_name} onChange={set("guardian_name")} /></label>
            <label className="fld"><span>Relation</span>
              <select value={f.guardian_relation} onChange={set("guardian_relation")}>
                <option value="">—</option><option>Father</option><option>Mother</option><option>Guardian</option>
              </select>
            </label>

            <label className="fld"><span>Guardian phone</span><input value={f.guardian_phone} onChange={set("guardian_phone")} /></label>
            <label className="fld"><span>Guardian email</span><input value={f.guardian_email} onChange={set("guardian_email")} /></label>

            <label className="fld full"><span>Notes (medical / general)</span><input value={f.notes} onChange={set("notes")} /></label>
          </div>
          {err && <div className="login-err">{err}</div>}
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : (editing ? "Save changes" : "Add student")}</button>
        </div>
      </div>
    </div>
  );
}
