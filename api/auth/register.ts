const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

function json(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
function clean(value: unknown, max: number) { return typeof value === "string" && value.trim() && value.length <= max ? value.trim() : ""; }
function passwordError(password: string) {
  if (password.length < 8) return "Пароль должен содержать минимум 8 символов.";
  if (!/[a-zа-я]/.test(password)) return "Пароль должен содержать строчную букву.";
  if (!/[A-ZА-Я]/.test(password)) return "Пароль должен содержать заглавную букву.";
  if (!/[0-9]/.test(password)) return "Пароль должен содержать цифру.";
  if (!/[^A-Za-zА-Яа-я0-9]/.test(password)) return "Пароль должен содержать специальный символ: !, @, #, $ или другой знак.";
  return "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED", message: "Используйте POST." });
  const email = clean(req.body?.email, 320).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const username = clean(req.body?.username, 48);
  if (!email || !email.includes("@")) return json(res, 400, { error: "INVALID_EMAIL", message: "Введите корректный email." });
  if (!username) return json(res, 400, { error: "INVALID_USERNAME", message: "Введите имя пользователя." });
  const passwordMessage = passwordError(password);
  if (passwordMessage) return json(res, 400, { error: "INVALID_PASSWORD", message: passwordMessage });
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
