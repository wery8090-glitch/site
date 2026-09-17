const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

function json(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
function clean(value: unknown, max: number) { return typeof value === "string" && value.trim() && value.length <= max ? value.trim() : ""; }

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED", message: "Используйте POST." });
  const email = clean(req.body?.email, 320).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const username = clean(req.body?.username, 48);
  if (!email || !email.includes("@") || !username || password.length < 6) return json(res, 400, { error: "INVALID_REQUEST", message: "Проверьте username, email и пароль минимум из 6 символов." });
  if (!SECRET_KEY || !PUBLISHABLE_KEY) return json(res, 503, { error: "AUTH_NOT_CONFIGURED", message: "Сервис регистрации не настроен." });
  try {
    const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: "POST", headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username, name: username } }) });
    const createdBody = await created.json().catch(() => ({}));
    const alreadyExists = created.status === 422 && JSON.stringify(createdBody).toLowerCase().includes("already");
    if (!created.ok && !alreadyExists) return json(res, 400, { error: "REGISTRATION_FAILED", message: "Не удалось создать аккаунт. Возможно, этот email уже используется." });
    const session = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const sessionBody = await session.json().catch(() => ({}));
    if (!session.ok) return json(res, 401, { error: "SESSION_FAILED", message: "Аккаунт создан, но вход не удался. Попробуйте войти отдельно." });
    return json(res, 201, sessionBody);
  } catch { return json(res, 503, { error: "AUTH_UNAVAILABLE", message: "Сервис авторизации временно недоступен." }); }
}
