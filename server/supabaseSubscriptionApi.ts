import type { Request } from "express";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_lA5GKwBVATAXDuZN2NTc-g_Y-Igb8Dr";
const ENDPOINT = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chroma-subscriptions`;

function bearer(req: Request) {
  const value = req.header("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export async function callSupabaseSubscriptionApi(req: Request, action: string, payload: Record<string, unknown> = {}) {
  const token = bearer(req);
  if (!token) throw new Error("UNAUTHORIZED");
  const response = await fetch(ENDPOINT, { method: "POST", headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
  const body = await response.json().catch(() => ({})) as { data?: unknown; error?: string };
  if (!response.ok) throw new Error(body.error || (response.status === 403 ? "FORBIDDEN" : "SUBSCRIPTION_KEY_REQUEST_FAILED"));
  return body.data;
}

export function mapSubscriptionKeys(rows: any[]) {
  return rows.map(row => ({ key: { id: row.id, durationDays: row.duration_days, maxActivations: row.max_activations, usedActivations: row.used_activations, status: row.status, expiresAt: row.expires_at, createdAt: row.created_at }, plan: { id: row.plan_id, name: row.plan?.name ?? row.plan?.slug ?? "Plan", slug: row.plan?.slug ?? "" }, user: row.redeemed_by ? { id: row.redeemed_by, email: null } : null }));
}
