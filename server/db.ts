import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLogs,
  clientVersions,
  deviceLinkCodes,
  devices,
  downloads,
  InsertUser,
  loaderChallenges,
  loaderSessions,
  subscriptionPlans,
  subscriptionKeys,
  subscriptions,
  users,
  visuals,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  const textFields = ["name", "email", "loginMethod", "username"] as const;
  for (const field of textFields) if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  // Roles are database-controlled. Never trust a role supplied by a browser or external profile payload.
  if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (user.status !== undefined) { values.status = user.status; updateSet.status = user.status; }
  updateSet.lastLoginAt = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensureSupabaseProfile(user: { openId: string; email?: string | null; name?: string | null; username?: string | null }) {
  await upsertUser({ openId: user.openId, email: user.email ?? null, name: user.name ?? null, username: user.username ?? user.email?.split("@")[0] ?? "Chroma User", loginMethod: "supabase", status: "active", lastSignedIn: new Date() });
  const db = await getDb();
  const stored = await getUserByOpenId(user.openId);
  if (!db || !stored) return stored;
  const freePlan = await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.slug, "free"), eq(subscriptionPlans.active, true))).limit(1);
  if (freePlan[0]) {
    const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, stored.id)).limit(1);
    if (!existing[0]) await db.insert(subscriptions).values({ userId: stored.id, planId: freePlan[0].id, status: "active", startsAt: new Date(), endsAt: new Date(Date.now() + Math.max(1, freePlan[0].durationDays) * 86_400_000), provider: "Manual", adminNote: "Supabase registration default FREE plan" });
  }
  return stored;
}

export async function getPublicPlans() {
  const db = await getDb();
  if (!db) return [
    { id: 1, name: "FREE", slug: "free", description: "Basic Chroma access after registration.", price: 0, currency: "RUB", durationDays: 36500, deviceLimit: 1, features: JSON.stringify(["Basic features", "Access after registration", "Client download access"]), active: true, createdAt: new Date(0), updatedAt: new Date(0) },
    { id: 2, name: "BASE", slug: "base", description: "A focused starting point for the visual client.", price: 10000, currency: "RUB", durationDays: 30, deviceLimit: 1, features: JSON.stringify(["Full visual client", "1 device", "Core updates"]), active: true, createdAt: new Date(0), updatedAt: new Date(0) },
    { id: 3, name: "PREMIUM", slug: "premium", description: "The complete Chroma experience for focused play.", price: 20000, currency: "RUB", durationDays: 30, deviceLimit: 2, features: JSON.stringify(["Full visual client", "2 devices", "Performance profiles", "Priority updates"]), active: true, createdAt: new Date(0), updatedAt: new Date(0) },
    { id: 4, name: "PREMIUM + BETA", slug: "premium_beta", description: "Early access to updates and new features.", price: 29000, currency: "RUB", durationDays: 30, deviceLimit: 3, features: JSON.stringify(["Everything in Premium", "3 devices", "Early access", "Extended support"]), active: true, createdAt: new Date(0), updatedAt: new Date(0) },
  ];
  const now = new Date();
  await db.insert(subscriptionPlans).values([
    { name: "FREE", slug: "free", description: "Basic Chroma access after registration.", price: 0, currency: "RUB", durationDays: 36500, deviceLimit: 1, features: JSON.stringify(["Basic features", "Access after registration", "Client download access"]), active: true },
    { name: "BASE", slug: "base", description: "A focused starting point for the visual client.", price: 10000, currency: "RUB", durationDays: 30, deviceLimit: 1, features: JSON.stringify(["Full visual client", "1 device", "Core updates"]), active: true },
    { name: "PREMIUM", slug: "premium", description: "The complete Chroma experience for focused play.", price: 20000, currency: "RUB", durationDays: 30, deviceLimit: 2, features: JSON.stringify(["Full visual client", "2 devices", "Performance profiles", "Priority updates"]), active: true },
    { name: "PREMIUM + BETA", slug: "premium_beta", description: "Early access to updates and new features.", price: 29000, currency: "RUB", durationDays: 30, deviceLimit: 3, features: JSON.stringify(["Everything in Premium", "3 devices", "Early access", "Extended support"]), active: true },
  ]).onDuplicateKeyUpdate({ set: { active: true, updatedAt: now } });
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true)).orderBy(subscriptionPlans.price);
}

