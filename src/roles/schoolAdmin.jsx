// SCHOOL ADMIN role screens
// Office staff — fee collection, student records, enrollment.
import React from "react";
import { Card, PageHead } from "../components/ui.jsx";

function Dashboard() {
  return (
    <div>
      <PageHead title="School Admin" sub="Office management overview" />
      <Card>
        <p style={{ color: "var(--muted)", padding: "20px 0" }}>
          Admin dashboard — coming soon. Will show fee collection summary, pending payments, and student enrollment stats.
        </p>
      </Card>
    </div>
  );
}

function Fees() {
  return (
    <div>
      <PageHead title="Fee Management" sub="Collect and track fee payments" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Fee management — coming soon.</p></Card>
    </div>
  );
}

function Students() {
  return (
    <div>
      <PageHead title="Students" sub="Student records and enrollment" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Student records — coming soon.</p></Card>
    </div>
  );
}

function Reports() {
  return (
    <div>
      <PageHead title="Reports" sub="Fee and enrollment reports" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Reports — coming soon.</p></Card>
    </div>
  );
}

export const schoolAdminNav = [
  { key: "dashboard", label: "Dashboard", icon: "🏠", Component: Dashboard },
  { key: "fees",      label: "Fees",      icon: "💰", Component: Fees      },
  { key: "students",  label: "Students",  icon: "👥", Component: Students  },
  { key: "reports",   label: "Reports",   icon: "📋", Component: Reports   },
];
