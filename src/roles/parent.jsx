// PARENT role screens
// Read-only view of own child's attendance, marks, fees, and notices.
import React from "react";
import { Card, PageHead } from "../components/ui.jsx";

function Dashboard() {
  return (
    <div>
      <PageHead title="Parent Dashboard" sub="Your child's school overview" />
      <Card>
        <p style={{ color: "var(--muted)", padding: "20px 0" }}>
          Parent dashboard — coming soon. Will show child's attendance, latest marks, fee status, and school notices.
        </p>
      </Card>
    </div>
  );
}

function Attendance() {
  return (
    <div>
      <PageHead title="Attendance" sub="Your child's attendance record" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Attendance view — coming soon.</p></Card>
    </div>
  );
}

function Marks() {
  return (
    <div>
      <PageHead title="Marks" sub="Exam results" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Marks view — coming soon.</p></Card>
    </div>
  );
}

function Fees() {
  return (
    <div>
      <PageHead title="Fees" sub="Fee payment status" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Fee status — coming soon.</p></Card>
    </div>
  );
}

function Notices() {
  return (
    <div>
      <PageHead title="Notices" sub="School announcements" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Notices — coming soon.</p></Card>
    </div>
  );
}

export const parentNav = [
  { key: "dashboard",  label: "Dashboard",  icon: "🏠", Component: Dashboard  },
  { key: "attendance", label: "Attendance",  icon: "📅", Component: Attendance },
  { key: "marks",      label: "Marks",       icon: "📊", Component: Marks      },
  { key: "fees",       label: "Fees",        icon: "💳", Component: Fees       },
  { key: "notices",    label: "Notices",     icon: "📢", Component: Notices    },
];