export async function getPlanBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.slug, slug), eq(subscriptionPlans.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function getDashboardSummary(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [user, activeSubscription, latestSubscription, deviceRows, latestVersion, downloadRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select({ subscription: subscriptions, plan: subscriptionPlans }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), gt(subscriptions.endsAt, new Date()))).orderBy(desc(subscriptions.endsAt)).limit(1),
    db.select({ subscription: subscriptions, plan: subscriptionPlans }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.endsAt)).limit(1),
    db.select().from(devices).where(and(eq(devices.userId, userId), eq(devices.status, "active"))).orderBy(desc(devices.lastSeenAt)),
    db.select().from(clientVersions).where(and(eq(clientVersions.isLatest, true), eq(clientVersions.active, true))).limit(1),
    db.select({ id: downloads.id, createdAt: downloads.createdAt }).from(downloads).where(eq(downloads.userId, userId)).orderBy(desc(downloads.createdAt)).limit(5),
  ]);
  return { user: user[0] ?? null, subscription: activeSubscription[0] ?? null, latestSubscription: latestSubscription[0] ?? null, devices: deviceRows, latestVersion: latestVersion[0] ?? null, downloads: downloadRows };
}

export async function getAdminSubscriptionData() {
  const db = await getDb();
  if (!db) return { users: [], plans: [], subscriptions: [] };
  await syncSupabaseUsers();
  const [userRows, planRows, subscriptionRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, username: users.username, role: users.role, status: users.status, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)),
    db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true)).orderBy(subscriptionPlans.price),
    db.select({ subscription: subscriptions, plan: subscriptionPlans, user: users }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).innerJoin(users, eq(subscriptions.userId, users.id)).orderBy(desc(subscriptions.createdAt)).limit(100),
  ]);
  return { users: userRows, plans: planRows, subscriptions: subscriptionRows };
}

/** Import real Supabase Auth users into the existing local users table. */
export async function syncSupabaseUsers() {
  const db = await getDb();
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!db || !serviceKey || !supabaseUrl) return 0;
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!response.ok) return 0;
    const payload = await response.json() as { users?: Array<{ id: string; email?: string; created_at?: string; user_metadata?: Record<string, unknown> }> };
    let imported = 0;
    for (const authUser of payload.users ?? []) {
      const username = typeof authUser.user_metadata?.username === "string" ? authUser.user_metadata.username : authUser.email?.split("@")[0] ?? "Chroma User";
      await upsertUser({ openId: authUser.id, email: authUser.email ?? null, username, name: username, loginMethod: "supabase", lastSignedIn: authUser.created_at ? new Date(authUser.created_at) : new Date() });
      imported += 1;
    }
    return imported;
  } catch {
    return 0;
  }
}

export async function issueSubscription(input: { userId: number; planId: number; startsAt: Date; endsAt: Date; provider: "FunPay" | "Telegram" | "Manual"; adminNote?: string }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(subscriptions).values({ ...input, status: "active" });
  return Number(result[0].insertId);
}

export async function updateSubscription(input: { id: number; planId: number; startsAt: Date; endsAt: Date; provider: "FunPay" | "Telegram" | "Manual"; adminNote?: string }) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(subscriptions).set({ planId: input.planId, startsAt: input.startsAt, endsAt: input.endsAt, provider: input.provider, adminNote: input.adminNote ?? null, status: "active" }).where(eq(subscriptions.id, input.id));
  return result[0].affectedRows > 0;
}

