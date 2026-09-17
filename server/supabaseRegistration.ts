import type { Express, Request, Response } from "express";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

function text(value: unknown, max: number) { return typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : null; }
function errorMessage(value: unknown) { return typeof value === "object" && value !== null && "msg" in value && typeof value.msg === "string" ? value.msg : "Registration failed."; }

export function registerSupabaseRegistrationRoute(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const email = text(req.body?.email, 320)?.toLowerCase();
    const password = typeof req.body?.password === "string" && req.body.password.length >= 6 ? req.body.password : null;
    const username = text(req.body?.username, 48);
    if (!email || !password || !username) return res.status(400).json({ error: "INVALID_REQUEST", message: "Введите username, email и пароль минимум из 6 символов." });
    const serviceKey = process.env.SUPABASE_SECRET_KEY;
    if (!serviceKey || !publishableKey) return res.status(503).json({ error: "AUTH_NOT_CONFIGURED", message: "Регистрация временно недоступна: серверная авторизация не настроена." });
    try {
      const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username, name: username } }),
      });
      const createdBody = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok && !(createResponse.status === 422 && JSON.stringify(createdBody).toLowerCase().includes("already"))) return res.status(createResponse.status === 422 ? 409 : 502).json({ error: "REGISTRATION_FAILED", message: errorMessage(createdBody) });
      const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginBody = await loginResponse.json().catch(() => ({}));
      if (!loginResponse.ok) return res.status(502).json({ error: "SESSION_FAILED", message: "Аккаунт создан, но сессию не удалось открыть. Попробуйте войти." });
      return res.status(201).json(loginBody);
    } catch { return res.status(503).json({ error: "AUTH_UNAVAILABLE", message: "Не удалось подключиться к сервису авторизации." }); }
  });
}
