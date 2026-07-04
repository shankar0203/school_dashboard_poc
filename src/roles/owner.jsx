// OWNER role screens
// Product owner (Invisos) — cross-school platform view, all schools.
import React from "react";
import { Card, PageHead } from "../components/ui.jsx";

function Dashboard() {
  return (
    <div>
      <PageHead title="Platform Overview" sub="All schools across Invisos" />
      <Card>
        <p style={{ color: "var(--muted)", padding: "20px 0" }}>
          Owner dashboard — coming soon. Will show all active schools, subscription status, usage metrics, and platform health.
        </p>
      </Card>
    </div>
  );
}

function Schools() {
  return (
    <div>
      <PageHead title="Schools" sub="All onboarded schools" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Schools list — coming soon.</p></Card>
    </div>
  );
}

function Billing() {
  return (
    <div>
      <PageHead title="Billing" sub="Subscription and payment tracking" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Billing overview — coming soon.</p></Card>
    </div>
  );
}

function Analytics() {
  return (
    <div>
      <PageHead title="Analytics" sub="Platform-wide usage metrics" />
      <Card><p style={{ color: "var(--muted)", padding: "20px 0" }}>Analytics — coming soon.</p></Card>
    </div>
  );
}

export const ownerNav = [
  { key: "dashboard", label: "Dashboard", icon: "🏠", Component: Dashboard },
  { key: "schools",   label: "Schools",   icon: "🏫", Component: Schools   },
  { key: "billing",   label: "Billing",   icon: "💳", Component: Billing   },
  { key: "analytics", label: "Analytics", icon: "📈", Component: Analytics },
];
