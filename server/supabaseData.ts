type SupabasePlan = { id: number; name: string; slug: string; description: string; price: number; currency: string; duration_days: number; device_limit: number; features: unknown; active: boolean };
type SupabaseProfile = { id: number; open_id: string; username?: string | null; name?: string | null; email?: string | null; role?: string; status?: string; created_at?: string; updated_at?: string; last_signed_in?: string; last_login_at?: string | null };
type SupabaseSubscription = { id: number; user_id: number; plan_id: number; status: string; starts_at: string; ends_at: string; provider?: string | null; admin_note?: string | null; subscription_plans?: SupabasePlan | null; plan?: SupabasePlan | null };

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co").replace(/\/$/, "");
function headers() { const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY; if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured"); return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }; }
async function rest<T>(path: string, init: RequestInit = {}): Promise<T> { const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } }); const body = await response.json().catch(() => null); if (!response.ok) throw new Error(`SUPABASE_${response.status}`); return body as T; }
function mapPlan(plan?: SupabasePlan | null) { return plan ? { id: Number(plan.id), name: plan.name, slug: plan.slug, description: plan.description, price: plan.price, currency: plan.currency, durationDays: plan.duration_days, deviceLimit: plan.device_limit, features: typeof plan.features === "string" ? plan.features : JSON.stringify(plan.features ?? []), active: plan.active } : null; }
function mapProvider(provider?: string | null): "Manual" | "FunPay" | "Telegram" { return provider === "FunPay" || provider === "Telegram" ? provider : "Manual"; }
function mapProfile(profile: SupabaseProfile) { return { id: Number(profile.id), openId: profile.open_id, username: profile.username, name: profile.name, email: profile.email, role: profile.role ?? "user", status: profile.status ?? "active", createdAt: profile.created_at ? new Date(profile.created_at) : new Date(), updatedAt: profile.updated_at ? new Date(profile.updated_at) : new Date(), lastSignedIn: profile.last_signed_in ? new Date(profile.last_signed_in) : new Date(), lastLoginAt: profile.last_login_at ? new Date(profile.last_login_at) : null }; }

export async function getSupabaseProfile(openId: string) { const rows = await rest<SupabaseProfile[]>(`profiles?select=*&open_id=eq.${encodeURIComponent(openId)}&limit=1`); return rows[0] ?? null; }

export async function getSupabaseDashboard(openId: string) {
  const profile = await getSupabaseProfile(openId);
  if (!profile) return null;
  const now = encodeURIComponent(new Date().toISOString());
  const subscriptions = await rest<SupabaseSubscription[]>(`subscriptions?select=*,plan:subscription_plans(*)&user_id=eq.${Number(profile.id)}&order=ends_at.desc&limit=100`);
  const active = subscriptions.find(row => row.status === "active" && row.ends_at > new Date().toISOString()) ?? null;
  const devices = await rest<Array<{ id: number; user_id: number; name: string; public_key: string; status: string; created_at: string; last_seen_at?: string | null }>>(`devices?select=*&user_id=eq.${Number(profile.id)}&status=eq.active&order=last_seen_at.desc.nullslast&limit=100`);
  const versions = await rest<Array<{ id: number; version: string; minecraft_version: string; file_key: string; file_name: string; release_notes: string; is_latest: boolean; active: boolean; published?: boolean; required_subscription?: string }>>(`client_versions?select=*&active=eq.true&is_latest=eq.true&limit=1`);
  return { user: mapProfile(profile), subscription: active ? { subscription: { id: Number(active.id), userId: Number(active.user_id), planId: Number(active.plan_id), status: active.status, startsAt: new Date(active.starts_at), endsAt: new Date(active.ends_at), provider: mapProvider(active.provider), adminNote: active.admin_note ?? null }, plan: mapPlan(active.plan ?? active.subscription_plans)! } : null, latestSubscription: subscriptions[0] ? { subscription: { id: Number(subscriptions[0].id), userId: Number(subscriptions[0].user_id), planId: Number(subscriptions[0].plan_id), status: subscriptions[0].status, startsAt: new Date(subscriptions[0].starts_at), endsAt: new Date(subscriptions[0].ends_at), provider: mapProvider(subscriptions[0].provider), adminNote: subscriptions[0].admin_note ?? null }, plan: mapPlan(subscriptions[0].plan ?? subscriptions[0].subscription_plans)! } : null, devices: devices.map(device => ({ id: Number(device.id), userId: Number(device.user_id), name: device.name, publicKey: device.public_key, status: device.status, createdAt: new Date(device.created_at), lastSeenAt: device.last_seen_at ? new Date(device.last_seen_at) : null })), latestVersion: versions[0] ? { id: Number(versions[0].id), version: versions[0].version, minecraftVersion: versions[0].minecraft_version, fileKey: versions[0].file_key, fileName: versions[0].file_name, releaseNotes: versions[0].release_notes, isLatest: versions[0].is_latest, active: versions[0].active, requiredPlan: versions[0].required_subscription ?? "free" } : null };
}

