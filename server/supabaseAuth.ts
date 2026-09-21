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

async function fetchSupabaseUser(token: string) {
  try {
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: publishableKey ?? "", Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const body = await response.json() as { id?: string; email?: string; user_metadata?: Record<string, unknown> };
    return typeof body.id === "string" && body.id ? body : null;
  } catch { return null; }
}

export async function authenticateSupabaseRequest(req: Request) {
  const token = bearer(req);
  if (!token) return null;
  let openId: string | null = null;
  let email: string | null = null;
  let metadata: Record<string, unknown> = {};
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: `${supabaseUrl}/auth/v1`, audience: "authenticated" });
    if (typeof payload.sub === "string" && payload.sub.length > 0) {
      openId = payload.sub;
      email = typeof payload.email === "string" ? payload.email : null;
      metadata = payload.user_metadata && typeof payload.user_metadata === "object" ? payload.user_metadata as Record<string, unknown> : {};
    }
  } catch {
    const remoteUser = await fetchSupabaseUser(token);
    if (!remoteUser) return null;
    openId = remoteUser.id ?? null;
    email = remoteUser.email ?? null;
    metadata = remoteUser.user_metadata ?? {};
  }
  if (!openId) return null;
  const username = typeof metadata.username === "string" ? metadata.username : email?.split("@")[0] ?? "Chroma User";
  await upsertUser({ openId, email, username, name: username, loginMethod: "supabase", lastSignedIn: new Date() });
  const storedUser = await getUserByOpenId(openId);
  const supabaseProfile = await supabaseProfileRole(openId);
  const profileRole = supabaseProfile?.role;
  const knownRoles = ["user", "developer", "admin", "support", "media", "moderator"] as const;
  const role = profileRole === "owner" ? "developer" : knownRoles.includes(profileRole as typeof knownRoles[number]) ? profileRole as typeof knownRoles[number] : storedUser?.role ?? "user";
  const isActive = supabaseProfile?.status ? supabaseProfile.status === "active" : storedUser?.status !== "banned";
  if (storedUser) return { ...storedUser, role, status: isActive ? "active" as const : "suspended" as const };
  return { id: 0, openId, username, name: username, email, loginMethod: "supabase", role, status: isActive ? "active" as const : "suspended" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), lastLoginAt: new Date() };
}

export function supabaseConfigIsPresent() { return Boolean(ENV.supabaseUrl && ENV.supabasePublishableKey); }
