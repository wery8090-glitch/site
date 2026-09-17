import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Request } from "express";
import { ensureFirebaseProfile } from "./db";
import type { User } from "../drizzle/schema";

function bearer(req: Request) {
  const value = req.header("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

function adminAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getAuth(app);
}

export async function authenticateFirebaseRequest(req: Request): Promise<User | null> {
  const token = bearer(req);
  const auth = adminAuth();
  if (!token || !auth) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    if (!decoded.uid) return null;
    const email = decoded.email ?? null;
    const username = typeof decoded.username === "string" ? decoded.username : email?.split("@")[0] ?? "Chroma User";
    return (await ensureFirebaseProfile({ openId: decoded.uid, email, username, name: decoded.name ?? username })) ?? null;
  } catch {
    return null;
  }
}

export function firebaseAdminConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}
