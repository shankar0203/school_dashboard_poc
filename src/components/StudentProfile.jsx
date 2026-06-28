// Read-only student profile modal — full details + attendance% + fees.
// Props: id, onClose(), onEdit(studentObject)
import React from "react";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { Loading, money } from "./ui.jsx";

const d = (v) => (v ? String(v).slice(0, 10) : "—");
const Row = ({ label, value }) => (
  <div className="prow"><span className="plabel">{label}</span><span className="pval">{value || "—"}</span></div>
);

export default function StudentProfile({ id, onClose, onEdit }) {
  const st = useApi(() => api.getStudent(id), [id]);
  const fees = useApi(() => api.getFees(id), [id]);
  const s = st.data;

  const recordPay = async (fee) => {
    const amt = prompt(`Record payment for "${fee.term}" (due ${fee.due}, paid ${fee.paid}). Amount:`);
    if (!amt) return;
    await api.recordFeePayment(fee.id, Number(amt));
    fees.reload();
  };
  const addFee = async () => {
    const item = prompt("Fee item (e.g. Term 2 — Tuition):");
    if (!item) return;
    const due = prompt("Amount due:");
    if (!due) return;
    await api.addFee(id, item, Number(due), null);
    fees.reload();
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>Student profile</b>
          <span className="modal-x" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <Loading state={st}>
            {s && (
              <>
                <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
                  <div className="avatar" style={{ width: 52, height: 52, fontSize: 20, background: "var(--pri)" }}>{s.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{s.name}</div>
                    <div className="mini">{s.class_name} · Roll {s.roll_no} · {s.admission_no || "no adm. no"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--good)" }}>{s.attendance_pct}%</div>
                    <div className="mini">attendance</div>
                  </div>
                </div>

                <div className="fld-grid">
                  <Row label="Gender" value={s.gender} />
                  <Row label="Date of birth" value={d(s.dob)} />
                  <Row label="Blood group" value={s.blood_group} />
                  <Row label="Admission date" value={d(s.admission_date)} />
                  <Row label="Student phone" value={s.student_phone} />
                  <Row label="Student email" value={s.student_email} />
                  <Row label="Guardian" value={s.guardian_name} />
                  <Row label="Relation" value={s.guardian_relation} />
                  <Row label="Guardian phone" value={s.guardian_phone} />
                  <Row label="Guardian email" value={s.guardian_email} />
                  <Row label="Address" value={s.address} />
                  <Row label="Fees" value={s.fees ? `${money(s.fees.paid)} paid · ${money(s.fees.pending)} pending` : "—"} />
                </div>
                {s.notes && <div className="notice" style={{ marginTop: 14 }}>📝 {s.notes}</div>}

                <div className="ct" style={{ marginTop: 18 }}>
                  Fees
                  <button className="btn ghost sm" onClick={addFee}>＋ Add fee</button>
                </div>
                <Loading state={fees}>
                  <table>
                    <thead><tr><th>Item</th><th>Due</th><th>Paid</th><th>Balance</th><th></th></tr></thead>
                    <tbody>
                      {((fees.data && fees.data.terms) || []).map((t) => {
                        const bal = Number(t.due) - Number(t.paid);
                        return (
                          <tr key={t.id}>
                            <td>{t.term}</td><td>{money(t.due)}</td><td>{money(t.paid)}</td>
                            <td style={{ color: bal > 0 ? "var(--bad)" : "var(--good)" }}>{money(bal)}</td>
                            <td>{bal > 0 && <span className="link mini" onClick={() => recordPay(t)}>Record payment</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Loading>
              </>
            )}
          </Loading>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Close</button>
          {s && <button className="btn" onClick={() => onEdit(s)}>Edit</button>}
        </div>
      </div>
    </div>
  );
}
