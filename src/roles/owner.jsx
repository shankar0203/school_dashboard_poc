// OWNER role screens — Invisos product owner, cross-school platform view.
// Mixes live data from the current school with mock data for multi-school demo.
import React, { useState } from "react";
import config from "../config/appConfig.js";
import * as api from "../services/dataService.js";
import { useApi } from "../hooks/useApi.js";
import { Card, Stat, PageHead, Loading, Donut } from "../components/ui.jsx";

// ─── Mock multi-school platform data ─────────────────────────────────────────
// In production these come from a multi-tenant API. For the POC, mocked.
const PLATFORM_SCHOOLS = [
  {
    id: 1, name: "ABC School",       city: "Coimbatore", plan: "Pro",
    students: 450, teachers: 24, health: "good",   att: 87, feeRate: 78,
    since: "Jan 2025", live: true,
  },
  {
    id: 2, name: "XYZ Vidyalaya",    city: "Chennai",    plan: "Pro",
    students: 820, teachers: 42, health: "good",   att: 91, feeRate: 92,
    since: "Mar 2025", live: true,
  },
  {
    id: 3, name: "Sri Ram School",   city: "Madurai",    plan: "Starter",
    students: 310, teachers: 18, health: "warn",   att: 72, feeRate: 61,
    since: "Jun 2025", live: true,
  },
  {
    id: 4, name: "Lakshmi Vidyalaya",city: "Salem",      plan: "Starter",
    students: 195, teachers: 12, health: "good",   att: 84, feeRate: 75,
    since: "Aug 2025", live: false,
  },
];
const PLAN_COLORS = { Pro: "#7c5cff", Starter: "#34d1bf" };
const HEALTH_COLOR = { good: "#4ade80", warn: "#ffb454", bad: "#ff5c7c" };