export async function extendSubscription(id: number, days: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ endsAt: subscriptions.endsAt }).from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  const current = rows[0];
  if (!current) return false;
  const nextEnd = new Date(Math.max(current.endsAt.getTime(), Date.now()) + days * 86_400_000);
  const result = await db.update(subscriptions).set({ endsAt: nextEnd, status: "active" }).where(eq(subscriptions.id, id));
  return result[0].affectedRows > 0;
}

export async function revokeSubscription(id: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(subscriptions).set({ status: "cancelled" }).where(eq(subscriptions.id, id));
  return result[0].affectedRows > 0;
}

export function formatSubscriptionKey() {
  const part = (size: number) => randomBytes(size).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, size).toUpperCase();
  return `CHROMA-${part(6)}-${part(6)}-${part(6)}`;
}

const keyDigest = (key: string) => createHash("sha256").update(key.trim().toUpperCase()).digest("hex");

export async function createSubscriptionKey(input: { planId: number; expiresAt: Date; maxActivations: number; createdByUserId: number }) {
  const db = await getDb();
  if (!db) return null;
  const plan = await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.id, input.planId), eq(subscriptionPlans.active, true))).limit(1);
  if (!plan[0] || plan[0].slug === "free") return null;
  const plain = formatSubscriptionKey();
  const durationDays = Math.max(1, Math.ceil((input.expiresAt.getTime() - Date.now()) / 86_400_000));
  const result = await db.insert(subscriptionKeys).values({ keyHash: keyDigest(plain), planId: input.planId, durationDays, expiresAt: input.expiresAt, maxActivations: input.maxActivations, usedActivations: 0, createdByUserId: input.createdByUserId, status: "available" });
  return { id: Number(result[0].insertId), key: plain, planId: input.planId, durationDays, maxActivations: input.maxActivations, usedActivations: 0, expiresAt: input.expiresAt };
}

export async function redeemSubscriptionKey(input: { key: string; userId: number }) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ key: subscriptionKeys, plan: subscriptionPlans }).from(subscriptionKeys).innerJoin(subscriptionPlans, eq(subscriptionKeys.planId, subscriptionPlans.id)).where(and(eq(subscriptionKeys.keyHash, keyDigest(input.key)), eq(subscriptionKeys.status, "available"), gt(subscriptionKeys.expiresAt, new Date()), sql`${subscriptionKeys.usedActivations} < ${subscriptionKeys.maxActivations}`)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const now = new Date();
  // The guarded UPDATE reserves exactly one activation slot. Concurrent requests
  // cannot both pass the usedActivations < maxActivations predicate.
  const result = await db.update(subscriptionKeys).set({ usedActivations: sql`${subscriptionKeys.usedActivations} + 1`, redeemedByUserId: input.userId, redeemedAt: now }).where(and(eq(subscriptionKeys.id, row.key.id), eq(subscriptionKeys.status, "available"), sql`${subscriptionKeys.usedActivations} < ${subscriptionKeys.maxActivations}`, gt(subscriptionKeys.expiresAt, now)));
  if (result[0].affectedRows === 0) return null;
  const updated = await db.select({ usedActivations: subscriptionKeys.usedActivations, maxActivations: subscriptionKeys.maxActivations }).from(subscriptionKeys).where(eq(subscriptionKeys.id, row.key.id)).limit(1);
  if (updated[0] && updated[0].usedActivations >= updated[0].maxActivations) await db.update(subscriptionKeys).set({ status: "redeemed" }).where(and(eq(subscriptionKeys.id, row.key.id), eq(subscriptionKeys.status, "available")));
  const subscriptionId = await issueSubscription({ userId: input.userId, planId: row.plan.id, startsAt: now, endsAt: new Date(now.getTime() + row.key.durationDays * 86_400_000), provider: "Manual", adminNote: `Redeemed subscription key ${row.key.id}` });
  return subscriptionId ? { subscriptionId, plan: row.plan, durationDays: row.key.durationDays, usedActivations: updated[0]?.usedActivations ?? 1, maxActivations: row.key.maxActivations } : null;
}

