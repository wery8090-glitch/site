import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Request } from "express";
import { upsertUser, getUserByOpenId } from "./db";
import { ENV } from "./_core/env";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
const jwksUrl = process.env.SUPABASE_JWKS_URL ?? `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
const jwks = createRemoteJWKSet(new URL(jwksUrl));
const adminEmails = new Set((process.env.ADMIN_EMAILS ?? "wery8090@gmail.com").split(",").map(value => value.trim().toLowerCase()).filter(Boolean));

function bearer(req: Request) { const value = req.header("authorization"); return value?.startsWith("Bearer ") ? value.slice(7).trim() : null; }
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
    const isAllowlistedAdmin = Boolean(email && adminEmails.has(email.toLowerCase()));
    if (storedUser) return isAllowlistedAdmin ? { ...storedUser, role: "admin" as const, status: "active" as const } : storedUser;
    return { id: 0, openId: payload.sub, username, name: username, email, loginMethod: "supabase", role: isAllowlistedAdmin ? "admin" as const : "user" as const, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), lastLoginAt: new Date() };
  } catch { return null; }
}

export function supabaseConfigIsPresent() { return Boolean(ENV.supabaseUrl && ENV.supabasePublishableKey); }