// Mock monthly revenue (₹ per month, last 6 months)
const MONTHLY_REVENUE = [
  { month: "Feb",  amount: 48000  },
  { month: "Mar",  amount: 56000  },
  { month: "Apr",  amount: 63000  },
  { month: "May",  amount: 71000  },
  { month: "Jun",  amount: 78000  },
  { month: "Jul",  amount: 82000  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
function getLocalDateLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// Mini revenue bar chart
function RevenueChart({ data }) {
  const maxVal = Math.max(...data.map((d) => d.amount));
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 90, padding: "0 4px" }}>
      {data.map((d) => {
        const h = Math.round((d.amount / maxVal) * 76);
        return (
          <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>
              {(d.amount / 1000).toFixed(0)}k
            </span>
            <div style={{
              width: "100%", height: h,
              background: "linear-gradient(180deg, #7c5cff, #34d1bf)",
              borderRadius: "4px 4px 0 0",
              minHeight: 4,
            }} />
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard() {
  // Pull live data from current school for accuracy
  const catt  = useApi(() => api.getClassAttendance(), []);
  const exams = useApi(() => api.getExams(), []);
  const list  = useApi(() => api.listStudents("8-A"), []);

  const liveSchools  = PLATFORM_SCHOOLS.filter((s) => s.live);
  const totalSchools = PLATFORM_SCHOOLS.length;
  const totalStudents = PLATFORM_SCHOOLS.reduce((a, s) => a + s.students, 0);
  const totalTeachers = PLATFORM_SCHOOLS.reduce((a, s) => a + s.teachers, 0);
  const alertSchools = PLATFORM_SCHOOLS.filter((s) => s.health === "warn" || s.health === "bad");

  const thisMonthRevenue = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 1].amount;
  const lastMonthRevenue = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 2].amount;
  const revenueGrowth    = Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);

  const planBands = [
    { label: "Pro",     value: PLATFORM_SCHOOLS.filter((s) => s.plan === "Pro").length,     color: "#7c5cff" },
    { label: "Starter", value: PLATFORM_SCHOOLS.filter((s) => s.plan === "Starter").length, color: "#34d1bf" },
  ];

  return (
    <>
      {/* ── Banner ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(74,222,128,0.10) 0%, rgba(124,92,255,0.10) 100%)",
        border: "1px solid rgba(74,222,128,0.25)",
        borderRadius: 16, padding: "16px 22px", marginBottom: 18,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>{getLocalDateLabel()}</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            <span style={{ color: "var(--good)" }}>Invisos</span> Platform — Owner View
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
            {liveSchools.length} live schools · {totalStudents.toLocaleString("en-IN")} students · {totalTeachers} teachers
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {alertSchools.length > 0 ? (
            <>
              <span className="badge b-warn">⚠ {alertSchools.length} school{alertSchools.length > 1 ? "s" : ""} need attention</span>
              <div className="mini" style={{ marginTop: 4, color: "var(--warn)" }}>
                {alertSchools.map((s) => s.name).join(", ")}
              </div>
            </>
          ) : (
            <span className="badge b-good">✓ All schools healthy</span>
          )}
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat label="Schools on Platform" value={totalSchools} delta={`${liveSchools.length} live`} dir="up" />
        <Stat label="Total Students" value={totalStudents.toLocaleString("en-IN")} delta="across all schools" dir="up" />
        <Stat
          label="MRR (Jul 2026)"
          value={`₹${(thisMonthRevenue / 1000).toFixed(0)}k`}
          delta={`▲ ${revenueGrowth}% vs last month`}
          dir="up"
        />
        <Stat
          label="Schools Flagged"
          value={alertSchools.length}
          delta="attention needed"
          dir={alertSchools.length > 0 ? "down" : "up"}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid g3" style={{ marginBottom: 18 }}>
        {/* Revenue trend */}
        <Card title="Revenue Trend (6 months)">
          <RevenueChart data={MONTHLY_REVENUE} />
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <span className="badge b-good">▲ {revenueGrowth}% MoM</span>
            <span className="badge" style={{ background: "rgba(124,92,255,0.15)", color: "var(--primary2)" }}>
              ₹{(MONTHLY_REVENUE.reduce((a, d) => a + d.amount, 0) / 1000).toFixed(0)}k YTD
            </span>
          </div>
        </Card>

        {/* Plan distribution */}
        <Card title="Plan Distribution">
          <Donut
            segments={planBands}
            centerLabel={totalSchools}
            centerSub="schools"
          />
        </Card>

        {/* Live school - avg attendance from API */}
        <Card title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Attendance Today
            <span className="mini" style={{ fontWeight: 400 }}>ABC School (live)</span>
          </span>
        }>
          <Loading state={catt}>
            {(() => {
              const data = catt.data || {};
              const entries = Object.entries(data);
              const avg = entries.length
                ? Math.round(entries.reduce((a, [, v]) => a + Number(v), 0) / entries.length)
                : 0;
              return (
                <>
                  <div style={{ fontSize: 42, fontWeight: 800, color: avg >= 85 ? "#4ade80" : "#ffb454", lineHeight: 1.1 }}>
                    {avg}%
                  </div>
                  <div className="mini" style={{ marginTop: 4 }}>{entries.length} classes reporting</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="badge b-good">{entries.filter(([, v]) => Number(v) >= 85).length} excellent</span>
                    <span className="badge b-warn">{entries.filter(([, v]) => Number(v) >= 75 && Number(v) < 85).length} average</span>
                    <span className="badge b-bad">{entries.filter(([, v]) => Number(v) < 75).length} low</span>
                  </div>
                </>
              );
            })()}
          </Loading>
        </Card>
      </div>

      {/* ── Schools health table ──────────────────────────────────────────── */}
      <Card title="Schools Overview">
        <table>
          <thead>
            <tr>
              <th>School</th>
              <th>City</th>
              <th>Plan</th>
              <th style={{ textAlign: "center" }}>Students</th>
              <th style={{ textAlign: "center" }}>Avg Att.</th>
              <th style={{ textAlign: "center" }}>Fee Rate</th>
              <th style={{ textAlign: "center" }}>Health</th>
              <th>Since</th>
            </tr>
          </thead>
          <tbody>
            {PLATFORM_SCHOOLS.map((s) => (
              <tr key={s.id}>
                <td>
                  <b>{s.name}</b>
                  {!s.live && <span className="mini" style={{ marginLeft: 6, color: "var(--muted)" }}>onboarding</span>}
                </td>
                <td className="mini">{s.city}</td>
                <td>
                  <span className="badge" style={{ background: `${PLAN_COLORS[s.plan]}22`, color: PLAN_COLORS[s.plan], border: `1px solid ${PLAN_COLORS[s.plan]}44` }}>
                    {s.plan}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>{s.students.toLocaleString("en-IN")}</td>
                <td style={{ textAlign: "center" }}>
                  <span className={`badge ${s.att >= 85 ? "b-good" : s.att >= 75 ? "b-warn" : "b-bad"}`}>{s.att}%</span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <span className={`badge ${s.feeRate >= 80 ? "b-good" : "b-warn"}`}>{s.feeRate}%</span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <span style={{ color: HEALTH_COLOR[s.health], fontSize: 16 }}>
                    {s.health === "good" ? "●" : s.health === "warn" ? "⚠" : "✗"}
                  </span>
                </td>
                <td className="mini">{s.since}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ─── Schools ─────────────────────────────────────────────────────────────────
function Schools() {
  return (
    <>
      <PageHead title="Schools" sub="All onboarded schools on the Invisos platform" />
      <div className="grid g2">
        {PLATFORM_SCHOOLS.map((s) => (
          <Card key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                <div className="mini" style={{ marginTop: 2 }}>{s.city} · since {s.since}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexDirection: "column", alignItems: "flex-end" }}>
                <span className="badge" style={{ background: `${PLAN_COLORS[s.plan]}22`, color: PLAN_COLORS[s.plan], border: `1px solid ${PLAN_COLORS[s.plan]}44` }}>
                  {s.plan}
                </span>
                <span style={{ fontSize: 10, color: HEALTH_COLOR[s.health], fontWeight: 600 }}>
                  {s.health === "good" ? "● Healthy" : s.health === "warn" ? "⚠ Needs attention" : "✗ Issue"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ background: "var(--panel2)", borderRadius: 8, padding: "8px 12px", textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{s.students}</div>
                <div className="mini">Students</div>
              </div>
              <div style={{ background: "var(--panel2)", borderRadius: 8, padding: "8px 12px", textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{s.teachers}</div>
                <div className="mini">Teachers</div>
              </div>
              <div style={{ background: "var(--panel2)", borderRadius: 8, padding: "8px 12px", textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.att >= 85 ? "#4ade80" : "#ffb454" }}>{s.att}%</div>
                <div className="mini">Avg Att.</div>
              </div>
              <div style={{ background: "var(--panel2)", borderRadius: 8, padding: "8px 12px", textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.feeRate >= 80 ? "#4ade80" : "#ffb454" }}>{s.feeRate}%</div>
                <div className="mini">Fee Rate</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

// ─── Billing ─────────────────────────────────────────────────────────────────
function Billing() {
  const PRO_PRICE     = 15000;  // ₹/month per Pro school
  const STARTER_PRICE = 6000;   // ₹/month per Starter school
  const proSchools     = PLATFORM_SCHOOLS.filter((s) => s.plan === "Pro" && s.live);
  const starterSchools = PLATFORM_SCHOOLS.filter((s) => s.plan === "Starter" && s.live);
  const mrr = proSchools.length * PRO_PRICE + starterSchools.length * STARTER_PRICE;
  const arr = mrr * 12;

  return (
    <>
      <PageHead title="Billing & Subscriptions" sub="Platform revenue · Invisos SaaS" />
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat label="MRR" value={`₹${(mrr / 1000).toFixed(0)}k`} delta="monthly recurring" dir="up" />
        <Stat label="ARR" value={`₹${(arr / 100000).toFixed(1)}L`} delta="annual recurring" dir="up" />
        <Stat label="Pro Schools"     value={proSchools.length}     delta={`₹${PRO_PRICE / 1000}k/mo each`} />
        <Stat label="Starter Schools" value={starterSchools.length} delta={`₹${STARTER_PRICE / 1000}k/mo each`} />
      </div>

      <Card title="Revenue Trend">
        <RevenueChart data={MONTHLY_REVENUE} />
      </Card>

      <Card title="Subscription Details" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr><th>School</th><th>Plan</th><th>Monthly</th><th>Status</th><th>Since</th></tr>
          </thead>
          <tbody>
            {PLATFORM_SCHOOLS.map((s) => (
              <tr key={s.id}>
                <td><b>{s.name}</b><span className="mini" style={{ marginLeft: 6 }}>{s.city}</span></td>
                <td>
                  <span className="badge" style={{ background: `${PLAN_COLORS[s.plan]}22`, color: PLAN_COLORS[s.plan], border: `1px solid ${PLAN_COLORS[s.plan]}44` }}>
                    {s.plan}
                  </span>
                </td>
                <td>₹{((s.plan === "Pro" ? PRO_PRICE : STARTER_PRICE) / 1000).toFixed(0)}k</td>
                <td><span className={`badge ${s.live ? "b-good" : "b-warn"}`}>{s.live ? "Active" : "Onboarding"}</span></td>
                <td className="mini">{s.since}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ─── Analytics ───────────────────────────────────────────────────────────────
function Analytics() {
  const catt  = useApi(() => api.getClassAttendance(), []);
  const exams = useApi(() => api.getExams(), []);

  // Mock platform-wide usage
  const MOCK_STATS = [
    { label: "Daily active users",  value: "1,240",  trend: "▲ 12%",  good: true  },
    { label: "Attendance entries/day", value: "3,800", trend: "▲ 8%", good: true  },
    { label: "Exam marks entered",  value: "18,500", trend: "▲ 22%", good: true  },
    { label: "Messages sent",       value: "2,100",  trend: "▲ 15%", good: true  },
    { label: "Parent logins/week",  value: "890",    trend: "▲ 31%", good: true  },
    { label: "Avg session (min)",   value: "7.4",    trend: "▲ 0.9", good: true  },
  ];

  return (
    <>
      <PageHead title="Platform Analytics" sub="Usage metrics across all schools · last 30 days (demo data)" />

      <div className="grid g3" style={{ marginBottom: 18 }}>
        {MOCK_STATS.map((s, i) => (
          <div className="card stat" key={i}>
            <div className="lbl">{s.label}</div>
            <div className="val">{s.value}</div>
            <div className={`delta ${s.good ? "up" : "down"}`}>{s.trend} vs last month</div>
          </div>
        ))}
      </div>

      <div className="grid g2">
        <Card title="Live School — ABC School · Attendance Today">
          <Loading state={catt}>
            {(() => {
              const data = catt.data || {};
              const entries = Object.entries(data);
              if (!entries.length) return <div className="mini">No data.</div>;
              return entries.map(([cls, pct]) => (
                <div key={cls} className="subline">
                  <div className="s-nm">Class {cls}</div>
                  <div className="bar" style={{ flex: 1 }}>
                    <i style={{ width: pct + "%", background: Number(pct) >= 85 ? "#4ade80" : Number(pct) >= 75 ? "#ffb454" : "#ff5c7c" }} />
                  </div>
                  <div className="s-mk">{pct}%</div>
                </div>
              ));
            })()}
          </Loading>
        </Card>

        <Card title="Live School — Exams on Record">
          <Loading state={exams}>
            {(exams.data || []).length === 0 ? (
              <div className="mini">No exams yet.</div>
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

export const ownerNav = [
  { key: "dashboard",  label: "Platform",   icon: "🏠", Component: Dashboard  },
  { key: "schools",    label: "Schools",    icon: "🏫", Component: Schools    },
  { key: "billing",    label: "Billing",    icon: "💳", Component: Billing    },
  { key: "analytics",  label: "Analytics",  icon: "📈", Component: Analytics  },
];
