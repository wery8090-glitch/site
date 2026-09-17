import { supabase, mapSupabaseError } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };
function displayUser(user: SupabaseUser | null) {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const name = metadata.name ?? metadata.username ?? user.email?.split("@")[0] ?? "Chroma User";
  return { id: user.id, openId: user.id, name, username: metadata.username ?? name, email: user.email ?? null, role: "user" as "user" | "admin" | "moderator", status: "active" as const, createdAt: new Date(user.created_at), updatedAt: new Date(user.updated_at ?? user.created_at), lastSignedIn: new Date(user.last_sign_in_at ?? user.created_at) };
}
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => { if (active) { setError(new Error("Сессия не ответила вовремя. Проверьте соединение и повторите попытку.")); setLoading(false); } }, 10000);
    supabase.auth.getSession().then(({ data, error: sessionError }) => { if (!active) return; window.clearTimeout(timeout); if (sessionError) setError(new Error(mapSupabaseError(sessionError.message))); setAuthUser(data.session?.user ?? null); setLoading(false); }).catch(() => { if (active) { window.clearTimeout(timeout); setError(new Error("Не удалось восстановить сессию.")); setLoading(false); } });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (active) { setAuthUser(session?.user ?? null); setLoading(false); } });
    return () => { active = false; window.clearTimeout(timeout); data.subscription.unsubscribe(); };
  }, []);
  const logout = useCallback(async () => { setLoading(true); const { error: signOutError } = await supabase.auth.signOut(); if (signOutError) throw new Error(mapSupabaseError(signOutError.message)); setAuthUser(null); setLoading(false); }, []);
  useEffect(() => { if (!redirectOnUnauthenticated || loading || authUser || typeof window === "undefined") return; const target = redirectPath ?? "/login"; if (window.location.pathname !== target) window.location.href = `${target}?next=${encodeURIComponent(window.location.pathname)}`; }, [redirectOnUnauthenticated, redirectPath, loading, authUser]);
  return { user: displayUser(authUser), loading, error, isAuthenticated: Boolean(authUser), refresh: async () => { const { data } = await supabase.auth.getSession(); setAuthUser(data.session?.user ?? null); }, logout, supabaseUser: authUser };
}
