import { supabase, mapSupabaseError } from "@/lib/supabase";
import { firebaseAuth, firebaseConfigured, firebaseErrorMessage } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser, signOut as firebaseSignOut } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };
type AuthUser = FirebaseUser | SupabaseUser;

function displayUser(user: AuthUser | null) {
  if (!user) return null;
  const metadata = user instanceof Object && "user_metadata" in user ? (user as SupabaseUser).user_metadata ?? {} : {};
  const firebaseUser = "providerData" in user ? user as FirebaseUser : null;
  const uid = firebaseUser?.uid ?? (user as SupabaseUser).id;
  const name = firebaseUser?.displayName ?? metadata.name ?? metadata.username ?? user.email?.split("@")[0] ?? "Chroma User";
  return {
    id: uid,
    openId: uid,
    name,
    username: firebaseUser?.displayName ?? metadata.username ?? metadata.name ?? user.email?.split("@")[0] ?? "Chroma User",
    email: user.email ?? null,
    // Privileged roles are resolved by the backend/database, never inferred from a browser email.
    role: "user" as "user" | "admin" | "moderator",
    status: "active" as const,
    createdAt: new Date(firebaseUser?.metadata.creationTime ?? (user as SupabaseUser).created_at),
    updatedAt: new Date(firebaseUser?.metadata.lastSignInTime ?? (user as SupabaseUser).updated_at ?? (user as SupabaseUser).created_at),
    lastSignedIn: new Date(firebaseUser?.metadata.lastSignInTime ?? (user as SupabaseUser).last_sign_in_at ?? (user as SupabaseUser).created_at),
  };
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => { if (active) { setError(new Error("Сессия не ответила вовремя. Проверьте соединение и повторите попытку.")); setLoading(false); } }, 10000);
    if (firebaseConfigured && firebaseAuth) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, user => { if (active) { window.clearTimeout(timeout); setAuthUser(user); setLoading(false); } }, authError => { if (active) { window.clearTimeout(timeout); const code = "code" in authError ? String(authError.code) : ""; setError(new Error(firebaseErrorMessage(code))); setLoading(false); } });
      return () => { active = false; window.clearTimeout(timeout); unsubscribe(); };
    }
    supabase.auth.getSession().then(({ data, error: sessionError }) => { if (!active) return; window.clearTimeout(timeout); if (sessionError) setError(new Error(mapSupabaseError(sessionError.message))); setAuthUser(data.session?.user ?? null); setLoading(false); }).catch(() => { if (active) { window.clearTimeout(timeout); setError(new Error("Не удалось восстановить сессию.")); setLoading(false); } });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (active) { setAuthUser(session?.user ?? null); setLoading(false); } });
    return () => { active = false; window.clearTimeout(timeout); data.subscription.unsubscribe(); };
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    if (firebaseConfigured && firebaseAuth) await firebaseSignOut(firebaseAuth);
    else { const { error: signOutError } = await supabase.auth.signOut(); if (signOutError) throw new Error(mapSupabaseError(signOutError.message)); }
    setAuthUser(null); setLoading(false);
  }, []);

  useEffect(() => { if (!redirectOnUnauthenticated || loading || authUser || typeof window === "undefined") return; const target = redirectPath ?? "/login"; if (window.location.pathname !== target) window.location.href = `${target}?next=${encodeURIComponent(window.location.pathname)}`; }, [redirectOnUnauthenticated, redirectPath, loading, authUser]);
  return { user: displayUser(authUser), loading, error, isAuthenticated: Boolean(authUser), refresh: async () => { if (firebaseConfigured && firebaseAuth) return; const { data } = await supabase.auth.getSession(); setAuthUser(data.session?.user ?? null); }, logout, supabaseUser: firebaseConfigured ? null : authUser as SupabaseUser | null, firebaseUser: firebaseConfigured ? authUser as FirebaseUser | null : null };
}
