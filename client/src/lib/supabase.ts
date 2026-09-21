import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_lA5GKwBVATAXDuZN2NTc-g_Y-Igb8Dr";

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "chroma-supabase-session",
  },
});

export function mapSupabaseError(message: string | null | undefined) {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("invalid login credentials") || normalized.includes("invalid password") || normalized.includes("invalid credentials")) return "Неверный email или пароль. Проверьте раскладку и попробуйте восстановить пароль, если не уверены.";
  if (normalized.includes("user not found") || normalized.includes("not found")) return "Пользователь не найден.";
  if (normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("unique")) return "Этот email уже используется.";
  if (normalized.includes("password should contain") || normalized.includes("password must contain") || normalized.includes("password requirements") || normalized.includes("weak password") || normalized.includes("password strength")) return "Пароль должен содержать минимум 8 символов, строчную, заглавную букву, цифру и специальный символ.";
  if (normalized.includes("email not confirmed")) return "Email ещё не подтверждён. Откройте письмо подтверждения и войдите снова.";
  if (normalized.includes("too many") || normalized.includes("rate limit")) return "Слишком много попыток. Попробуйте позже.";
  if (normalized.includes("network") || normalized.includes("fetch")) return "Нет соединения с интернетом.";
  return message || "Неизвестная ошибка авторизации.";
}