export async function getSupabaseVersions(openId: string) { const account = await getSupabaseDashboard(openId); if (!account) return []; const rows = await rest<Array<{ id: number; version: string; minecraft_version: string; file_key: string; file_name: string; release_notes: string; required_subscription?: string; active: boolean; published?: boolean }>>(`client_versions?select=*&active=eq.true&order=created_at.desc&limit=100`); const planLevel: Record<string, number> = { free: 0, base: 1, premium: 2, premium_beta: 3, tester: 3, media: 3 }; const currentLevel = planLevel[account.subscription?.plan?.slug ?? "free"] ?? 0; return rows.filter(row => (planLevel[row.required_subscription ?? "free"] ?? 0) <= currentLevel).map(row => ({ id: Number(row.id), version: row.version, minecraftVersion: row.minecraft_version, fileKey: row.file_key, fileName: row.file_name, releaseNotes: row.release_notes, requiredPlan: row.required_subscription ?? "free" })); }

export async function getSupabaseVisuals(openId: string) { const account = await getSupabaseDashboard(openId); if (!account) return []; const rows = await rest<Array<{ id: number; name: string; description: string; published: boolean; visual_versions?: Array<{ id: number; version: string; minecraft_version: string; required_subscription?: string; published: boolean }> }>>(`visuals?select=id,name,description,published,visual_versions(*)&published=eq.true&limit=100`); const planLevel: Record<string, number> = { free: 0, base: 1, premium: 2, premium_beta: 3, tester: 3, media: 3 }; const currentLevel = planLevel[account.subscription?.plan?.slug ?? "free"] ?? 0; return rows.flatMap(row => (row.visual_versions ?? []).filter(version => version.published !== false && (planLevel[version.required_subscription ?? "free"] ?? 0) <= currentLevel).map(version => ({ id: Number(version.id), name: row.name, slug: `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${version.version}`, version: version.version, minecraftVersion: version.minecraft_version, description: row.description }))); }

export async function getSupabasePlans() { const rows = await rest<SupabasePlan[]>("subscription_plans?select=*&active=eq.true&order=price.asc&limit=100"); return rows.map(row => ({ ...mapPlan(row)!, createdAt: new Date(), updatedAt: new Date() })); }

export async function getSupabaseAdminStats() {
  const now = encodeURIComponent(new Date().toISOString());
  const [users, subscriptions, devices, downloads, versions] = await Promise.all([
    rest<Array<{ id: number }>>("profiles?select=id&limit=1000"),
    rest<Array<{ id: number }>>(`subscriptions?select=id&status=eq.active&ends_at=gt.${now}&limit=1000`),
    rest<Array<{ id: number }>>("devices?select=id&status=eq.active&limit=1000"),
    rest<Array<{ id: number }>>("downloads?select=id&limit=1000"),
    rest<Array<{ version: string }>>("client_versions?select=version&active=eq.true&is_latest=eq.true&limit=1"),
  ]);
  return { users: users.length, activeSubscriptions: subscriptions.length, devices: devices.length, downloads: downloads.length, latestVersion: versions[0]?.version ?? "—" };
}

export async function getSupabaseAdminSubscriptionData() {
  const [plans, rows, users] = await Promise.all([
    getSupabasePlans(),
    rest<Array<SupabaseSubscription & { user?: SupabaseProfile | null }>>("subscriptions?select=*,plan:subscription_plans(*),user:profiles(id,open_id,username,name,email)&order=ends_at.desc&limit=500"),
    getSupabaseAdminUsers(),
  ]);
  return { plans, users, subscriptions: rows.map(row => ({ subscription: { id: Number(row.id), userId: Number(row.user_id), planId: Number(row.plan_id), status: row.status, startsAt: new Date(row.starts_at), endsAt: new Date(row.ends_at), provider: mapProvider(row.provider), adminNote: row.admin_note ?? null }, plan: mapPlan(row.plan ?? row.subscription_plans)!, user: row.user ? mapProfile(row.user) : users.find(user => user.id === Number(row.user_id)) ?? { id: Number(row.user_id), openId: "", username: null, name: null, email: null, role: "user", status: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), lastLoginAt: null } })) };
}

export async function getSupabaseAdminUsers() { const rows = await rest<SupabaseProfile[]>("profiles?select=*&order=created_at.desc&limit=500"); return rows.map(row => mapProfile(row)); }

export async function updateSupabaseRole(openId: string, role: "user" | "developer" | "admin" | "support" | "media" | "moderator") { const rows = await rest<SupabaseProfile[]>(`profiles?open_id=eq.${encodeURIComponent(openId)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ role, updated_at: new Date().toISOString() }) }); return rows.length > 0; }
