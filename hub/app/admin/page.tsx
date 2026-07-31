'use client';

import { AdminDashboard } from '@/components/admin/AdminDashboard';

/**
 * FEAT-H034 — the /admin route (ADM-1; the AB-7 shape: Console-routed surfaces
 * live in the Hub shell under this one admin section; the Console-as-entity
 * question stays deferred, ADR-U028/U025). The gate is the platform's own
 * refusal, surfaced by the dashboard as a 404 shape — the route itself
 * renders for everyone and discloses nothing.
 */
export default function AdminPage() {
  return <AdminDashboard />;
}