export async function getAdminSubscriptionKeys() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ key: subscriptionKeys, plan: subscriptionPlans, user: users }).from(subscriptionKeys).innerJoin(subscriptionPlans, eq(subscriptionKeys.planId, subscriptionPlans.id)).leftJoin(users, eq(subscriptionKeys.redeemedByUserId, users.id)).orderBy(desc(subscriptionKeys.createdAt)).limit(200);
}

export async function getUserDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.createdAt));
}

export async function createDeviceLinkCode(input: { codeHash: string; deviceName: string; publicKey: string; expiresAt: Date }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(deviceLinkCodes).values(input);
  return Number(result[0].insertId);
}

export async function getValidDeviceLinkCode(codeHash: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(deviceLinkCodes).where(and(eq(deviceLinkCodes.codeHash, codeHash), isNull(deviceLinkCodes.usedAt), gt(deviceLinkCodes.expiresAt, new Date()))).limit(1);
  return rows[0] ?? null;
}

export async function consumeDeviceLinkCode(id: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(deviceLinkCodes).set({ usedAt: new Date() }).where(and(eq(deviceLinkCodes.id, id), isNull(deviceLinkCodes.usedAt)));
  return result[0].affectedRows > 0;
}

export async function createDevice(input: { userId: number; name: string; publicKey: string }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(devices).values({ ...input, status: "active" });
  return Number(result[0].insertId);
}

export async function getDeviceByPublicKey(publicKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(devices).where(eq(devices.publicKey, publicKey)).limit(1);
  return rows[0] ?? null;
}

export async function countActiveDevices(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql<number>`count(*)` }).from(devices).where(and(eq(devices.userId, userId), eq(devices.status, "active")));
  return Number(rows[0]?.count ?? 0);
}

export async function createLoaderChallenge(input: { deviceId: number; nonce: string; expiresAt: Date }) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(loaderChallenges).values(input);
  return true;
}

export async function getValidLoaderChallenge(deviceId: number, nonce: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(loaderChallenges).where(and(eq(loaderChallenges.deviceId, deviceId), eq(loaderChallenges.nonce, nonce), isNull(loaderChallenges.usedAt), gt(loaderChallenges.expiresAt, new Date()))).limit(1);
  return rows[0] ?? null;
}

export async function consumeLoaderChallenge(id: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(loaderChallenges).set({ usedAt: new Date() }).where(and(eq(loaderChallenges.id, id), isNull(loaderChallenges.usedAt)));
  return result[0].affectedRows > 0;
}

export async function createLoaderSession(input: { userId: number; deviceId: number; tokenHash: string; expiresAt: Date; lastSeenAt: Date }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(loaderSessions).values(input);
  return Number(result[0].insertId);
}

export async function revokeDevice(userId: number, deviceId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(devices).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(devices.id, deviceId), eq(devices.userId, userId)));
  return result[0].affectedRows > 0;
}

export async function getLatestVersion() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(clientVersions).where(and(eq(clientVersions.isLatest, true), eq(clientVersions.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function getAvailableVersions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const summary = await getDashboardSummary(userId);
  const plan = summary?.subscription?.plan.slug ?? "free";
  const allowed = plan === "premium_beta" ? ["free", "base", "premium", "premium_beta"] : plan === "premium" ? ["free", "base", "premium"] : plan === "base" ? ["free", "base"] : ["free"];
  return db.select().from(clientVersions).where(and(eq(clientVersions.active, true), sql`${clientVersions.requiredPlan} in (${sql.join(allowed.map(value => sql`${value}`), sql`, `)})`)).orderBy(desc(clientVersions.createdAt)).limit(50);
}

export async function getUserVisuals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const summary = await getDashboardSummary(userId);
  const plan = summary?.subscription?.plan.slug ?? "free";
  const allowed = plan === "premium_beta" ? ["free", "base", "premium", "premium_beta"] : plan === "premium" ? ["free", "base", "premium"] : plan === "base" ? ["free", "base"] : ["free"];
  return db.select().from(visuals).where(and(eq(visuals.active, true), sql`${visuals.slug} in (${sql.join(allowed.map(value => sql`${value}`), sql`, `)})`)).orderBy(desc(visuals.updatedAt)).limit(100);
}

export async function createAuditLog(input: { userId?: number; action: string; metadata?: Record<string, unknown>; ipHash?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ userId: input.userId, action: input.action, metadata: input.metadata ? JSON.stringify(input.metadata) : null, ipHash: input.ipHash });
}

