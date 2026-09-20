import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Request } from "express";
import { upsertUser, getUserByOpenId } from "./db";
import { ENV } from "./_core/env";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
const jwksUrl = process.env.SUPABASE_JWKS_URL ?? `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
const jwks = createRemoteJWKSet(new URL(jwksUrl));

function bearer(req: Request) { const value = req.header("authorization"); return value?.startsWith("Bearer ") ? value.slice(7).trim() : null; }

async function supabaseProfileRole(openId: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) return null;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role,status&open_id=eq.${encodeURIComponent(openId)}&limit=1`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (!response.ok) return null;
    const rows = await response.json() as Array<{ role?: string; status?: string }>;
    return rows[0] ?? null;
  } catch { return null; }
}
export async function authenticateSupabaseRequest(req: Request) {
  const token = bearer(req);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: `${supabaseUrl}/auth/v1`, audience: "authenticated" });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const metadata = payload.user_metadata && typeof payload.user_metadata === "object" ? payload.user_metadata as Record<string, unknown> : {};
    const username = typeof metadata.username === "string" ? metadata.username : email?.split("@")[0] ?? "Chroma User";
    await upsertUser({ openId: payload.sub, email, username, name: username, loginMethod: "supabase", lastSignedIn: new Date() });
    const storedUser = await getUserByOpenId(payload.sub);
    const supabaseProfile = await supabaseProfileRole(payload.sub);
    const isAdmin = supabaseProfile?.role === "admin" || supabaseProfile?.role === "owner";
    const isActive = supabaseProfile?.status ? supabaseProfile.status === "active" : storedUser?.status !== "banned";
    if (storedUser) return { ...storedUser, role: isAdmin ? "admin" as const : "user" as const, status: isActive ? "active" as const : "suspended" as const };
    return { id: 0, openId: payload.sub, username, name: username, email, loginMethod: "supabase", role: isAdmin ? "admin" as const : "user" as const, status: isActive ? "active" as const : "suspended" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), lastLoginAt: new Date() };
  } catch { return null; }
}

export function supabaseConfigIsPresent() { return Boolean(ENV.supabaseUrl && ENV.supabasePublishableKey); }
