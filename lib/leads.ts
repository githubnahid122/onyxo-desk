import "server-only";
import type { Lead } from "@/types/lead";

/**
 * Minimal in-memory lead store.
 *
 * This is a placeholder persistence layer so the admin dashboard has
 * something real to render end-to-end. It resets on every server restart
 * and is NOT safe for a multi-instance deployment. Swap this module for a
 * real database (Postgres via Prisma/Drizzle, PlanetScale, Supabase, etc.)
 * before going to production — keep the exported function signatures the
 * same and nothing else in the app needs to change.
 */

declare global {
  var __onyxoLeads: Lead[] | undefined;
}

const store: Lead[] = globalThis.__onyxoLeads ?? [];
globalThis.__onyxoLeads = store;

export function createLead(lead: Lead): Lead {
  store.unshift(lead);
  return lead;
}

export function listLeads(): Lead[] {
  return store;
}

export function getLead(id: string): Lead | undefined {
  return store.find((lead) => lead.id === id);
}

export function markLeadPaid(id: string): Lead | undefined {
  const lead = getLead(id);
  if (lead) lead.status = "paid";
  return lead;
}