export async function getAdminAuditLogs(input: { limit: number; offset: number; action?: string }) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const where = input.action ? eq(auditLogs.action, input.action) : undefined;
  const [rows, countRows] = await Promise.all([
    db.select({ log: auditLogs, user: users }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).where(where).orderBy(desc(auditLogs.createdAt)).limit(input.limit).offset(input.offset),
    db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(where),
  ]);
  return { rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function getAdminAuditActions() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ action: auditLogs.action, count: sql<number>`count(*)` }).from(auditLogs).groupBy(auditLogs.action).orderBy(desc(sql`count(*)`)).limit(100);
  return rows.map(row => ({ action: row.action, count: Number(row.count) }));
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;
  const [userCount, activeSubs, deviceCount, downloadCount, latest] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(and(eq(subscriptions.status, "active"), gt(subscriptions.endsAt, new Date()))),
    db.select({ count: sql<number>`count(*)` }).from(devices).where(eq(devices.status, "active")),
    db.select({ count: sql<number>`count(*)` }).from(downloads),
    getLatestVersion(),
  ]);
  return { users: Number(userCount[0]?.count ?? 0), activeSubscriptions: Number(activeSubs[0]?.count ?? 0), devices: Number(deviceCount[0]?.count ?? 0), downloads: Number(downloadCount[0]?.count ?? 0), latestVersion: latest?.version ?? "—" };
}

export async function getLoaderSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ session: loaderSessions, device: devices, user: users }).from(loaderSessions).innerJoin(devices, eq(loaderSessions.deviceId, devices.id)).innerJoin(users, eq(loaderSessions.userId, users.id)).where(and(eq(loaderSessions.tokenHash, tokenHash), isNull(loaderSessions.revokedAt), gt(loaderSessions.expiresAt, new Date()), eq(devices.status, "active"), eq(users.status, "active"))).limit(1);
  return rows[0] ?? null;
}

export async function revokeLoaderSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(loaderSessions).set({ revokedAt: new Date() }).where(eq(loaderSessions.tokenHash, tokenHash));
  return result[0].affectedRows > 0;
}


export async function getAdminClientVersions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientVersions).orderBy(desc(clientVersions.createdAt)).limit(100);
}

export async function publishClientVersion(input: { version: string; minecraftVersion: string; fileKey: string; fileName: string; releaseNotes: string; requiredPlan: string; makeLatest: boolean }) {
  const db = await getDb();
  if (!db) return null;
  if (input.makeLatest) await db.update(clientVersions).set({ isLatest: false });
  const result = await db.insert(clientVersions).values({ ...input, isLatest: input.makeLatest, active: true });
  return Number(result[0].insertId);
}

export async function setClientVersionState(id: number, input: { active?: boolean; isLatest?: boolean }) {
  const db = await getDb();
  if (!db) return false;
  if (input.isLatest) await db.update(clientVersions).set({ isLatest: false });
  const result = await db.update(clientVersions).set(input).where(eq(clientVersions.id, id));
  return result[0].affectedRows > 0;
}

export async function getAdminVisuals() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visuals).orderBy(desc(visuals.updatedAt)).limit(200);
}

export async function createVisual(input: { name: string; slug: string; description: string; version: string; fileKey: string; minecraftVersion: string; featured: boolean }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(visuals).values({ ...input, active: true });
  return Number(result[0].insertId);
}

export async function setVisualState(id: number, input: { active?: boolean; featured?: boolean }) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(visuals).set(input).where(eq(visuals.id, id));
  return result[0].affectedRows > 0;
}
